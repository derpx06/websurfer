import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { createLogger } from '@src/background/log';
import { ExecutionState, Actors } from '../../event/types';
import {
    sendKeysActionSchema,
    getDropdownOptionsActionSchema,
    selectDropdownOptionActionSchema
} from '../schemas';
import { z } from 'zod';

const logger = createLogger('Action:Form');

/**
 * Sends a sequence of keys (including special keys like Enter, Tab) to the current page.
 */
export async function handleSendKeys(
    context: AgentContext,
    input: z.infer<typeof sendKeysActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_sendKeys_start', [input.keys]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    await page.sendKeys(input.keys);
    const msg = t('act_sendKeys_ok', [input.keys]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Retrieves all available options from a native HTML select dropdown.
 */
export async function handleGetDropdownOptions(
    context: AgentContext,
    input: z.infer<typeof getDropdownOptionsActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_getDropdownOptions_start', [input.index.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    const state = await page.getState();

    const elementNode = state?.selectorMap.get(input.index);
    if (!elementNode) {
        const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({ error: errorMsg, includeInMemory: true });
    }

    try {
        const options = await page.getDropdownOptions(input.index);

        if (options && options.length > 0) {
            const formattedOptions: string[] = options.map(opt => {
                const encodedText = JSON.stringify(opt.text);
                return `${opt.index}: text=${encodedText}`;
            });

            let msg = formattedOptions.join('\n') + '\n' + t('act_getDropdownOptions_useExactText');
            context.emitEvent(
                Actors.NAVIGATOR,
                ExecutionState.ACT_OK,
                t('act_getDropdownOptions_ok', [options.length.toString()]),
            );
            return new ActionResult({ extractedContent: msg, includeInMemory: true });
        }

        const msg = t('act_getDropdownOptions_noOptions');
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: msg, includeInMemory: true });
    } catch (error) {
        const errorMsg = t('act_getDropdownOptions_failed', [error instanceof Error ? error.message : String(error)]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({ error: errorMsg, includeInMemory: true });
    }
}

/**
 * Selects an option from a dropdown based on its visible text.
 */
export async function handleSelectDropdownOption(
    context: AgentContext,
    input: z.infer<typeof selectDropdownOptionActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_selectDropdownOption_start', [input.text, input.index.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    const state = await page.getState();

    const elementNode = state?.selectorMap.get(input.index);
    if (!elementNode) {
        const errorMsg = t('act_errors_elementNotExist', [input.index.toString()]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({ error: errorMsg, includeInMemory: true });
    }

    if (!elementNode.tagName || elementNode.tagName.toLowerCase() !== 'select') {
        const errorMsg = t('act_selectDropdownOption_notSelect', [
            input.index.toString(),
            elementNode.tagName || 'unknown',
        ]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({ error: errorMsg, includeInMemory: true });
    }

    try {
        const result = await page.selectDropdownOption(input.index, input.text);
        const msg = t('act_selectDropdownOption_ok', [input.text, input.index.toString()]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
        return new ActionResult({ extractedContent: result, includeInMemory: true });
    } catch (error) {
        const errorMsg = t('act_selectDropdownOption_failed', [error instanceof Error ? error.message : String(error)]);
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({ error: errorMsg, includeInMemory: true });
    }
}
