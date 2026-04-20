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
     * Analyzes recent URL-action pairs to detect repetitive loops.
     *
     * @param context The current agent execution context.
     * @returns True if a loop is detected, false otherwise.
     */
    public static detect(context: AgentContext): boolean {
        const recentHistory = context.history.history.slice(-4);
        if (recentHistory.length < 4) return false;

        const signatures = recentHistory.map(item => {
            const url = item?.state?.url || 'unknown';
            const action = this.extractPrimaryActionSignature(item?.modelOutput);
            return `${url}|${action}`;
        });

        const uniqueSignatures = new Set(signatures);
        if (uniqueSignatures.size <= 1) {
            logger.warning('Loop detected: zero action/url diversity in recent steps.');
            return true;
        }

        const firstHalf = signatures.slice(0, 2).join('||');
        const secondHalf = signatures.slice(2, 4).join('||');
        if (firstHalf === secondHalf) {
            logger.warning('Loop detected: repeated 2-step pattern.');
            return true;
        }

        return false;
    }

    private static extractPrimaryActionSignature(modelOutput: string | null | undefined): string {
        if (!modelOutput) return 'unknown';

        try {
            const parsed = JSON.parse(modelOutput) as {
                action?: Array<Record<string, unknown>>;
            };
            const firstAction = parsed.action?.[0];
            if (!firstAction) return 'unknown';

            const actionName = Object.keys(firstAction)[0];
            if (!actionName) return 'unknown';

            const payload = firstAction[actionName];
            const payloadSignature = this.buildPayloadSignature(payload);
            return `${actionName}:${payloadSignature}`;
        } catch {
            return 'unknown';
        }
    }

    private static buildPayloadSignature(payload: unknown): string {
        if (!payload || typeof payload !== 'object') {
            return '';
        }

        const data = payload as Record<string, unknown>;
        if (typeof data.index === 'number' || typeof data.index === 'string') {
            return String(data.index);
        }

        if (typeof data.text === 'string') {
            return data.text.slice(0, 60).toLowerCase();
        }

        if (typeof data.url === 'string') {
            return data.url;
        }

        if (typeof data.query === 'string') {
            return data.query.slice(0, 80).toLowerCase();
        }

        return JSON.stringify(data).slice(0, 120);
    }
}
