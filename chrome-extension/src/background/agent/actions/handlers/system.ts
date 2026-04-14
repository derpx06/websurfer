import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { createLogger } from '@src/background/log';
import { ExecutionState, Actors } from '../../event/types';
import {
    doneActionSchema,
    waitActionSchema,
    askHumanActionSchema,
    cacheContentActionSchema,
    appendResultActionSchema
} from '../schemas';
import { z } from 'zod';
import { wrapUntrustedContent } from '../../messages/utils';

const logger = createLogger('Action:System');

/**
 * Marks the common goal or sub-task as completed.
 */
export async function handleDone(
    context: AgentContext,
    input: z.infer<typeof doneActionSchema.schema>
): Promise<ActionResult> {
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, doneActionSchema.name);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, input.text);

    // Phase 4 Cross-Integration: If we are in a sub-task, mark it as done
    const pendingTasks = context.taskStack.filter(t => t.status !== 'done');
    if (pendingTasks.length > 0) {
        const activeTask = pendingTasks[pendingTasks.length - 1];
        activeTask.status = 'done';
        activeTask.result = input.text;
        context.completedSubTasks.push(activeTask);
        logger.info(`Sub-task marked as DONE: ${activeTask.goal}`);
    }

    return new ActionResult({
        isDone: true,
        extractedContent: input.text,
    });
}

/**
 * Pauses execution to wait for a human user's input.
 */
export async function handleAskHuman(
    context: AgentContext,
    input: z.infer<typeof askHumanActionSchema.schema>
): Promise<ActionResult> {
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_ASK_HUMAN, input.question);
    context.paused = true;

    const rawMsg = `Asked human user: "${input.question}". Pausing execution.`;
    const msg = wrapUntrustedContent(rawMsg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Suspends execution for a specified duration.
 */
export async function handleWait(
    context: AgentContext,
    input: z.infer<typeof waitActionSchema.schema>
): Promise<ActionResult> {
    const seconds = input.seconds || 3;
    const intent = input.intent || t('act_wait_start', [seconds.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const ms = seconds * 1000;
    const interval = 100;
    let elapsed = 0;

    while (elapsed < ms) {
        if (context.stopped) {
            const msg = t('act_wait_ok', ['0 (cancelled)']);
            return new ActionResult({ extractedContent: msg, includeInMemory: true });
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(interval, ms - elapsed)));
        elapsed += interval;
    }

    const msg = t('act_wait_ok', [seconds.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Updates the agent's internal scratchpad for persistent memory across steps.
 */
export async function handleCacheContent(
    context: AgentContext,
    input: z.infer<typeof cacheContentActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_cache_start', [input.content]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    context.scratchpad = input.content;

    const rawMsg = t('act_cache_ok', [input.content]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, rawMsg);

    const msg = wrapUntrustedContent(rawMsg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Appends a result value to a specific outcome key.
 */
export async function handleAppendResult(
    context: AgentContext,
    input: z.infer<typeof appendResultActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || `Appending result to ${input.key}`;
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    if (!context.results[input.key]) {
        context.results[input.key] = [];
    }

    if (Array.isArray(context.results[input.key])) {
        context.results[input.key].push(input.value);
    } else {
        context.results[input.key] = [context.results[input.key], input.value];
    }

    const rawMsg = `Successfully appended result to key: ${input.key}`;
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, rawMsg);
    const msg = wrapUntrustedContent(rawMsg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}
