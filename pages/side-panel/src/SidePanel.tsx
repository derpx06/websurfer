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
                    <MessageList messages={messages} isDarkMode={isDarkMode} />
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
