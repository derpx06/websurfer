/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Actors, chatHistoryStore } from '@extension/storage';
import { t } from '@extension/i18n';

import { useTheme } from './useTheme';
import { useConfig } from './useConfig';
import { useChatSession } from './useChatSession';
import { useAgentConnection } from './useAgentConnection';
import { useAudioRecorder } from './useAudioRecorder';
import { useFavoritePrompts } from './useFavoritePrompts';

export const useSidePanelController = () => {
  // UI State that didn't fit elsewhere
  const [inputEnabled, setInputEnabled] = useState(true);
  const [showStopButton, setShowStopButton] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  // Refs for specific UI components
  const setInputTextRef = useRef<((text: string) => void) | null>(null);

  // Use specialized hooks
  const { isDarkMode } = useTheme();
  const { hasConfiguredModels, replayEnabled, loadGeneralSettings, checkModelConfiguration } = useConfig();
  const {
    favoritePrompts,
    handleBookmarkUpdateTitle,
    handleBookmarkDelete,
    handleBookmarkReorder,
    addFavoritePrompt
  } = useFavoritePrompts();

  const {
    messages,
    setMessages,
    currentSessionId,
    setCurrentSessionId,
    sessionIdRef,
    chatSessions,
    isFollowUpMode,
    setIsFollowUpMode,
    isHistoricalSession,
    setIsHistoricalSession,
    messagesEndRef,
    appendMessage,
    loadChatSessions,
    handleSessionSelect: loadSessionFromHistory,
    handleSessionDelete,
    createNewSession,
    resetSession,
  } = useChatSession();

  const {
    portRef,
    isReplayingRef,
    setupConnection,
    stopConnection,
    sendMessage
  } = useAgentConnection({
    appendMessage,
    setIsFollowUpMode,
    setInputEnabled,
    setShowStopButton,
    setIsReplaying,
    setIsHistoricalSession,
    setIsProcessingSpeech,
    setInputTextRef,
  });

  const { isRecording, handleMicClick } = useAudioRecorder({
    appendMessage,
    setupConnection,
    portRef,
    setIsProcessingSpeech,
  });

  // Keep replaying ref in sync
  useEffect(() => {
    isReplayingRef.current = isReplaying;
  }, [isReplaying, isReplayingRef]);

  const handleReplay = useCallback(
    async (historySessionId: string): Promise<void> => {
      try {
        if (!replayEnabled) {
          appendMessage({ actor: Actors.SYSTEM, content: t('chat_replay_disabled'), timestamp: Date.now() });
          return;
        }

        const historyData = await chatHistoryStore.loadAgentStepHistory(historySessionId);
        if (!historyData) {
          appendMessage({
            actor: Actors.SYSTEM,
            content: t('chat_replay_noHistory', historySessionId.substring(0, 20)),
            timestamp: Date.now(),
          });
          return;
        }

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (!tabId) throw new Error('No active tab found');

        if (isHistoricalSession) setMessages([]);

        const newTaskId = await createNewSession(`Replay of ${historySessionId.substring(0, 20)}...`);

        setInputEnabled(false);
        setShowStopButton(true);
        setIsFollowUpMode(false);
        setIsHistoricalSession(false);

        const userMessage = {
          actor: Actors.USER,
          content: `/replay ${historySessionId}`,
          timestamp: Date.now(),
        };
        appendMessage(userMessage, sessionIdRef.current);

        if (!portRef.current) setupConnection();

        sendMessage({
          type: 'replay',
          taskId: newTaskId,
          tabId,
          historySessionId,
          task: historyData.task,
        });

        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_starting', historyData.task),
          timestamp: Date.now(),
        });
        setIsReplaying(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_failed', errorMessage),
          timestamp: Date.now(),
        });
      }
    },
    [appendMessage, isHistoricalSession, replayEnabled, setupConnection, createNewSession, sessionIdRef, portRef, sendMessage, setMessages],
  );

  const handleCommand = useCallback(
    async (command: string): Promise<boolean> => {
      try {
        if (!portRef.current) setupConnection();

        if (command === '/state') {
          sendMessage({ type: 'state' });
          return true;
        }

        if (command === '/nohighlight') {
          sendMessage({ type: 'nohighlight' });
          return true;
        }

        if (command.startsWith('/replay ')) {
          const parts = command.split(' ').filter(part => part.trim() !== '');
          if (parts.length !== 2) {
            appendMessage({ actor: Actors.SYSTEM, content: t('chat_replay_invalidArgs'), timestamp: Date.now() });
            return true;
          }
          await handleReplay(parts[1]);
          return true;
        }

        appendMessage({
          actor: Actors.SYSTEM,
          content: t('errors_cmd_unknown', command),
          timestamp: Date.now(),
        });
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
        return true;
      }
    },
    [appendMessage, handleReplay, setupConnection, sendMessage],
  );

  const handleSendMessage = useCallback(
    async (text: string, displayText?: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      if (trimmedText.startsWith('/')) {
        const wasHandled = await handleCommand(trimmedText);
        if (wasHandled) return;
      }

      if (isHistoricalSession) return;

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (!tabId) throw new Error('No active tab found');

        setInputEnabled(false);
        setShowStopButton(true);

        if (!isFollowUpMode) {
          const titleText = displayText || text;
          await createNewSession(titleText.substring(0, 50) + (titleText.length > 50 ? '...' : ''));
        }

        const userMessage = {
          actor: Actors.USER,
          content: displayText || text,
          timestamp: Date.now(),
        };

        appendMessage(userMessage, sessionIdRef.current);

        if (!portRef.current) setupConnection();

        if (isFollowUpMode) {
          await sendMessage({
            type: 'follow_up_task',
            task: text,
            taskId: sessionIdRef.current,
            tabId,
          });
        } else {
          await sendMessage({
            type: 'new_task',
            task: text,
            taskId: sessionIdRef.current,
            tabId,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
        setInputEnabled(true);
        setShowStopButton(false);
        stopConnection();
      }
    },
    [appendMessage, handleCommand, isFollowUpMode, isHistoricalSession, sendMessage, setupConnection, stopConnection, createNewSession, sessionIdRef, portRef],
  );

  const handleStopTask = useCallback(async () => {
    try {
      sendMessage({ type: 'cancel_task' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
    }
    setInputEnabled(true);
    setShowStopButton(false);
  }, [appendMessage, sendMessage]);

  const handleNewChat = useCallback(() => {
    resetSession();
    setInputEnabled(true);
    setShowStopButton(false);
    stopConnection();
  }, [resetSession, stopConnection]);

  const handleLoadHistory = useCallback(async () => {
    await loadChatSessions();
    setShowHistory(true);
  }, [loadChatSessions]);

  const handleBackToChat = useCallback((reset = false) => {
    setShowHistory(false);
    if (reset) resetSession();
  }, [resetSession]);

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    const success = await loadSessionFromHistory(sessionId);
    if (success) setShowHistory(false);
  }, [loadSessionFromHistory]);

  const handleSessionBookmark = useCallback(
    async (sessionId: string) => {
      try {
        const fullSession = await chatHistoryStore.getSession(sessionId);
        if (fullSession && fullSession.messages.length > 0) {
          const sessionTitle = fullSession.title;
          const title = sessionTitle.split(' ').slice(0, 8).join(' ');
          const taskContent = fullSession.messages[0]?.content || '';
          await addFavoritePrompt(title, taskContent);
          handleBackToChat(true);
        }
      } catch (error) {
        console.error('Failed to pin session to favorites:', error);
      }
    },
    [addFavoritePrompt, handleBackToChat],
  );

  const handleBookmarkSelect = useCallback((content: string) => {
    if (setInputTextRef.current) setInputTextRef.current(content);
  }, []);

  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  return {
    messages,
    inputEnabled,
    showStopButton,
    currentSessionId,
    showHistory,
    chatSessions,
    isHistoricalSession,
    isDarkMode,
    favoritePrompts,
    hasConfiguredModels,
    isRecording,
    isProcessingSpeech,
    replayEnabled,
    messagesEndRef,
    setInputTextRef,
    handleSendMessage,
    handleStopTask,
    handleMicClick,
    handleReplay,
    handleNewChat,
    handleLoadHistory,
    handleBackToChat,
    handleSessionSelect,
    handleSessionDelete,
    handleSessionBookmark,
    handleBookmarkSelect,
    handleBookmarkUpdateTitle,
    handleBookmarkDelete,
    handleBookmarkReorder,
  };
};
