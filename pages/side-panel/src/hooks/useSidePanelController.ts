/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';

import { type Message, Actors, chatHistoryStore, agentModelStore, generalSettingsStore } from '@extension/storage';
import favoritesStorage, { type FavoritePrompt } from '@extension/storage/lib/prompt/favorites';
import { t } from '@extension/i18n';
import { EventType, type AgentEvent, ExecutionState } from '../types/event';

interface ChatSessionMetadata {
  id: string;
  title: string;
  createdAt: number;
}

const progressMessage = 'Showing progress...';

export const useSidePanelController = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [showStopButton, setShowStopButton] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSessionMetadata[]>([]);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [isHistoricalSession, setIsHistoricalSession] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [favoritePrompts, setFavoritePrompts] = useState<FavoritePrompt[]>([]);
  const [hasConfiguredModels, setHasConfiguredModels] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const isReplayingRef = useRef<boolean>(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const setInputTextRef = useRef<((text: string) => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const checkModelConfiguration = useCallback(async () => {
    try {
      const configuredAgents = await agentModelStore.getConfiguredAgents();
      setHasConfiguredModels(configuredAgents.length > 0);
    } catch (error) {
      console.error('Error checking model configuration:', error);
      setHasConfiguredModels(false);
    }
  }, []);

  const loadGeneralSettings = useCallback(async () => {
    try {
      const settings = await generalSettingsStore.getSettings();
      setReplayEnabled(settings.replayHistoricalTasks);
    } catch (error) {
      console.error('Error loading general settings:', error);
      setReplayEnabled(false);
    }
  }, []);

  useEffect(() => {
    checkModelConfiguration();
    loadGeneralSettings();
  }, [checkModelConfiguration, loadGeneralSettings]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkModelConfiguration();
        loadGeneralSettings();
      }
    };

    const handleFocus = () => {
      checkModelConfiguration();
      loadGeneralSettings();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkModelConfiguration, loadGeneralSettings]);

  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    isReplayingRef.current = isReplaying;
  }, [isReplaying]);

  const appendMessage = useCallback((newMessage: Message, sessionId?: string | null) => {
    const isProgressMessage = newMessage.content === progressMessage;

    setMessages(prev => {
      const filteredMessages = prev.filter((msg, idx) => !(msg.content === progressMessage && idx === prev.length - 1));
      return [...filteredMessages, newMessage];
    });

    const effectiveSessionId = sessionId !== undefined ? sessionId : sessionIdRef.current;

    if (effectiveSessionId && !isProgressMessage) {
      chatHistoryStore.addMessage(effectiveSessionId, newMessage).catch(err => console.error('Failed to save message to history:', err));
    }
  }, []);

  const handleTaskState = useCallback(
    (event: AgentEvent) => {
      const { actor, state, timestamp, data } = event;
      const content = data?.details;
      let skip = true;
      let displayProgress = false;

      switch (actor) {
        case Actors.SYSTEM:
          switch (state) {
            case ExecutionState.TASK_START:
              setIsHistoricalSession(false);
              break;
            case ExecutionState.TASK_OK:
            case ExecutionState.TASK_FAIL:
              setIsFollowUpMode(true);
              setInputEnabled(true);
              setShowStopButton(false);
              setIsReplaying(false);
              skip = false;
              break;
            case ExecutionState.TASK_CANCEL:
              setIsFollowUpMode(false);
              setInputEnabled(true);
              setShowStopButton(false);
              setIsReplaying(false);
              skip = false;
              break;
            case ExecutionState.TASK_PAUSE:
            case ExecutionState.TASK_RESUME:
              break;
            default:
              console.error('Invalid task state', state);
              return;
          }
          break;
        case Actors.USER:
          break;
        case Actors.PLANNER:
          switch (state) {
            case ExecutionState.STEP_START:
              displayProgress = true;
              break;
            case ExecutionState.STEP_OK:
            case ExecutionState.STEP_FAIL:
              skip = false;
              break;
            case ExecutionState.STEP_CANCEL:
              break;
            default:
              console.error('Invalid step state', state);
              return;
          }
          break;
        case Actors.NAVIGATOR:
          switch (state) {
            case ExecutionState.STEP_START:
              displayProgress = true;
              break;
            case ExecutionState.STEP_OK:
              displayProgress = false;
              break;
            case ExecutionState.STEP_FAIL:
              skip = false;
              displayProgress = false;
              break;
            case ExecutionState.STEP_CANCEL:
              displayProgress = false;
              break;
            case ExecutionState.ACT_START:
              if (content !== 'cache_content') {
                skip = false;
              }
              break;
            case ExecutionState.ACT_OK:
              skip = !isReplayingRef.current;
              break;
            case ExecutionState.ACT_FAIL:
              skip = false;
              break;
            default:
              console.error('Invalid action', state);
              return;
          }
          break;
        case Actors.VALIDATOR:
          switch (state) {
            case ExecutionState.STEP_START:
              displayProgress = true;
              break;
            case ExecutionState.STEP_OK:
            case ExecutionState.STEP_FAIL:
              skip = false;
              break;
            default:
              console.error('Invalid validation', state);
              return;
          }
          break;
        default:
          console.error('Unknown actor', actor);
          return;
      }

      if (!skip) {
        appendMessage({ actor, content: content || '', timestamp });
      }

      if (displayProgress) {
        appendMessage({ actor, content: progressMessage, timestamp });
      }
    },
    [appendMessage],
  );

  const stopConnection = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (portRef.current) {
      portRef.current.disconnect();
      portRef.current = null;
    }
  }, []);

  const setupConnection = useCallback(() => {
    if (portRef.current) {
      return;
    }

    try {
      portRef.current = chrome.runtime.connect({ name: 'side-panel-connection' });

      portRef.current.onMessage.addListener((message: any) => {
        if (message && message.type === EventType.EXECUTION) {
          handleTaskState(message);
        } else if (message && message.type === 'error') {
          appendMessage({
            actor: Actors.SYSTEM,
            content: message.error || t('errors_unknown'),
            timestamp: Date.now(),
          });
          setInputEnabled(true);
          setShowStopButton(false);
        } else if (message && message.type === 'speech_to_text_result') {
          if (message.text && setInputTextRef.current) {
            setInputTextRef.current(message.text);
          }
          setIsProcessingSpeech(false);
        } else if (message && message.type === 'speech_to_text_error') {
          appendMessage({
            actor: Actors.SYSTEM,
            content: message.error || t('chat_stt_recognitionFailed'),
            timestamp: Date.now(),
          });
          setIsProcessingSpeech(false);
        }
      });

      portRef.current.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        console.log('Connection disconnected', error ? `Error: ${error.message}` : '');
        portRef.current = null;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        setInputEnabled(true);
        setShowStopButton(false);
      });

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = window.setInterval(() => {
        if (portRef.current?.name === 'side-panel-connection') {
          try {
            portRef.current.postMessage({ type: 'heartbeat' });
          } catch (error) {
            console.error('Heartbeat failed:', error);
            stopConnection();
          }
        } else {
          stopConnection();
        }
      }, 25000);
    } catch (error) {
      console.error('Failed to establish connection:', error);
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('errors_conn_serviceWorker'),
        timestamp: Date.now(),
      });
      portRef.current = null;
    }
  }, [handleTaskState, appendMessage, stopConnection]);

  const sendMessage = useCallback(
    (message: any) => {
      if (portRef.current?.name !== 'side-panel-connection') {
        throw new Error('No valid connection available');
      }
      try {
        portRef.current.postMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
        stopConnection();
        throw error;
      }
    },
    [stopConnection],
  );

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
        if (!tabId) {
          throw new Error('No active tab found');
        }

        if (isHistoricalSession) {
          setMessages([]);
        }

        const newSession = await chatHistoryStore.createSession(`Replay of ${historySessionId.substring(0, 20)}...`);
        const newTaskId = newSession.id;
        setCurrentSessionId(newTaskId);
        sessionIdRef.current = newTaskId;

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

        if (!portRef.current) {
          setupConnection();
        }

        portRef.current?.postMessage({
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
    [appendMessage, isHistoricalSession, replayEnabled, setupConnection],
  );

  const handleCommand = useCallback(
    async (command: string): Promise<boolean> => {
      try {
        if (!portRef.current) {
          setupConnection();
        }

        if (command === '/state') {
          portRef.current?.postMessage({ type: 'state' });
          return true;
        }

        if (command === '/nohighlight') {
          portRef.current?.postMessage({ type: 'nohighlight' });
          return true;
        }

        if (command.startsWith('/replay ')) {
          const parts = command.split(' ').filter(part => part.trim() !== '');
          if (parts.length !== 2) {
            appendMessage({ actor: Actors.SYSTEM, content: t('chat_replay_invalidArgs'), timestamp: Date.now() });
            return true;
          }

          const historySessionId = parts[1];
          await handleReplay(historySessionId);
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
        console.error('Command error', errorMessage);
        appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
        return true;
      }
    },
    [appendMessage, handleReplay, setupConnection],
  );

  const handleSendMessage = useCallback(
    async (text: string, displayText?: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      if (trimmedText.startsWith('/')) {
        const wasHandled = await handleCommand(trimmedText);
        if (wasHandled) return;
      }

      if (isHistoricalSession) {
        return;
      }

      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (!tabId) {
          throw new Error('No active tab found');
        }

        setInputEnabled(false);
        setShowStopButton(true);

        if (!isFollowUpMode) {
          const titleText = displayText || text;
          const newSession = await chatHistoryStore.createSession(
            titleText.substring(0, 50) + (titleText.length > 50 ? '...' : ''),
          );

          const sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          sessionIdRef.current = sessionId;
        }

        const userMessage = {
          actor: Actors.USER,
          content: displayText || text,
          timestamp: Date.now(),
        };

        appendMessage(userMessage, sessionIdRef.current);

        if (!portRef.current) {
          setupConnection();
        }

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
        console.error('Task error', errorMessage);
        appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
        setInputEnabled(true);
        setShowStopButton(false);
        stopConnection();
      }
    },
    [appendMessage, handleCommand, isFollowUpMode, isHistoricalSession, sendMessage, setupConnection, stopConnection],
  );

  const handleStopTask = useCallback(async () => {
    try {
      portRef.current?.postMessage({ type: 'cancel_task' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('cancel_task error', errorMessage);
      appendMessage({ actor: Actors.SYSTEM, content: errorMessage, timestamp: Date.now() });
    }
    setInputEnabled(true);
    setShowStopButton(false);
  }, [appendMessage]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setInputEnabled(true);
    setShowStopButton(false);
    setIsFollowUpMode(false);
    setIsHistoricalSession(false);
    stopConnection();
  }, [stopConnection]);

  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await chatHistoryStore.getSessionsMetadata();
      setChatSessions(sessions.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  const handleLoadHistory = useCallback(async () => {
    await loadChatSessions();
    setShowHistory(true);
  }, [loadChatSessions]);

  const handleBackToChat = useCallback((reset = false) => {
    setShowHistory(false);
    if (reset) {
      setCurrentSessionId(null);
      setMessages([]);
      setIsFollowUpMode(false);
      setIsHistoricalSession(false);
    }
  }, []);

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    try {
      const fullSession = await chatHistoryStore.getSession(sessionId);
      if (fullSession && fullSession.messages.length > 0) {
        setCurrentSessionId(fullSession.id);
        setMessages(fullSession.messages);
        setIsFollowUpMode(false);
        setIsHistoricalSession(true);
      }
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, []);

  const handleSessionDelete = useCallback(
    async (sessionId: string) => {
      try {
        await chatHistoryStore.deleteSession(sessionId);
        await loadChatSessions();
        if (sessionId === currentSessionId) {
          setMessages([]);
          setCurrentSessionId(null);
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    },
    [currentSessionId, loadChatSessions],
  );

  const handleSessionBookmark = useCallback(
    async (sessionId: string) => {
      try {
        const fullSession = await chatHistoryStore.getSession(sessionId);

        if (fullSession && fullSession.messages.length > 0) {
          const sessionTitle = fullSession.title;
          const title = sessionTitle.split(' ').slice(0, 8).join(' ');
          const taskContent = fullSession.messages[0]?.content || '';

          await favoritesStorage.addPrompt(title, taskContent);

          const prompts = await favoritesStorage.getAllPrompts();
          setFavoritePrompts(prompts);

          handleBackToChat(true);
        }
      } catch (error) {
        console.error('Failed to pin session to favorites:', error);
      }
    },
    [handleBackToChat],
  );

  const handleBookmarkSelect = useCallback((content: string) => {
    if (setInputTextRef.current) {
      setInputTextRef.current(content);
    }
  }, []);

  const handleBookmarkUpdateTitle = useCallback(async (id: number, title: string) => {
    try {
      await favoritesStorage.updatePromptTitle(id, title);
      const prompts = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(prompts);
    } catch (error) {
      console.error('Failed to update favorite prompt title:', error);
    }
  }, []);

  const handleBookmarkDelete = useCallback(async (id: number) => {
    try {
      await favoritesStorage.removePrompt(id);
      const prompts = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(prompts);
    } catch (error) {
      console.error('Failed to delete favorite prompt:', error);
    }
  }, []);

  const handleBookmarkReorder = useCallback(async (draggedId: number, targetId: number) => {
    try {
      await favoritesStorage.reorderPrompts(draggedId, targetId);
      const updatedPromptsFromStorage = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(updatedPromptsFromStorage);
    } catch (error) {
      console.error('Failed to reorder favorite prompts:', error);
    }
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const prompts = await favoritesStorage.getAllPrompts();
        setFavoritePrompts(prompts);
      } catch (error) {
        console.error('Failed to load favorite prompts:', error);
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      stopConnection();
    };
  }, [stopConnection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMicClick = useCallback(async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (permissionStatus.state === 'denied') {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_stt_microphone_permissionDenied'),
          timestamp: Date.now(),
        });
        return;
      }

      if (permissionStatus.state !== 'granted') {
        const permissionUrl = chrome.runtime.getURL('permission/index.html');

        chrome.windows.create(
          {
            url: permissionUrl,
            type: 'popup',
            width: 500,
            height: 600,
          },
          createdWindow => {
            if (createdWindow?.id) {
              chrome.windows.onRemoved.addListener(function onWindowClose(windowId) {
                if (windowId === createdWindow.id) {
                  chrome.windows.onRemoved.removeListener(onWindowClose);
                  setTimeout(async () => {
                    try {
                      const newPermissionStatus = await navigator.permissions.query({
                        name: 'microphone' as PermissionName,
                      });
                      if (newPermissionStatus.state === 'granted') {
                        handleMicClick();
                      }
                    } catch (error) {
                      console.error('Failed to check permission status:', error);
                    }
                  }, 500);
                }
              });
            }
          },
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;

            if (!portRef.current) {
              setupConnection();
            }

            try {
              setIsProcessingSpeech(true);
              portRef.current?.postMessage({
                type: 'speech_to_text',
                audio: base64Audio,
              });
            } catch (error) {
              console.error('Failed to send audio for speech-to-text:', error);
              appendMessage({
                actor: Actors.SYSTEM,
                content: t('chat_stt_processingFailed'),
                timestamp: Date.now(),
              });
              setIsRecording(false);
              setIsProcessingSpeech(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      const maxDuration = 2 * 60 * 1000;
      recordingTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsProcessingSpeech(true);
        recordingTimerRef.current = null;
      }, maxDuration);

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);

      let errorMessage = t('chat_stt_microphone_accessFailed');
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += t('chat_stt_microphone_grantPermission');
        } else if (error.name === 'NotFoundError') {
          errorMessage += t('chat_stt_microphone_notFound');
        } else {
          errorMessage += error.message;
        }
      }

      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      setIsRecording(false);
    }
  }, [appendMessage, isRecording, setupConnection]);

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
