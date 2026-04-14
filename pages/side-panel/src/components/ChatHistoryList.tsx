/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { FaTrash, FaSearch } from 'react-icons/fa';
import { BsBookmark, BsChatTextFill } from 'react-icons/bs';
import { t } from '@extension/i18n';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatHistoryListProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionBookmark: (sessionId: string) => void;
  visible: boolean;
  isDarkMode?: boolean;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  sessions,
  onSessionSelect,
  onSessionDelete,
  onSessionBookmark,
  visible,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!visible) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return formatDate(timestamp);
  };

  const filteredSessions = sessions.filter(session =>
    (session.title || 'Untitled Session').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let group = '';
    if (date.toDateString() === today.toDateString()) {
      group = 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'YESTERDAY';
    } else {
      group = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  // Define icon colors based on string hash for deterministic colors
  const getIconColor = (title: string, isDark: boolean) => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorsDark = [
      'bg-[#0f1f3a] text-blue-400',
      'bg-[#1a2f26] text-emerald-400',
      'bg-[#2d1b1a] text-rose-400',
      'bg-[#211a3b] text-purple-400',
      'bg-[#2b211a] text-amber-400'
    ];
    const colorsLight = [
      'bg-blue-100 text-blue-600',
      'bg-emerald-100 text-emerald-600',
      'bg-rose-100 text-rose-600',
      'bg-purple-100 text-purple-600',
      'bg-amber-100 text-amber-600'
    ];
    return isDark ? colorsDark[Math.abs(hash) % colorsDark.length] : colorsLight[Math.abs(hash) % colorsLight.length];
  };

  return (
    <div className="flex h-full flex-col overflow-hidden pb-4">
      {/* Premium Header and Sticky Top Area */}
      <div className={`sticky top-0 z-10 px-4 pt-4 pb-2 ${isDarkMode ? 'bg-[#0f1117]/95 backdrop-blur-md border-b border-white/5' : 'bg-white/95 backdrop-blur-md border-b border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold tracking-tight bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-gray-100 to-gray-400' : 'bg-gradient-to-r from-gray-900 to-gray-600'}`}>
            History
          </h2>
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
            {sessions.length} sessions
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
            <FaSearch size={14} />
          </div>
          <input
            type="text"
            className={`w-full block pl-10 pr-4 py-2.5 rounded-xl border-0 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all ${isDarkMode ? 'bg-white/5 text-white placeholder-slate-500 focus:bg-[#1a1c23]' : 'bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:shadow-sm'}`}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 mt-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {filteredSessions.length === 0 ? (
          <div className={`mt-6 flex flex-col items-center justify-center p-8 rounded-2xl ${isDarkMode ? 'bg-slate-800/20 border border-white/5' : 'bg-gray-50/50 border border-gray-100'}`}>
            <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-slate-800/50 text-slate-500' : 'bg-white text-gray-400 shadow-sm'}`}>
              <FaSearch size={20} />
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No sessions found</p>
            <p className={`text-xs mt-1 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {searchQuery ? "Try adjusting your search query." : "You haven't started any conversations yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2 pb-6">
            {Object.entries(groupedSessions).map(([group, groupSessions]) => (
              <div key={group}>
                <div className="mb-3 flex items-center gap-4">
                  <span className={`text-[11px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {group}
                  </span>
                  <div className={`h-px flex-grow ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} />
                </div>

                <div className="space-y-1">
                  {groupSessions.map(session => (
                    <div
                      key={session.id}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl ${isDarkMode ? 'hover:bg-[#1a1c23]' : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
                        } p-2.5 transition-all duration-200`}>

                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105 ${getIconColor(session.title, isDarkMode)}`}>
                        <BsChatTextFill size={16} />
                      </div>

                      <button onClick={() => onSessionSelect(session.id)} className="flex-grow overflow-hidden text-left" type="button">
                        <h3 className={`truncate text-[13px] font-semibold leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} group-hover:text-blue-500 transition-colors`}>
                          {session.title || 'Untitled Session'}
                        </h3>
                        <p className={`mt-1 truncate text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {getTimeAgo(session.createdAt)}
                        </p>
                      </button>

                      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        {onSessionBookmark && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onSessionBookmark(session.id);
                            }}
                            className={`rounded-lg p-2 transition-colors ${isDarkMode
                              ? 'text-gray-400 hover:bg-slate-700 hover:text-sky-400'
                              : 'text-gray-400 hover:bg-white hover:text-sky-500 hover:shadow-sm'
                              }`}
                            aria-label={t('chat_history_bookmark')}
                            type="button">
                            <BsBookmark size={14} />
                          </button>
                        )}

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSessionDelete(session.id);
                          }}
                          className={`rounded-lg p-2 transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:bg-slate-700 hover:text-red-400'
                            : 'text-gray-400 hover:bg-white hover:text-red-500 hover:shadow-sm'
                            }`}
                          aria-label={t('chat_history_delete')}
                          type="button">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryList;
