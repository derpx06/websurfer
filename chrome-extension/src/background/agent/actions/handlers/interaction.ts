import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { createLogger } from '@src/background/log';
import { ExecutionState, Actors } from '../../event/types';
import type {
    clickElementActionSchema,
    inputTextActionSchema,
    scrollToPercentActionSchema} from '../schemas';
import type { z } from 'zod';

const logger = createLogger('Action:Interaction');

/**
 * Logic for clicking an element on the page.
 */
export async function handleClickElement(
    context: AgentContext,
    input: z.infer<typeof clickElementActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_click_start', [input.index.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    const state = await page.getCachedState();

    const elementNode = state?.selectorMap.get(input.index);
    if (!elementNode) {
        throw new Error(t('act_errors_elementNotExist', [input.index.toString()]));
    }

    // Check if element is a file uploader
    if (await page.isFileUploader(elementNode)) {
        const msg = t('act_click_fileUploader', [input.index.toString()]);
        logger.info(msg);
        return new ActionResult({
            extractedContent: msg,
            includeInMemory: true,
        });
    }

    try {
        const initialTabIds = await context.browserContext.getAllTabIds();
        await page.clickElementNode(context.options.useVision, elementNode);
        let msg = t('act_click_ok', [input.index.toString(), elementNode.getAllTextTillNextClickableElement(2)]);
        logger.info(msg);

        const currentTabIds = await context.browserContext.getAllTabIds();
        if (currentTabIds.size > initialTabIds.size) {
            const newTabMsg = t('act_click_newTabOpened');
            msg += ` - ${newTabMsg}`;
            logger.info(newTabMsg);
            const newTabId = Array.from(currentTabIds).find(id => !initialTabIds.has(id));
            if (newTabId) {
                await context.browserContext.switchTab(newTabId);
            }
        }
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
    } catch (error) {
        const errorDetail = error instanceof Error ? error.message : String(error);
        const msg = `${t('act_errors_elementNoLongerAvailable', [input.index.toString()])} (${errorDetail})`;
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, msg);
        return new ActionResult({
            error: errorDetail,
        });
    }
}

/**
 * Logic for typing text into an input field.
 */
export async function handleInputText(
    context: AgentContext,
    input: z.infer<typeof inputTextActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_inputText_start', [input.index.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    const state = await page.getCachedState();

    const elementNode = state?.selectorMap.get(input.index);
    if (!elementNode) {
        throw new Error(t('act_errors_elementNotExist', [input.index.toString()]));
    }

    await page.inputTextElementNode(context.options.useVision, elementNode, input.text);
    const msg = t('act_inputText_ok', [input.text, input.index.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

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
