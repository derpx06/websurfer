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

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'firewall', icon: FiShield, label: t('options_tabs_firewall') },
  { id: 'analytics', icon: FiTrendingUp, label: 'Analytics' },
  { id: 'help', icon: FiHelpCircle, label: t('options_tabs_help') },
];

const Options = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize from system preference
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
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'firewall':
        return <FirewallSettings isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsSettings isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  return (
    <div className={`shell${isDarkMode ? '' : ' light'}`}>
      {/* Background */}
      <div className="ws-settings-bg">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
      </div>

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar">
        <div className="sb-brand">
          {/* Animated CSS orbit logo — matches SidePanel hero globe style */}
          <div className="sb-orbit-wrap">
            <div className="sb-orbit-outer"></div>
            <div className="sb-orbit-mid"></div>
            <div className="sb-orbit-core">
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2c-2.5 3-4 6.4-4 10s1.5 7 4 10M12 2c2.5 3 4 6.4 4 10s-1.5 7-4 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
          </div>
          <span className="sb-name">WebSurfer</span>
        </div>


        <div className="sb-section">
          <div className="sb-label">Settings</div>
          {TABS.map(item => (
            <button
              key={item.id}
              className={`sb-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleTabClick(item.id)}>
              <item.icon />
              {item.label}
              {item.id === 'firewall' && <span className="sb-badge">3</span>}
            </button>
          ))}
        </div>

        <div className="sb-section" style={{ marginTop: 'auto' }}>
          <div className="sb-label">Preferences</div>
          {/* Theme toggle */}
          <button className="theme-btn" onClick={() => setIsDarkMode(d => !d)}>
            {isDarkMode ? <FiSun size={13} /> : <FiMoon size={13} />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className="sb-item" style={{ marginTop: '8px' }} onClick={() => window.open('https://WebSurfer.ai/docs', '_blank')}>
            <FiHelpCircle />
            Help
          </button>
        </div>

        <div className="sb-footer">
          <div className="sb-version">WebSurfer v2.1.4 · Build 2026.03</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main" id="mainContent">
        <div style={{ maxWidth: '860px', margin: '0 auto', minWidth: '480px' }}>
          {renderTabContent()}
        </div>
      </main>

      {/* Toast */}
      <div id="toast">
        <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          strokeLinejoin="round" viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Settings saved
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
