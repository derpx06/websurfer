import { Executor } from '../agent/executor';
import { createLogger } from '../log';
import BrowserContext from '../browser/context';
import {
    agentModelStore,
    AgentNameEnum,
    firewallStore,
    generalSettingsStore,
    llmProviderStore,
} from '@extension/storage';
import { t } from '@extension/i18n';
import { createChatModel } from '../agent/helper';
import { ExecutionState } from '../agent/event/types';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { DEFAULT_AGENT_OPTIONS } from '../agent/types';

const logger = createLogger('background/task/manager');

export class TaskManager {
    private currentExecutor: Executor | null = null;
    private currentPort: chrome.runtime.Port | null = null;

    constructor(
        private readonly browserContext: BrowserContext,
        private readonly notifyAgentStatus: (active: boolean, status?: string, targetTabId?: number) => Promise<void>,
    ) { }

    public setPort(port: chrome.runtime.Port | null) {
        this.currentPort = port;
    }

    public getExecutor(): Executor | null {
        return this.currentExecutor;
    }

    public async handleMessage(message: any) {
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
                    if (!message.task) return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
                    if (!message.tabId) return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

                    logger.info('new_task', message.tabId, message.task);
                    this.currentExecutor = await this.setupExecutor(message.taskId, message.task);
                    this.subscribeToExecutorEvents(this.currentExecutor);

                    // Auto-Resume Checkpoint Logic
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
                        this.subscribeToExecutorEvents(this.currentExecutor);
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

                case 'screenshot': {
                    if (!message.tabId) return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
                    const page = await this.browserContext.switchTab(message.tabId);
                    const screenshot = await page.takeScreenshot();
                    logger.info('screenshot', message.tabId, screenshot);
                    return this.currentPort.postMessage({ type: 'success', screenshot });
                }

                case 'state': {
                    try {
                        const browserState = await this.browserContext.getState(true);
                        const elementsText = browserState.elementTree.clickableElementsToString(
                            DEFAULT_AGENT_OPTIONS.includeAttributes,
                        );
                        logger.info('state', browserState);
                        logger.info('interactive elements', elementsText);
                        return this.currentPort.postMessage({ type: 'success', msg: t('bg_cmd_state_printed') });
                    } catch (error) {
                        logger.error('Failed to get state:', error);
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_state_failed') });
                    }
                }

                case 'nohighlight': {
                    const page = await this.browserContext.getCurrentPage();
                    await page.removeHighlight();
                    return this.currentPort.postMessage({ type: 'success', msg: t('bg_cmd_nohighlight_ok') });
                }

                case 'replay': {
                    if (!message.tabId) return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
                    if (!message.taskId) return this.currentPort.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
                    if (!message.historySessionId)
                        return this.currentPort.postMessage({ type: 'error', error: t('bg_cmd_replay_noHistory') });

                    logger.info('replay', message.tabId, message.taskId, message.historySessionId);
                    try {
                        await this.browserContext.switchTab(message.tabId);
                        this.currentExecutor = await this.setupExecutor(message.taskId, message.task);
                        this.subscribeToExecutorEvents(this.currentExecutor);
                        const result = await this.currentExecutor.replayHistory(message.historySessionId);
                        logger.debug('replay execution result', message.tabId, result);
                    } catch (error) {
                        logger.error('Replay failed:', error);
                        return this.currentPort.postMessage({
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

    private async setupExecutor(taskId: string, task: string) {
        const providers = await llmProviderStore.getAllProviders();
        if (Object.keys(providers).length === 0) {
            throw new Error(t('bg_setup_noApiKeys'));
        }

        await agentModelStore.cleanupLegacyValidatorSettings();
        const agentModels = await agentModelStore.getAllAgentModels();

        for (const agentModel of Object.values(agentModels)) {
            if (!providers[agentModel.provider]) {
                throw new Error(t('bg_setup_noProvider', [agentModel.provider]));
            }
        }

        const navigatorModel = agentModels[AgentNameEnum.Navigator];
        if (!navigatorModel) throw new Error(t('bg_setup_noNavigatorModel'));

        const navigatorProviderConfig = providers[navigatorModel.provider];
        const navigatorLLM = createChatModel(navigatorProviderConfig, navigatorModel);

        let plannerLLM: BaseChatModel | null = null;
        const plannerModel = agentModels[AgentNameEnum.Planner];
        if (plannerModel) {
            const plannerProviderConfig = providers[plannerModel.provider];
            plannerLLM = createChatModel(plannerProviderConfig, plannerModel);
        }

        const firewall = await firewallStore.getFirewall();
        this.browserContext.updateConfig({
            allowedUrls: firewall.enabled ? firewall.allowList : [],
            deniedUrls: firewall.enabled ? firewall.denyList : [],
        });

        const generalSettings = await generalSettingsStore.getSettings();
        this.browserContext.updateConfig({
            minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
            displayHighlights: generalSettings.displayHighlights,
        });

        return new Executor(task, taskId, this.browserContext, navigatorLLM, {
            plannerLLM: plannerLLM ?? navigatorLLM,
            agentOptions: {
                maxSteps: generalSettings.maxSteps,
                maxFailures: generalSettings.maxFailures,
                maxActionsPerStep: generalSettings.maxActionsPerStep,
                useVision: generalSettings.useVision,
                useVisionForPlanner: true,
                planningInterval: generalSettings.planningInterval,
            },
            generalSettings: generalSettings,
        });
    }

    private subscribeToExecutorEvents(executor: Executor) {
        executor.clearExecutionEvents();
        executor.subscribeExecutionEvents(async event => {
            try {
                if (this.currentPort) {
                    this.currentPort.postMessage(event);
                }
            } catch (error) {
                logger.error('Failed to send message to side panel:', error);
            }

            // @ts-expect-error - context is private
            const tabId = executor.context?.browserContext?._currentTabId ?? undefined;

            if (
                event.state === ExecutionState.TASK_START ||
                event.state === ExecutionState.STEP_START ||
                event.state === ExecutionState.ACT_START
            ) {
                let statusText: string | undefined;
                if (event.state === ExecutionState.ACT_START) {
                    const toolName = event.data.details;
                    if (toolName === 'click_browser_pixel') statusText = 'Clicking element';
                    else if (toolName === 'type_text_browser_pixel' || toolName === 'input_text_browser_pixel')
                        statusText = 'Typing text';
                    else if (toolName === 'scroll_browser_pixel') statusText = 'Scrolling page';
                    else if (toolName === 'wait_browser_pixel') statusText = 'Waiting for page';
                    else if (toolName === 'navigate_browser_pixel') statusText = 'Navigating';
                    else statusText = toolName;
                } else if (event.state === ExecutionState.STEP_START) {
                    statusText = 'Planning next move...';
                } else if (event.state === ExecutionState.TASK_START) {
                    statusText = 'Starting task...';
                }
                await this.notifyAgentStatus(true, statusText, tabId);
            }

            if (
                event.state === ExecutionState.TASK_OK ||
                event.state === ExecutionState.TASK_FAIL ||
                event.state === ExecutionState.TASK_CANCEL
            ) {
                await this.notifyAgentStatus(false, undefined, tabId);
                await this.currentExecutor?.cleanup();
            }
        });
    }

    public async cleanup() {
        await this.currentExecutor?.cancel();
        this.currentExecutor = null;
    }
}
