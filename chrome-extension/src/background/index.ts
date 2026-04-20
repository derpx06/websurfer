import 'webextension-polyfill';
import {
  analyticsSettingsStore,
  llmProviderStore,
} from '@extension/storage';
import { t } from '@extension/i18n';
import BrowserContext from './browser/context';
import { createLogger } from './log';
import { SpeechToTextService } from './services/speechToText';
import { injectBuildDomTreeScripts } from './browser/dom/service';
import { analytics } from './services/analytics';
import { TaskManager } from './task/manager';

const logger = createLogger('background');

/**
 * Primary entry point for the WebGenie Background Service Worker (MV3).
 * 
 * This module initializes the core singleton services:
 * - BrowserContext: Manages CDP/Playwright attachments to tabs.
 * - TaskManager: Orchestrates agent execution and UI communication.
 * - Event Listeners: Handles Chrome runtime events (tab updates, port connections, debugging).
 */
const browserContext = new BrowserContext({});
const SIDE_PANEL_URL = chrome.runtime.getURL('side-panel/index.html');

/**
 * Notify a specific tab or the active tab about the agent's active status.
 */
async function notifyAgentStatus(active: boolean, status?: string, targetTabId?: number) {
  try {
    let tabId = targetTabId;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }

    if (tabId) {
      await chrome.tabs.sendMessage(tabId, { type: 'AGENT_STATUS', active, status }).catch(() => {
        // Ignore errors if the content script is not injected yet
      });
    }
  } catch (error) {
    logger.error('Failed to notify agent status:', error);
  }
}

const taskManager = new TaskManager(browserContext, notifyAgentStatus);

// Setup side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab && tabId && changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    await injectBuildDomTreeScripts(tabId);
    // If an agent is running ON THIS TAB, notify it
    const executor = taskManager.getExecutor();
    // @ts-expect-error - context is private
    const agentTabId = executor?.context?.browserContext?._currentTabId;
    if (agentTabId === tabId) {
      await notifyAgentStatus(true, undefined, tabId);
    }
  }
});

// Listen for tab activation to show/hide border
chrome.tabs.onActivated.addListener(async activeInfo => {
  const executor = taskManager.getExecutor();
  // @ts-expect-error - context is private
  const agentTabId = executor?.context?.browserContext?._currentTabId;
  if (agentTabId === activeInfo.tabId) {
    await notifyAgentStatus(true, undefined, activeInfo.tabId);
  } else {
    // Hide border on other tabs if they were previously active for the agent
    await notifyAgentStatus(false, undefined, activeInfo.tabId);
  }
});

// Listen for debugger detached event
chrome.debugger.onDetach.addListener(async (source, reason) => {
  console.log('Debugger detached:', source, reason);
  if (reason === 'canceled_by_user') {
    if (source.tabId) {
      await taskManager.cleanup();
      await browserContext.cleanup();
    }
  }
});

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  browserContext.removeAttachedPage(tabId);
});

logger.info('background loaded');

// Initialize analytics
analytics.init().catch(error => {
  logger.error('Failed to initialize analytics:', error);
});

// Listen for analytics settings changes
analyticsSettingsStore.subscribe(() => {
  analytics.updateSettings().catch(error => {
    logger.error('Failed to update analytics settings:', error);
  });
});

// Setup connection listener for long-lived connections (e.g., side panel)
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'side-panel-connection') {
    const senderUrl = port.sender?.url;
    const senderId = port.sender?.id;

    if (!senderUrl || senderId !== chrome.runtime.id || senderUrl !== SIDE_PANEL_URL) {
      logger.warning('Blocked unauthorized side-panel-connection', senderId, senderUrl);
      port.disconnect();
      return;
    }

    taskManager.setPort(port);

    port.onMessage.addListener(async message => {
      // Handle speech_to_text separately for now as it's a standalone service
      if (message.type === 'speech_to_text') {
        try {
          if (!message.audio) {
            return port.postMessage({
              type: 'speech_to_text_error',
              error: t('bg_cmd_stt_noAudioData'),
            });
          }

          logger.info('Processing speech-to-text request...');
          const providers = await llmProviderStore.getAllProviders();
          const speechToTextService = await SpeechToTextService.create(providers);

          let base64Audio = message.audio;
          if (base64Audio.startsWith('data:')) {
            base64Audio = base64Audio.split(',')[1];
          }

          const transcribedText = await speechToTextService.transcribeAudio(base64Audio);
          logger.info('Speech-to-text completed successfully');
          return port.postMessage({
            type: 'speech_to_text_result',
            text: transcribedText,
          });
        } catch (error) {
          logger.error('Speech-to-text failed:', error);
          return port.postMessage({
            type: 'speech_to_text_error',
            error: error instanceof Error ? error.message : t('bg_cmd_stt_failed'),
          });
        }
      }

      // Delegate all other messages to TaskManager
      await taskManager.handleMessage(message);
    });

    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
      taskManager.setPort(null);
      taskManager.cleanup();
    });
  }
});

// One-off message handler for UI-to-Background requests (like tab content)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get_tab_content') {
    browserContext.getTabContent(message.tabId)
      .then(content => sendResponse(content))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
  return false;
});

// ---------------------------------------------------------------------------
// Omnibox (“genie” keyword) integration
//
// Typing “genie” + Space in the address bar activates WebGenie.
// Whatever the user types next becomes the prompt; pressing Enter:
//   1. Saves the prompt to chrome.storage.session (persistent handoff,
//      survives side panel load time—no race conditions).
//   2. Opens the side panel.
//   3. The side panel reads & clears the pending prompt on mount and
//      immediately starts the agent.
//
// Using storage.session (not local) so the prompt is ephemeral and
// automatically cleared when the browser session ends.
// ---------------------------------------------------------------------------

const PENDING_OMNIBOX_KEY = 'pendingOmniboxPrompt';

chrome.omnibox.setDefaultSuggestion({
  // %s is replaced with the current input text by Chrome
  description: 'WebGenie — run: %s',
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (!text.trim()) return;
  suggest([
    {
      content: text,
      description: `Ask WebGenie to: ${text.trim()}`,
    },
  ]);
});

chrome.omnibox.onInputEntered.addListener((text) => {
  const prompt = text.trim();
  if (!prompt) return;

  // 1. Open the side panel IMMEDIATELY.
  // We must not `await` anything before this call, otherwise the user gesture
  // is lost and Chrome will silently refuse to open the panel.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.windowId !== undefined) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(err => {
        logger.error('Omnibox: failed to open side panel:', err);
      });
      logger.info('Omnibox: side panel open requested for window', tab.windowId);
    } else {
      logger.error('Omnibox: no active tab/window found');
    }
  });

  // 2. Persist the prompt. The side panel will pick it up on mount or via onChanged.
  chrome.storage.session.set({ [PENDING_OMNIBOX_KEY]: prompt }).then(() => {
    logger.info('Omnibox: saved pending prompt to session storage:', prompt);
  }).catch(err => {
    logger.error('Omnibox: failed to save prompt:', err);
  });
});
