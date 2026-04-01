import { createLogger } from '@src/background/log';
import { t } from '@extension/i18n';
import {
    ChatModelAuthError,
    ChatModelBadRequestError,
    ChatModelForbiddenError,
    ChatModelPaymentRequiredError,
    ChatModelRateLimitError,
    ExtensionConflictError,
    MaxFailuresReachedError,
    RequestCancelledError,
} from '../agents/errors';
import { PlannerAgent, type PlannerOutput } from '../agents/planner';
import { URLNotAllowedError } from '../../browser/views';
import type { AgentContext, AgentOutput } from '../types';
import type { ExecutionStrategy } from './types';

const logger = createLogger('PlanningStrategy');

export class PlanningStrategy implements ExecutionStrategy<PlannerOutput> {
    constructor(private readonly planner: PlannerAgent) { }

    async execute(context: AgentContext): Promise<AgentOutput<PlannerOutput> | null> {
        try {
            // Add current browser state to memory if needed
            // (This logic will be coordinated by the Executor to avoid redundant DOM captures)

            // Execute planner
            const planOutput = await this.planner.execute();
            if (planOutput.result) {
                // Find the correct position in message history
                const positionForPlan = context.messageManager.length() - 1;
                context.messageManager.addPlan(JSON.stringify(planOutput.result), positionForPlan);

                // Handle completion logic
                if (planOutput.result.done) {
                    logger.info('✅ Planner confirms task completion');
                    if (planOutput.result.final_answer) {
                        context.finalAnswer = planOutput.result.final_answer;
                    }
                }
            }
            return planOutput;
        } catch (error) {
            logger.error(`Failed to execute planner: ${error}`);
            if (
                error instanceof ChatModelAuthError ||
                error instanceof ChatModelBadRequestError ||
                error instanceof ChatModelForbiddenError ||
                error instanceof ChatModelRateLimitError ||
                error instanceof URLNotAllowedError ||
                error instanceof RequestCancelledError ||
                error instanceof ExtensionConflictError ||
                error instanceof ChatModelPaymentRequiredError
            ) {
                throw error;
            }
            context.consecutiveFailures++;
            if (context.consecutiveFailures >= context.options.maxFailures) {
                throw new MaxFailuresReachedError(t('exec_errors_maxFailuresReached'));
            }
            return null;
        }
    }
}
