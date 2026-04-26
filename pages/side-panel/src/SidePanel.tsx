import { useEffect, useRef } from 'react';
import { t } from '@extension/i18n';
import ChatHistoryList from './components/ChatHistoryList';
import ChatInput from './components/ChatInput';
import EmptyChat from './components/EmptyChat';
import MessageList from './components/MessageList';
import SidePanelHeader from './components/SidePanelHeader';
import { AgentSight } from './components/AgentSight';
import WelcomeScreen from './components/WelcomeScreen';
import { useSidePanelController } from './hooks/useSidePanelController';
import './SidePanel.css';

// Declare chrome API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

const SidePanel = () => {
  const {
    messages,
    inputEnabled,
    showStopButton,
    currentSessionId,
    showHistory,
    chatSessions,
    isHistoricalSession,
    isDarkMode,
    hasConfiguredModels,
    isRecording,
    isProcessingSpeech,
    lastScreenshot,
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
  } = useSidePanelController();

  // ---------------------------------------------------------------------------
  // Omnibox handoff
  //
  // Two-phase approach to avoid race conditions:
  //
  // Phase 1 (this effect): read the pending prompt from chrome.storage.session
  //   into a ref. This runs on mount AND whenever the panel is already open
  //   and the background writes a new prompt (via onChanged). The key is
  //   cleared immediately so it can never fire twice.
  //
  // Phase 2 (next effect): watch hasConfiguredModels. The moment it becomes
  //   `true` (panel is fully initialised, port connected), flush the ref and
  //   call handleSendMessage. This is the only correct trigger point.
  // ---------------------------------------------------------------------------
  const pendingOmniboxPrompt = useRef<string | null>(null);

  useEffect(() => {
    const PENDING_KEY = 'pendingOmniboxPrompt';

    const storePrompt = (prompt: string) => {
      if (!prompt.trim()) return;
      // Clear the key immediately — prevent replay on any future effect run
      chrome.storage.session.remove(PENDING_KEY);
      pendingOmniboxPrompt.current = prompt.trim();
    };

    // Cold open: panel was just opened, check storage now
    chrome.storage.session.get(PENDING_KEY, (result) => {
      const pending = result?.[PENDING_KEY];
      if (typeof pending === 'string') storePrompt(pending);
    });

    // Hot path: panel was already open when user pressed Enter in omnibox
    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'session') return;
      const newValue = changes[PENDING_KEY]?.newValue;
      if (typeof newValue === 'string') {
        storePrompt(newValue);
        // Panel is already open and ready — dispatch immediately
        if (hasConfiguredModels === true) {
          const prompt = pendingOmniboxPrompt.current;
          pendingOmniboxPrompt.current = null;
          if (prompt) handleSendMessage(prompt);
        }
      }
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2: fire the pending prompt the instant the panel is ready
  useEffect(() => {
    if (hasConfiguredModels === true && pendingOmniboxPrompt.current) {
      const prompt = pendingOmniboxPrompt.current;
      pendingOmniboxPrompt.current = null;
      handleSendMessage(prompt);
    }
  }, [hasConfiguredModels, handleSendMessage]);

  return (
    <div>
      <div className={`relative flex h-screen flex-col overflow-hidden ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
        <SidePanelHeader
          isDarkMode={isDarkMode}
          showHistory={showHistory}
          onBackToChat={() => handleBackToChat(false)}
          onNewChat={handleNewChat}
          onLoadHistory={handleLoadHistory}
        />

        {showHistory ? (
          <div className="flex-1 overflow-hidden">
            <ChatHistoryList
              sessions={chatSessions}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onSessionBookmark={handleSessionBookmark}
              visible={true}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <>
            {hasConfiguredModels === null && (
              <div className={`flex flex-1 items-center justify-center p-8 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`}>
                <div className="text-center">
                  <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
                  <p>{t('status_checkingConfig')}</p>
                </div>
              </div>
            )}

            {hasConfiguredModels === false && (
              <WelcomeScreen isDarkMode={isDarkMode} onOpenSettings={() => chrome.runtime.openOptionsPage()} />
            )}

            {hasConfiguredModels === true && (
              <div className="relative flex flex-1 flex-col overflow-hidden">
                {/* Agent Sight: Live Preview Window */}
                <AgentSight screenshot={lastScreenshot} isActive={showStopButton} />

                {messages.length === 0 && (
                  <EmptyChat
                    isDarkMode={isDarkMode}
                    onSelectPrompt={text => {
                      if (setInputTextRef.current) {
                        setInputTextRef.current(text);
                      }
                    }}
                  />
                )}

                {messages.length > 0 && (
                  <div className="ws-body ws-body--floating-input">
                    <MessageList messages={messages} isDarkMode={isDarkMode} onOptionSelect={handleSendMessage} />
                    <div ref={messagesEndRef} />
                  </div>
                )}

                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-2 pt-8 ${isDarkMode
                    ? 'bg-gradient-to-t from-[#020617]/95 via-[#020617]/60 to-transparent'
                    : 'bg-gradient-to-t from-white/95 via-white/65 to-transparent'
                    }`}>
                  <div className="pointer-events-auto">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      onStopTask={handleStopTask}
                      onMicClick={handleMicClick}
                      isRecording={isRecording}
                      isProcessingSpeech={isProcessingSpeech}
                      disabled={!inputEnabled}
                      showStopButton={showStopButton}
                      setContent={setter => {
                        setInputTextRef.current = setter;
                      }}
                      isDarkMode={isDarkMode}
                      historicalSessionId={isHistoricalSession && replayEnabled ? currentSessionId : null}
                      onReplay={handleReplay}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
