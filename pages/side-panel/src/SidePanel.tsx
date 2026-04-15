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
      <div className={`flex flex-col h-screen overflow-hidden relative ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
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
              <div className="flex flex-1 flex-col overflow-hidden relative">
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
                  <div className="ws-body">
                    <MessageList messages={messages} isDarkMode={isDarkMode} />
                    <div ref={messagesEndRef} />
                  </div>
                )}

                <div className={`border-t ${isDarkMode ? 'border-sky-900' : 'border-sky-100'} p-2 shadow-sm backdrop-blur-sm z-10`}>
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    onStopTask={handleStopTask}
                    onMicClick={handleMicClick}
                    isRecording={isRecording}
                    isProcessingSpeech={isProcessingSpeech}
                    disabled={!inputEnabled || isHistoricalSession}
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
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
