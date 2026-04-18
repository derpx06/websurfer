import type { Executor } from '../agent/executor';
import { createLogger } from '../log';
import type BrowserContext from '../browser/context';
import { t } from '@extension/i18n';
import { DEFAULT_AGENT_OPTIONS } from '../agent/types';
import { ExecutorFactory } from './factory';
import { StatusNotifier } from './notifier';

const logger = createLogger('background/task/manager');

interface TaskManagerMessage {
    type: string;
    task?: string;
    taskId?: string;
    tabId?: number;
    input?: string;
    historySessionId?: string;
}

/**
 * TaskManager acts as the primary orchestrator for the lifecycle of background tasks.
 * It manages the communication port with the Side Panel, handles incoming UI commands,
 * and maintains the lifecycle of the Agent Executor.
 */
export class TaskManager {
    private currentExecutor: Executor | null = null;
    private currentPort: chrome.runtime.Port | null = null;
    private readonly statusNotifier: StatusNotifier;

    constructor(
        private readonly browserContext: BrowserContext,
        notifyAgentStatus: (active: boolean, status?: string, targetTabId?: number) => Promise<void>,
    ) {
        this.statusNotifier = new StatusNotifier(notifyAgentStatus);
    }

    public setPort(port: chrome.runtime.Port | null) {
        this.currentPort = port;
    }

    public getExecutor(): Executor | null {
        return this.currentExecutor;
    }

