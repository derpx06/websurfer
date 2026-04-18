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
import type { NavigatorAgent, NavigatorResult } from '../agents/navigator';
import { URLNotAllowedError } from '../../browser/views';
import type { AgentContext, AgentOutput } from '../types';
import type { ExecutionStrategy } from './types';

const logger = createLogger('NavigationStrategy');

export class NavigationStrategy implements ExecutionStrategy<NavigatorResult> {
    constructor(private readonly navigator: NavigatorAgent) { }

    async execute(context: AgentContext): Promise<AgentOutput<NavigatorResult> | undefined> {
        try {
            if (context.paused || context.stopped) {
                return undefined;
            }

            const navOutput = await this.navigator.execute();

            if (context.paused || context.stopped) {
                return undefined;
            }

            context.nSteps++;
            if (navOutput.error) {
                throw new Error(navOutput.error);
            }

            context.consecutiveFailures = 0;
            return navOutput;
        } catch (error) {
            logger.error(`Failed to execute step: ${error}`);
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
            return undefined;
        }
    }
}
