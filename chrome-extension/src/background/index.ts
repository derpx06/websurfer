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
 * Primary entry point for the WebSurfer Background Service Worker (MV3).
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
