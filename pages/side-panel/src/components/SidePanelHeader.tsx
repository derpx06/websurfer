import { FaHistory, FaPlus, FaGithub, FaCog, FaChevronLeft } from 'react-icons/fa';
import { t } from '@extension/i18n';

type SidePanelHeaderProps = {
  isDarkMode: boolean;
  showHistory: boolean;
  onBackToChat: () => void;
  onNewChat: () => void;
  onLoadHistory: () => void;
};

const SidePanelHeader = ({
  isDarkMode,
  showHistory,
  onBackToChat,
  onNewChat,
  onLoadHistory,
}: SidePanelHeaderProps) => {

  return (
    <header className={`sticky top-0 z-[60] px-4 py-4 backdrop-blur-3xl transition-all duration-500 overflow-hidden ${isDarkMode
      ? 'bg-[#0f1117]/85 border-b border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]'
      : 'bg-white/90 border-b border-gray-100 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]'
      }`}>
      {/* Dynamic Background Accents */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        {/* Brand Section */}
        <div className="flex items-center gap-3 group cursor-pointer" onClick={showHistory ? onBackToChat : undefined}>
          <div className="relative">
            <div className={`flex items-center justify-center w-10 h-10 rounded-2xl shadow-xl transition-all duration-700 group-hover:scale-110 ${isDarkMode
              ? 'bg-gradient-to-br from-indigo-600/30 to-indigo-800/20 ring-1 ring-white/10'
              : 'bg-gradient-to-br from-indigo-50 to-white ring-1 ring-indigo-100'
              }`}>
              <svg className={`w-6 h-6 transition-all duration-500 ${isDarkMode ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'text-indigo-600'}`} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1" className="opacity-20" />
                <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.2" className="opacity-30" />
                <ellipse cx="32" cy="32" rx="7" ry="22" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                <circle cx="32" cy="32" r="4.5" fill="currentColor" />
                <path d="M32 4L32 12M32 52L32 60M4 32L12 32M52 32L60 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            {/* Live Indicator Dot */}
            <div className="absolute -top-0.5 -right-0.5 flex">
              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0f1117]"></span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className={`text-[19px] font-[900] tracking-tight font-outfit leading-none transition-colors duration-300 ${isDarkMode ? 'text-white group-hover:text-indigo-400' : 'text-gray-900 group-hover:text-indigo-600'
              }`}>
              WebSurfer
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Browser Agent
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className={`flex items-center p-1 rounded-2xl ${isDarkMode ? 'bg-[#1a1c23]/50 ring-1 ring-white/5 shadow-inner' : 'bg-gray-50/50 border border-gray-100'
          }`}>
          {showHistory ? (
            <button
              type="button"
              onClick={onBackToChat}
              className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-white hover:shadow-md'
                }`}
              title={t('nav_back')}>
              <FaChevronLeft size={13} />
            </button>
          ) : (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onNewChat}
                className={`p-2.5 rounded-xl transition-all duration-300 group/btn flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_newChat_a11y')}>
                <FaPlus size={13} className="group-hover/btn:rotate-90 transition-transform duration-500" />
              </button>
              <button
                type="button"
                onClick={onLoadHistory}
                className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_loadHistory_a11y')}>
                <FaHistory size={13} />
              </button>
            </div>
          )}

          <div className={`w-[1px] h-4 mx-1.5 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

          <a
            href="https://github.com/derpx06/websurfer"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-white hover:shadow-md'
              }`}
            title="GitHub"
          >
            <FaGithub size={15} />
          </a>

          <button
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}
            className={`p-2.5 rounded-xl transition-all duration-300 group/cog flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-white hover:shadow-md'
              }`}
            title={t('nav_settings_a11y')}>
            <FaCog size={15} className="group-hover/cog:rotate-90 transition-transform duration-700" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default SidePanelHeader;
