import { useState, useEffect } from 'react';
import '@src/Options.css';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiShield, FiTrendingUp, FiHelpCircle } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { FirewallSettings } from './components/FirewallSettings';
import { AnalyticsSettings } from './components/AnalyticsSettings';
import { OptionsSidebar, OptionsBackground, OptionsHeader } from './components/Layout';

export type TabTypes = 'general' | 'models' | 'firewall' | 'analytics' | 'help';

export const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string; size?: number }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'firewall', icon: FiShield, label: t('options_tabs_firewall') },
  { id: 'analytics', icon: FiTrendingUp, label: 'Analytics' },
  { id: 'help', icon: FiHelpCircle, label: t('options_tabs_help') },
];

/**
 * The Options component is the main entry point for the extension's configuration page.
 * It provides a tabbed interface for managing model settings, language preferences,
 * firewall rules, and analytics.
 */
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
      <OptionsBackground isDarkMode={isDarkMode} />

      <div className="relative z-10 flex h-screen overflow-hidden">
        <OptionsSidebar
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />

        <main className="flex-1 overflow-y-auto scrollbar-none custom-scrollbar pb-20">
          <div className="max-w-4xl mx-auto px-10 py-12">
            <OptionsHeader title={TABS.find(t => t.id === activeTab)?.label || ''} isDarkMode={isDarkMode} />

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
