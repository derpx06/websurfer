import type { AgentContext } from './types';
import { createLogger } from '@src/background/log';

const logger = createLogger('LoopDetector');

/**
 * Service for identifying repetitive behavior in the agent's actions.
 * It uses a hashing window approach to detect cyclic patterns that might indicate
 * the agent is stuck or hallucinating interactions with unclickable elements.
 */
export class LoopDetector {
    /**
     * Analyzes the recent history of URL-action pairs to detect infinite loops.
     * If the agent performs fewer than 3 unique actions over the last 6 steps, 
     * a loop is triggered to force a planner re-evaluation.
     * 
     * @param context The current agent execution context.
     * @returns True if a loop is detected, false otherwise.
     */
    public static detect(context: AgentContext): boolean {
        // We only analyze the 6 most recent steps for immediate cyclic patterns
        const recentHistory = context.history.history.slice(-6);
        if (recentHistory.length < 6) return false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentActions = recentHistory.map((h: any) => {
            const url = h?.state?.url || 'unknown';
            const actionPayload = h?.modelOutput?.action?.[0];
            let actionStr = 'unknown';
            if (actionPayload) {
                const actionName = Object.keys(actionPayload)[0];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const innerPayload = (actionPayload as any)[actionName];
                // Normalize the action into a comparable string (e.g., "click_element:5")
                actionStr = `${actionName}:${innerPayload?.index ?? innerPayload?.text ?? ''}`;
            }
            return `${url}|${actionStr}`;
        });

        const uniqueActions = new Set(recentActions);
        // High density of repetitive actions (<= 2 unique actions in 6 steps)
        if (uniqueActions.size <= 2) {
            logger.warning('Loop detected: Actions are repeating! Forcing planner re-evaluation.');
            return true;
        }

        return false;
    }
}
