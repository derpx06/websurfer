import { useState, useEffect } from 'react';
import '@src/Options.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiShield, FiTrendingUp, FiHelpCircle, FiSun, FiMoon } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { FirewallSettings } from './components/FirewallSettings';
import { AnalyticsSettings } from './components/AnalyticsSettings';

type TabTypes = 'general' | 'models' | 'firewall' | 'analytics' | 'help';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string; size?: number }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'firewall', icon: FiShield, label: t('options_tabs_firewall') },
  { id: 'analytics', icon: FiTrendingUp, label: 'Analytics' },
  { id: 'help', icon: FiHelpCircle, label: t('options_tabs_help') },
];

const Options = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTabClick = (tabId: TabTypes) => {
    if (tabId === 'help') {
      window.open('https://WebSurfer.ai/docs', '_blank');
    } else {
      setActiveTab(tabId);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models': return <ModelSettings isDarkMode={isDarkMode} />;
      case 'firewall': return <FirewallSettings isDarkMode={isDarkMode} />;
      case 'analytics': return <AnalyticsSettings isDarkMode={isDarkMode} />;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen font-inter transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-[#0f1117] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>

      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-300'}`}></div>
        <div className={`absolute top-[40%] -right-[5%] w-[35%] h-[35%] rounded-full blur-[100px] opacity-15 ${isDarkMode ? 'bg-violet-600' : 'bg-violet-300'}`}></div>
        <div className={`absolute -bottom-[5%] left-[20%] w-[30%] h-[30%] rounded-full blur-[90px] opacity-10 ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-200'}`}></div>

        {/* Subtle Grid Pattern */}
        <div className={`absolute inset-0 opacity-[0.03] ${isDarkMode ? 'invert' : ''}`} style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">

        {/* Modern Glassmorphic Sidebar */}
        <aside className={`w-72 flex-shrink-0 flex flex-col border-r backdrop-blur-2xl transition-all duration-500 ${isDarkMode ? 'bg-[#0f1117]/70 border-white/5 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
          <div className="p-8 pb-6 flex items-center gap-4 group cursor-pointer" onClick={() => window.open('https://websurfer.ai', '_blank')}>
            <div className={`flex items-center justify-center w-11 h-11 rounded-[14px] shadow-2xl transition-all duration-700 group-hover:scale-110 ${isDarkMode ? 'bg-gradient-to-br from-indigo-600 to-indigo-800' : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
              }`}>
              <svg className="w-6 h-6 text-white" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1" className="opacity-30" />
                <ellipse cx="32" cy="32" rx="7" ry="22" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
                <circle cx="32" cy="32" r="4.5" fill="currentColor" />
                <path d="M32 4L32 12M32 52L32 60M4 32L12 32M52 32L60 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black tracking-tight font-outfit uppercase">WebSurfer</span>
              <span className={`text-[9px] font-black uppercase tracking-[0.25em] opacity-50 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Optimization</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto scrollbar-none">
            <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Core Settings</div>
            {TABS.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-300 group ${activeTab === item.id
                  ? (isDarkMode ? 'bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm')
                  : (isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                  }`}
              >
                <item.icon size={18} className={`transition-transform duration-300 group-hover:scale-110 ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'firewall' && <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-tighter">Live</span>}
                {activeTab === item.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>}
              </button>
            ))}
          </nav>

          <div className="p-6 mt-auto space-y-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[12px] transition-all duration-300 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isDarkMode ? <FiSun size={14} /> : <FiMoon size={14} />}
              <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>

            <div className={`p-4 rounded-2xl border backdrop-blur-3xl ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white/50 border-slate-200'}`}>
              <div className="text-[10px] font-black opacity-30 text-center uppercase tracking-widest mb-1">Version 2.1.4</div>
              <div className={`text-[9px] font-bold opacity-20 text-center uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-black'}`}>© 2026 Nanobrowser Intelligence</div>
            </div>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-none custom-scrollbar pb-20">
          <div className="max-w-4xl mx-auto px-10 py-12">
            <header className="mb-12 animate-[fadeIn_0.8s_ease-out]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-[2px] bg-indigo-500"></div>
                <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>System Preferences</span>
              </div>
              <h1 className="text-5xl font-black font-outfit tracking-tighter mb-4 leading-tight">
                {TABS.find(t => t.id === activeTab)?.label}
              </h1>
              <p className={`text-[15px] font-medium leading-relaxed max-w-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Customize your WebSurfer instance to prioritize speed, security, and intelligence across your browsing sessions.
              </p>
            </header>

            <div className="animate-[fadeUp_0.6s_ease-out_0.2s_both]">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Premium Toast Notification */}
      <div id="toast" className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl transform translate-y-20 transition-all duration-500 opacity-0 scale-90 ${isDarkMode ? 'bg-[#1a1c23] border-emerald-500/30 text-white' : 'bg-white border-emerald-100 text-slate-900'}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20">
          <svg fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tracking-widest">Success</span>
          <span className="text-[13px] font-medium opacity-60">Preferences synchronized.</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.2); }
      ` }} />
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
