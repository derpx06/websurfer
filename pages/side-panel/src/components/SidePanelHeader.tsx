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
    <header className={`sticky top-0 z-[60] px-5 py-4 transition-all duration-700 overflow-hidden ${isDarkMode
      ? 'bg-websurfer-bg/80 border-b border-white/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
      : 'bg-white/80 border-b border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'
      } backdrop-blur-2xl`}>

      {/* Background Micro-Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-100/30'}`}></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        {/* BRAND IDENTITY - RECALIBRATED PRECISION */}
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={showHistory ? onBackToChat : undefined}>
          <div className="relative">
            <div className={`flex items-center justify-center w-10 h-10 rounded-[12px] transition-all duration-700 group-hover:scale-105 ${isDarkMode
              ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-400 ring-1 ring-white/20 shadow-[0_4px_12px_rgba(99,102,241,0.4),inset_0_0_8px_rgba(255,255,255,0.1)]'
              : 'bg-gradient-to-br from-indigo-500 to-indigo-600 ring-1 ring-indigo-400/20 shadow-md shadow-indigo-100'
              }`}>
              <svg className="w-[22px] h-[22px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7" className="opacity-90" />
                <circle cx="12" cy="12" r="1.5" className="fill-white" />
              </svg>
            </div>
            {/* Live Status Indicator - Premium Glow */}
            <div className="absolute -top-1 -right-1 flex">
              <span className={`absolute inline-flex h-4 w-4 animate-ping rounded-full opacity-60 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-300'}`}></span>
              <span className={`relative inline-flex h-4 w-4 rounded-full border-[2px] shadow-[0_0_8px_rgba(16,185,129,0.5)] ${isDarkMode
                ? 'bg-emerald-500 border-[#0a0f1e]'
                : 'bg-emerald-500 border-white'
                }`}></span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className={`text-[19px] font-[950] tracking-[-0.03em] font-outfit leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              WebSurfer
            </span>

          </div>
        </div>

        {/* NAVIGATION SYSTEM - OPTIMIZED GLASS PILL */}
        <div className={`flex items-center p-1.5 rounded-2xl backdrop-blur-3xl transition-all duration-700 ${isDarkMode
          ? 'bg-white/[0.04] ring-1 ring-white/10 shadow-xl'
          : 'bg-slate-50/60 border border-slate-200/80 shadow-sm'
          }`}>
          {showHistory ? (
            <button
              type="button"
              onClick={onBackToChat}
              className={`p-2.5 rounded-xl transition-all duration-500 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title={t('nav_back')}>
              <FaChevronLeft size={13} />
            </button>
          ) : (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onNewChat}
                className={`p-2.5 rounded-xl transition-all duration-500 group/btn flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_newChat_a11y')}>
                <FaPlus size={13} className="group-hover/btn:rotate-90 transition-transform duration-500" />
              </button>
              <button
                type="button"
                onClick={onLoadHistory}
                className={`p-2.5 rounded-xl transition-all duration-500 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_loadHistory_a11y')}>
                <FaHistory size={13} />
              </button>
            </div>
          )}

          <div className={`w-[1px] h-5 mx-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-0.5">
            <a
              href="https://github.com/derpx06/websurfer"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2.5 rounded-xl transition-all duration-500 flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title="GitHub"
            >
              <FaGithub size={15} />
            </a>

            <button
              type="button"
              onClick={() => chrome.runtime.openOptionsPage()}
              className={`p-2.5 rounded-xl transition-all duration-500 group/cog flex items-center justify-center ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title={t('nav_settings_a11y')}>
              <FaCog size={15} className="group-hover/cog:rotate-180 transition-transform duration-1000" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SidePanelHeader;