    /**
     * Entry point for messages arriving from the Side Panel via the Chrome runtime port.
     * Routes messages to specialized executor commands or browser context actions.
     * 
     * @param message The deserialized message object from the port.
     */
    public async handleMessage(message: TaskManagerMessage) {
        // Port check: All background-to-UI communication relies on a healthy, active port.
        if (!this.currentPort) {
            logger.warning('Received message but no port is connected');
            return;
        }

        try {
            switch (message.type) {
                case 'heartbeat':
                    this.currentPort.postMessage({ type: 'heartbeat_ack' });
                    break;

                case 'new_task': {
                    if (!message.task) return this.currentPort!.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
                    if (!message.taskId) return this.currentPort!.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
                    if (!message.tabId) return this.currentPort!.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

                    logger.info('new_task', message.tabId, message.task);

                    // Create a fresh executor for the new task session using the factory pattern
                    this.currentExecutor = await ExecutorFactory.create(message.taskId, message.task, this.browserContext);

                    // Wire up the executor to the UI via the status notifier
                    this.statusNotifier.subscribe(this.currentExecutor, this.currentPort!);

                    // Auto-Resume: Check for existing step history in local storage to support crash recovery
                    try {
                        const { chatHistoryStore } = await import('@extension/storage/lib/chat');
                        const checkpoint = await chatHistoryStore.loadAgentStepHistory(message.taskId);
                        if (checkpoint && checkpoint.history) {
                            logger.info(`Found existing checkpoint for ${message.taskId}, attempting to restore context.`);
                            this.currentExecutor.restoreContext(checkpoint.history);
                        }
                    } catch (e) {
                        logger.error('Failed to restore checkpoint from storage', e);
                    }

                    // Start the asynchronous execution loop
                    const result = await this.currentExecutor.execute();
                    logger.info('new_task execution result', message.tabId, result);
                    break;
                }

                case 'follow_up_task': {
                    if (!message.task)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
                    if (!message.tabId) return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

                    logger.info('follow_up_task', message.tabId, message.task);

                    if (this.currentExecutor) {
                        this.currentExecutor.addFollowUpTask(message.task);
                        this.statusNotifier.subscribe(this.currentExecutor, this.currentPort);
                        const result = await this.currentExecutor.execute();
                        logger.info('follow_up_task execution result', message.tabId, result);
                    } else {
                        logger.info('follow_up_task: executor was cleaned up');
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
                    }
                    break;
                }

                case 'cancel_task': {
                    if (!this.currentExecutor)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
                    await this.currentExecutor.cancel();
                    break;
                }

                case 'resume_task': {
                    if (!this.currentExecutor)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
                    await this.currentExecutor.resume();
                    return this.currentPort.postMessage({ type: 'success' });
                }

                case 'pause_task': {
                    if (!this.currentExecutor)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
                    await this.currentExecutor.pause();
                    return this.currentPort.postMessage({ type: 'success' });
                }

                case 'resume_task_with_input': {
                    if (!this.currentExecutor)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
                    if (!message.input)
                        return this.currentPort.postMessage({ type: 'error', error: 'No input provided' });

                    logger.info('resume_task_with_input', message.input);
                    await this.currentExecutor.resumeWithInput(message.input);
                    return this.currentPort.postMessage({ type: 'success' });
                }

                case 'screenshot': {
                    if (!message.tabId) return this.currentPort!.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

                    // Switch to the target tab before capturing
                    const page = await this.browserContext.switchTab(message.tabId);
                    const screenshot = await page.takeScreenshot();
                    logger.info('screenshot', message.tabId, screenshot);

                    return this.currentPort!.postMessage({ type: 'success', screenshot });
                }

                case 'state': {
                    // Extract the full interactive state of the browser, intended for debugging or LLM feeding.
                    try {
                        const browserState = await this.browserContext.getState(true);
                        const elementsText = browserState.elementTree.clickableElementsToString(
                            DEFAULT_AGENT_OPTIONS.includeAttributes,
                        );
                        logger.info('state', browserState);
                        logger.info('interactive elements', elementsText);
                        return this.currentPort!.postMessage({ type: 'success', msg: t('bg_cmd_state_printed') });
                    } catch (error) {
                        logger.error('Failed to get state:', error);
                        return this.currentPort!.postMessage({ type: 'error', error: t('bg_cmd_state_failed') });
                    }
                }

                case 'nohighlight': {
                    // Instruct the active page to remove any visual bounding boxes or markers.
                    const page = await this.browserContext.getCurrentPage();
                    await page.removeHighlight();
                    return this.currentPort!.postMessage({ type: 'success', msg: t('bg_cmd_nohighlight_ok') });
                }

                case 'get_tab_content': {
                    if (!message.tabId) return this.currentPort!.postMessage({ type: 'error', error: 'Missing tabId' });
                    try {
                        const content = await this.browserContext.getTabContent(message.tabId);
                        return this.currentPort!.postMessage({ type: 'get_tab_content_result', tabId: message.tabId, ...content });
                    } catch (error) {
                        return this.currentPort!.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Failed to get tab content' });
                    }
                }

                case 'replay': {
                    // Triggers a historic replay of actions from a saved session.
                    if (!message.tabId) return this.currentPort!.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
                    if (!message.taskId) return this.currentPort!.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
                    if (!message.task) return this.currentPort!.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
                    if (!message.historySessionId)
                        return this.currentPort!.postMessage({ type: 'error', error: t('bg_cmd_replay_noHistory') });

                    logger.info('replay', message.tabId, message.taskId, message.historySessionId);
                    try {
                        await this.browserContext.switchTab(message.tabId);
                        this.currentExecutor = await ExecutorFactory.create(message.taskId, message.task, this.browserContext);

                        // Bridge events from the replaying executor to the UI.
                        this.statusNotifier.subscribe(this.currentExecutor, this.currentPort!);

                        const result = await this.currentExecutor.replayHistory(message.historySessionId);
                        logger.debug('replay execution result', message.tabId, result);
                    } catch (error) {
                        logger.error('Replay failed:', error);
                        return this.currentPort!.postMessage({
                            type: 'error',
                            error: error instanceof Error ? error.message : t('bg_cmd_replay_failed'),
                        });
                    }
                    break;
                }

                default:
                    return this.currentPort.postMessage({ type: 'error', error: t('errors_cmd_unknown', [message.type]) });
            }
        } catch (error) {
            logger.error('Error handling port message:', error);
            this.currentPort.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : t('errors_unknown'),
            });
        }
    }

    /**
     * Terminate the currently active task and release related executor resources.
     */
    public async cleanup() {
        await this.currentExecutor?.cancel();
        this.currentExecutor = null;
    }
}
