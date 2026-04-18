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
    <header className={`sticky top-0 z-[60] overflow-hidden px-5 py-4 transition-all duration-700 ${isDarkMode
      ? 'border-b border-white/[0.04] bg-websurfer-bg/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
      : 'border-b border-slate-200/60 bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'
      } backdrop-blur-2xl`}>

      {/* Background Micro-Accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className={`absolute -right-10 -top-10 size-24 rounded-full blur-2xl ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-100/30'}`}></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        {/* BRAND IDENTITY - RECALIBRATED PRECISION */}
        <button
          type="button"
          className="group flex items-center gap-3.5 text-left"
          onClick={showHistory ? onBackToChat : undefined}
          aria-label={showHistory ? 'Back to chat' : 'WebSurfer'}
        >
          <div className="relative">
            <div className={`flex size-10 items-center justify-center rounded-[12px] transition-all duration-700 group-hover:scale-105 ${isDarkMode
              ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-400 shadow-[0_4px_12px_rgba(99,102,241,0.4),inset_0_0_8px_rgba(255,255,255,0.1)] ring-1 ring-white/20'
              : 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-100 ring-1 ring-indigo-400/20'
              }`}>
              <svg className="size-[22px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7" className="opacity-90" />
                <circle cx="12" cy="12" r="1.5" className="fill-white" />
              </svg>
            </div>
            {/* Live Status Indicator - Premium Glow */}
            <div className="absolute -right-1 -top-1 flex">
              <span className={`absolute inline-flex size-4 animate-ping rounded-full opacity-60 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-300'}`}></span>
              <span className={`relative inline-flex size-4 rounded-full border-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] ${isDarkMode
                ? 'border-[#0a0f1e] bg-emerald-500'
                : 'border-white bg-emerald-500'
                }`}></span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className={`font-outfit text-[19px] font-black leading-none tracking-[-0.03em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              WebSurfer
            </span>

          </div>
        </button>

        {/* NAVIGATION SYSTEM - OPTIMIZED GLASS PILL */}
        <div className={`flex items-center rounded-2xl p-1.5 backdrop-blur-3xl transition-all duration-700 ${isDarkMode
          ? 'bg-white/[0.04] shadow-xl ring-1 ring-white/10'
          : 'border border-slate-200/80 bg-slate-50/60 shadow-sm'
          }`}>
          {showHistory ? (
            <button
              type="button"
              onClick={onBackToChat}
              className={`flex items-center justify-center rounded-xl p-2.5 transition-all duration-500 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title={t('nav_back')}>
              <FaChevronLeft size={13} />
            </button>
          ) : (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onNewChat}
                className={`group/btn flex items-center justify-center rounded-xl p-2.5 transition-all duration-500 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_newChat_a11y')}>
                <FaPlus size={13} className="transition-transform duration-500 group-hover/btn:rotate-90" />
              </button>
              <button
                type="button"
                onClick={onLoadHistory}
                className={`flex items-center justify-center rounded-xl p-2.5 transition-all duration-500 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-indigo-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                title={t('nav_loadHistory_a11y')}>
                <FaHistory size={13} />
              </button>
            </div>
          )}

          <div className={`mx-2 h-5 w-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-0.5">
            <a
              href="https://github.com/derpx06/websurfer"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center rounded-xl p-2.5 transition-all duration-500 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title="GitHub"
            >
              <FaGithub size={15} />
            </a>

            <button
              type="button"
              onClick={() => chrome.runtime.openOptionsPage()}
              className={`group/cog flex items-center justify-center rounded-xl p-2.5 transition-all duration-500 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:shadow-md'
                }`}
              title={t('nav_settings_a11y')}>
              <FaCog size={15} className="transition-transform duration-1000 group-hover/cog:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SidePanelHeader;
