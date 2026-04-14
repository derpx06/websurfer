import type { AgentContext } from './types';
import { createLogger } from '@src/background/log';
import { chatHistoryStore } from '@extension/storage/lib/chat';
import type { GeneralSettingsConfig } from '@extension/storage';

const logger = createLogger('CheckpointManager');

/**
 * Manages the persistence and restoration of the agentic execution state.
 * This service ensures that tasks can be resumed after interruptions by periodically
 * saving the sub-task stack, intermediate results, and the agent's scratchpad.
 */
export class CheckpointManager {
    /**
     * @param context The shared agent execution context.
     * @param generalSettings Optional configuration for determining if history-saving is enabled.
     */
    constructor(private readonly context: AgentContext, private readonly generalSettings?: GeneralSettingsConfig) { }

    /**
     * Restores critical context state from a serialized JSON checkpoint string.
     * This method hydrates the task stack, completed sub-tasks, and result accumulator.
     *
     * @param historyStr Serialized JSON string containing historical state.
     */
    public restoreContext(historyStr: string): void {
        try {
            const parsed = JSON.parse(historyStr);
            if (parsed.context) {
                this.context.taskStack = parsed.context.taskStack || [];
                this.context.completedSubTasks = parsed.context.completedSubTasks || [];
                this.context.results = parsed.context.results || {};
                this.context.scratchpad = parsed.context.scratchpad || '(empty)';

                // Inform the agent that it resumed to prevent disorientation
                this.context.messageManager.addNewTask(
                    `[SYSTEM RESUME]: Task was restarted due to interruption. Your scratchpad, results, and sub-task stack have been restored. Resume from where you left off.`,
                );
                logger.info(`Successfully restored checkpointed context.`);
            }
        } catch (e) {
            logger.error(`Failed to parse checkpoint: ${e}`);
        }
    }

    /**
     * Secures a checkpoint of the current task state to native storage.
     * Checkpoints are triggered every 10 steps if historical replaying is enabled in settings.
     *
     * @param step The current execution step count.
     * @param initialTask The original user request string.
     */
    public async saveCheckpoint(step: number, initialTask: string): Promise<void> {
        if (step > 0 && step % 10 === 0 && this.generalSettings?.replayHistoricalTasks) {
            try {
                const historyString = JSON.stringify({
                    history: this.context.history,
                    context: {
                        taskStack: this.context.taskStack,
                        completedSubTasks: this.context.completedSubTasks,
                        results: this.context.results,
                        scratchpad: this.context.scratchpad,
                        step: this.context.nSteps,
                    },
                });
                await chatHistoryStore.storeAgentStepHistory(this.context.taskId, initialTask, historyString);
                logger.info(`Checkpoint saved securely at step ${step}.`);
            } catch (e) {
                logger.error(`Failed to save checkpoint: ${e}`);
            }
        }
    }
}
