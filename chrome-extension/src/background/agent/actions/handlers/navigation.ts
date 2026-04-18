import { ActionResult, type AgentContext } from '../../types';
import { t } from '@extension/i18n';
import { ExecutionState, Actors } from '../../event/types';
import type {
    goToUrlActionSchema,
    goBackActionSchema,
    searchGoogleActionSchema,
    searchDuckDuckGoActionSchema,
    openTabActionSchema,
    closeTabActionSchema,
    switchTabActionSchema
} from '../schemas';
import type { z } from 'zod';
import { normalizeNavigationUrl } from '../base';
import { DuckDuckGoService, type SearchResult } from '../../../services/DuckDuckGoService';

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

    await context.browserContext.navigateTo(`https://www.google.com/search?q=${encodeURIComponent(input.query)}`);

    const msg2 = t('act_searchGoogle_ok', [input.query]);
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, msg2);
    return new ActionResult({
        extractedContent: msg2,
        includeInMemory: true,
    });
}

/**
 * Performs a search on DuckDuckGo and returns results directly to the agent.
 */
export async function handleSearchDuckDuckGo(
    context: AgentContext,
    input: z.infer<typeof searchDuckDuckGoActionSchema.schema>
): Promise<ActionResult> {
    const intent = input.intent || t('act_searchDuckDuckGo_start', [input.query]) || `Searching DuckDuckGo for: ${input.query}`;
    context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, intent);

    try {
        const results = await DuckDuckGoService.search(input.query);

        if (results.length === 0) {
            const noResultsMsg = `No results found for: ${input.query}`;
            context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, noResultsMsg);
            return new ActionResult({
                extractedContent: noResultsMsg,
                includeInMemory: true,
            });
        }

        const formattedResults = results
            .map((r: SearchResult, i: number) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.description}`)
            .join('\n\n');

        const successMsg = `Found ${results.length} results for: ${input.query}`;
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, successMsg);

        return new ActionResult({
            extractedContent: `Search Results for "${input.query}":\n\n${formattedResults}`,
            includeInMemory: true,
        });
    } catch (error) {
        const errorMsg = `Search failed: ${error instanceof Error ? error.message : String(error)}`;
        context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMsg);
        return new ActionResult({
            extractedContent: errorMsg,
            includeInMemory: true,
        });
    }
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
