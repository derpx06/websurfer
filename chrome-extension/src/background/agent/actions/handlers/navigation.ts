import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { ExecutionState, Actors } from '../../event/types';
import {
    goToUrlActionSchema,
    goBackActionSchema,
    searchGoogleActionSchema,
    openTabActionSchema,
    closeTabActionSchema,
    switchTabActionSchema
} from '../schemas';
import { z } from 'zod';
import { normalizeNavigationUrl } from '../base';

/**
 * Navigates the current tab to a specified URL.
 */
export async function handleGoToUrl(
    context: AgentContext,
    input: z.infer<typeof goToUrlActionSchema.schema>
): Promise<ActionResult> {
    const targetUrl = normalizeNavigationUrl(input.url);
    const intent = input.intent || t('act_goToUrl_start', [targetUrl]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    await context.browserContext.navigateTo(targetUrl);
    const msg2 = t('act_goToUrl_ok', [targetUrl]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
    return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
    });
}

/**
 * Performs a search on Google and navigates to the results.
 */
export async function handleSearchGoogle(
    context: AgentContext,
    input: z.infer<typeof searchGoogleActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_searchGoogle_start', [input.query]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    await context.browserContext.navigateTo(`https://www.google.com/search?q=${input.query}`);

    const msg2 = t('act_searchGoogle_ok', [input.query]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
    return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
    });
}

/**
 * Goes back to the previous page in history.
 */
export async function handleGoBack(
    context: AgentContext,
    input: z.infer<typeof goBackActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_goBack_start');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    const page = await context.browserContext.getCurrentPage();
    await page.goBack();
    const msg2 = t('act_goBack_ok');
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
    return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
    });
}

/**
 * Opens a new tab with the specified URL.
 */
export async function handleOpenTab(
    context: AgentContext,
    input: z.infer<typeof openTabActionSchema.schema>
): Promise<ActionResult> {
    const targetUrl = normalizeNavigationUrl(input.url);
    const intent = input.intent || t('act_openTab_start', [targetUrl]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    await context.browserContext.openTab(targetUrl);
    const msg = t('act_openTab_ok', [targetUrl]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Switches the focused tab to the one with the specified ID.
 */
export async function handleSwitchTab(
    context: AgentContext,
    input: z.infer<typeof switchTabActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_switchTab_start', [input.tab_id.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    await context.browserContext.switchTab(input.tab_id);
    const msg = t('act_switchTab_ok', [input.tab_id.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}

/**
 * Closes the tab with the specified ID.
 */
export async function handleCloseTab(
    context: AgentContext,
    input: z.infer<typeof closeTabActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_closeTab_start', [input.tab_id.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);
    await context.browserContext.closeTab(input.tab_id);
    const msg = t('act_closeTab_ok', [input.tab_id.toString()]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg);
    return new ActionResult({ extractedContent: msg, includeInMemory: true });
}
