import type { ActionResult, AgentContext } from './types';
import { createLogger } from '@src/background/log';
import { chatHistoryStore } from '@extension/storage/lib/chat';
import { t } from '@extension/i18n';
import type { NavigatorAgent } from './agents/navigator';
import type { AgentStepHistory } from './history';
import { Actors, ExecutionState } from './event/types';

const logger = createLogger('ReplayManager');

/**
 * Manages the re-execution of historical agent tasks.
 * This service takes a recorded session history and attempts to re-run it step-by-step
 * on the current browser state, translating historical element references to current ones.
 */
export class ReplayManager {
    /**
     * @param context The shared agent execution context.
     * @param navigator The Navigator agent instance used to execute the historical steps.
     */
    constructor(private readonly context: AgentContext, private readonly navigator: NavigatorAgent) { }

    /**
     * Replays a saved history of actions with error handling and retry logic.
     * It iterates through the historical steps, emitting progress events to the UI.
     * 
     * @param sessionId The ID of the historical session to replay.
     * @param initialTask The original task description.
     * @param maxRetries Maximum number of retries for individual actions within a step.
     * @param skipFailures Whether to continue replaying even if a step fails.
     * @param delayBetweenActions Time in seconds to wait between replayed actions.
     * @returns A promise resolving to the results of all replayed actions.
     */
    async replayHistory(
        sessionId: string,
        initialTask: string,
        maxRetries = 3,
        skipFailures = true,
        delayBetweenActions = 2.0,
    ): Promise<ActionResult[]> {
        const results: ActionResult[] = [];
        logger.info('Starting replay for task:', initialTask);

        try {
            const historyFromStorage = await chatHistoryStore.loadAgentStepHistory(sessionId);
            if (!historyFromStorage) {
                throw new Error(t('exec_replay_historyNotFound'));
            }

            const history = JSON.parse(historyFromStorage.history) as AgentStepHistory;
            if (history.history.length === 0) {
                throw new Error(t('exec_replay_historyEmpty'));
            }

            logger.debug(`🔄 Replaying history: ${history.history.length} steps`);
            this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, this.context.taskId);

            for (let i = 0; i < history.history.length; i++) {
                const historyItem = history.history[i];

                if (this.context.stopped) {
                    logger.info('Replay stopped by user');
                    break;
                }

                const stepResults = await this.navigator.executeHistoryStep(
                    historyItem,
                    i,
                    history.history.length,
                    maxRetries,
                    delayBetweenActions * 1000,
                    skipFailures,
                );

                results.push(...stepResults);

                if (this.context.stopped) break;
            }

            if (this.context.stopped) {
                this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_CANCEL, t('exec_replay_cancel'));
            } else {
                this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_OK, t('exec_replay_ok'));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Replay failed: ${errorMessage}`);
            this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, t('exec_replay_fail', [errorMessage]));
        }

        return results;
    }
}
