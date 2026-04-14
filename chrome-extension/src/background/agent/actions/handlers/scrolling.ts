import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { createLogger } from '@src/background/log';
import { ExecutionState, Actors } from '../../event/types';
import {
    scrollToPercentActionSchema,
    scrollToTopActionSchema,
    scrollToBottomActionSchema,
    previousPageActionSchema,
    nextPageActionSchema,
    scrollToTextActionSchema
} from '../schemas';
import { z } from 'zod';

const logger = createLogger('Action:Scrolling');

/**
 * Logic for scrolling to a specific percentage of the page or element.
 */
export async function handleScrollToPercent(
    context: AgentContext,
    input: z.infer<typeof scrollToPercentActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_scrollToPercent_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    const page = await context.browserContext.getCurrentPage();

    if (input.index) {
        const state = await page.getCachedState();
        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
            const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
            return new ActionResult({ error: errorMsg, includeInMemory: true });
        }
        logger.info(`Scrolling to percent: ${input.yPercent} with elementNode: ${elementNode.xpath}`);
        await page.scrollToPercent(input.yPercent, elementNode);
    } else {
        await page.scrollToPercent(input.yPercent);
    }
    const msg = t('act_scrollToPercent_ok', [input.yPercent.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Scrolls to the top of the page or specified element.
 */
export async function handleScrollToTop(
    context: AgentContext,
    input: z.infer<typeof scrollToTopActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_scrollToTop_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    const page = await context.browserContext.getCurrentPage();
    if (input.index) {
        const state = await page.getCachedState();
        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
            const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
            return new ActionResult({ error: errorMsg, includeInMemory: true });
        }
        await page.scrollToPercent(0, elementNode);
    } else {
        await page.scrollToPercent(0);
    }
    const msg = t('act_scrollToTop_ok');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Scrolls to the bottom of the page or specified element.
 */
export async function handleScrollToBottom(
    context: AgentContext,
    input: z.infer<typeof scrollToBottomActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_scrollToBottom_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    const page = await context.browserContext.getCurrentPage();
    if (input.index) {
        const state = await page.getCachedState();
        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
            const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
            return new ActionResult({ error: errorMsg, includeInMemory: true });
        }
        await page.scrollToPercent(100, elementNode);
    } else {
        await page.scrollToPercent(100);
    }
    const msg = t('act_scrollToBottom_ok');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Scrolls up by one page height.
 */
export async function handlePreviousPage(
    context: AgentContext,
    input: z.infer<typeof previousPageActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_previousPage_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    const page = await context.browserContext.getCurrentPage();

    if (input.index) {
        const state = await page.getCachedState();
        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
            const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
            return new ActionResult({ error: errorMsg, includeInMemory: true });
        }

        try {
            const [elementScrollTop] = await page.getElementScrollInfo(elementNode);
            if (elementScrollTop === 0) {
                const msg = t('act_errors_alreadyAtTop', [input.index.toString()]);
                context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
                return new ActionResult({ extractedContent: msg, includeInMemory: true });
            }
        } catch (error) {
            logger.warning(`Could not get element scroll info: ${error}`);
        }
        await page.scrollToPreviousPage(elementNode);
    } else {
        const [initialScrollY] = await page.getScrollInfo();
        if (initialScrollY === 0) {
            const msg = t('act_errors_pageAlreadyAtTop');
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
            return new ActionResult({ extractedContent: msg, includeInMemory: true });
        }
        await page.scrollToPreviousPage();
    }
    const msg = t('act_previousPage_ok');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Scrolls down by one page height.
 */
export async function handleNextPage(
    context: AgentContext,
    input: z.infer<typeof nextPageActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_nextPage_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    const page = await context.browserContext.getCurrentPage();

    if (input.index) {
        const state = await page.getCachedState();
        const elementNode = state?.selectorMap.get(input.index);
        if (!elementNode) {
            const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
            return new ActionResult({ error: errorMsg, includeInMemory: true });
        }

        try {
            const [elementScrollTop, elementClientHeight, elementScrollHeight] =
                await page.getElementScrollInfo(elementNode);
            if (elementScrollTop + elementClientHeight >= elementScrollHeight) {
                const msg = t('act_errors_alreadyAtBottom', [input.index.toString()]);
                context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
                return new ActionResult({ extractedContent: msg, includeInMemory: true });
            }
        } catch (error) {
            logger.warning(`Could not get element scroll info: ${error}`);
        }
        await page.scrollToNextPage(elementNode);
    } else {
        const [initialScrollY, initialVisualViewportHeight, initialScrollHeight] = await page.getScrollInfo();
        if (initialScrollY + initialVisualViewportHeight >= initialScrollHeight) {
            const msg = t('act_errors_pageAlreadyAtBottom');
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
            return new ActionResult({ extractedContent: msg, includeInMemory: true });
        }
        await page.scrollToNextPage();
    }
    const msg = t('act_nextPage_ok');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Scrolls until the specified text is visible.
 */
export async function handleScrollToText(
    context: AgentContext,
    input: z.infer<typeof scrollToTextActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_scrollToText_start', [input.text, input.nth.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    try {
        const scrolled = await page.scrollToText(input.text, input.nth);
        const msg = scrolled
            ? t('act_scrollToText_ok', [input.text, input.nth.toString()])
            : t('act_scrollToText_notFound', [input.text, input.nth.toString()]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
    } catch (error) {
        const msg = t('act_scrollToText_failed', [error instanceof Error ? error.message : String(error)]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, msg);
        return new ActionResult({ error: msg, includeInMemory: true });
    }
}
