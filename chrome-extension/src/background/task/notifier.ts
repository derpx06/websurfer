import { Executor } from '../agent/executor';
import { createLogger } from '../log';
import { ExecutionState } from '../agent/event/types';

const logger = createLogger('background/task/notifier');

/**
 * Orchestrates the dispatch of agent execution events to the UI and system notifications.
 * It subscribes to the Executor's event stream and translates raw execution states
 * into human-readable browser status updates.
 */
export class StatusNotifier {
    /**
     * @param notifyAgentStatus Callback to update the high-level browser agent status (e.g., in the extension icon or badge).
     */
    constructor(
        private readonly notifyAgentStatus: (active: boolean, status?: string, targetTabId?: number) => Promise<void>
    ) { }

    /**
     * Subscribes the notifier to an Executor instance.
     * Events are routed both to the side panel port (for chat UI) and to the notification callback.
     * 
     * @param executor The Executor instance to monitor.
     * @param port The Chrome runtime port connected to the Side Panel.
     */
    public subscribe(executor: Executor, port: chrome.runtime.Port | null) {
        // ... implementation
        executor.clearExecutionEvents();
        executor.subscribeExecutionEvents(async event => {
            try {
                if (port) {
                    port.postMessage(event);
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
                    statusText = this.getFriendlyStatus(toolName);
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
                await executor.cleanup();
            }
        });
    }

    private getFriendlyStatus(toolName: string): string {
        if (toolName === 'click_browser_pixel') return 'Clicking element';
        if (toolName === 'type_text_browser_pixel' || toolName === 'input_text_browser_pixel')
            return 'Typing text';
        if (toolName === 'scroll_browser_pixel') return 'Scrolling page';
        if (toolName === 'wait_browser_pixel') return 'Waiting for page';
        if (toolName === 'navigate_browser_pixel') return 'Navigating';
        return toolName;
    }
}
