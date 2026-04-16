import { Action } from './base';
import { type AgentContext } from '../types';
import * as interactionHandlers from './handlers/interaction';
import * as navigationHandlers from './handlers/navigation';
import * as systemHandlers from './handlers/system';
import * as scrollingHandlers from './handlers/scrolling';
import * as formHandlers from './handlers/form';
import * as schemas from './schemas';

/**
 * ActionRegistry is responsible for assembling and providing the full suite of
 * browser interaction actions available to the agent.
 */
export class ActionRegistry {
    /**
     * Builds the default set of actions, binding them to the provided agent context.
     * 
     * @param context The live agent context to bind to the actions.
     * @returns An array of fully configured Action instances.
     */
    static buildDefaultActions(context: AgentContext): Action[] {
        return [
            // System Actions
            new Action(input => systemHandlers.handleDone(context, input), schemas.doneActionSchema),
            new Action(input => systemHandlers.handleAskHuman(context, input), schemas.askHumanActionSchema),
            new Action(input => systemHandlers.handleWait(context, input), schemas.waitActionSchema),
            new Action(input => systemHandlers.handleCacheContent(context, input), schemas.cacheContentActionSchema),
            new Action(input => systemHandlers.handleAppendResult(context, input), schemas.appendResultActionSchema),

            // Navigation Actions
            new Action(input => navigationHandlers.handleGoToUrl(context, input), schemas.goToUrlActionSchema),
            new Action(input => navigationHandlers.handleSearchGoogle(context, input), schemas.searchGoogleActionSchema),
            new Action(input => navigationHandlers.handleSearchDuckDuckGo(context, input), schemas.searchDuckDuckGoActionSchema),
            new Action(input => navigationHandlers.handleGoBack(context, input), schemas.goBackActionSchema),
            new Action(input => navigationHandlers.handleOpenTab(context, input), schemas.openTabActionSchema),
            new Action(input => navigationHandlers.handleSwitchTab(context, input), schemas.switchTabActionSchema),
            new Action(input => navigationHandlers.handleCloseTab(context, input), schemas.closeTabActionSchema),

            // Interaction Actions
            new Action(input => interactionHandlers.handleClickElement(context, input), schemas.clickElementActionSchema, true),
            new Action(input => interactionHandlers.handleInputText(context, input), schemas.inputTextActionSchema, true),

            // Scrolling Actions
            new Action(input => scrollingHandlers.handleScrollToPercent(context, input), schemas.scrollToPercentActionSchema),
            new Action(input => scrollingHandlers.handleScrollToTop(context, input), schemas.scrollToTopActionSchema),
            new Action(input => scrollingHandlers.handleScrollToBottom(context, input), schemas.scrollToBottomActionSchema),
            new Action(input => scrollingHandlers.handlePreviousPage(context, input), schemas.previousPageActionSchema),
            new Action(input => scrollingHandlers.handleNextPage(context, input), schemas.nextPageActionSchema),
            new Action(input => scrollingHandlers.handleScrollToText(context, input), schemas.scrollToTextActionSchema),

            // Form & Keyboard Actions
            new Action(input => formHandlers.handleSendKeys(context, input), schemas.sendKeysActionSchema),
            new Action(input => formHandlers.handleGetDropdownOptions(context, input), schemas.getDropdownOptionsActionSchema, true),
            new Action(input => formHandlers.handleSelectDropdownOption(context, input), schemas.selectDropdownOptionActionSchema, true),
        ];
    }
}
