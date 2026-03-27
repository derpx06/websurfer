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
    <header className="ws-topbar">
      <div className="ws-brand">
        <div className="ws-brand-logo">
          {isDarkMode ? (
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="logoGlow" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#7ee8ff" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </radialGradient>
                <radialGradient id="logoBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0e2040" />
                  <stop offset="100%" stopColor="#060b16" />
                </radialGradient>
                <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <circle cx="15" cy="15" r="14" fill="url(#logoBg)" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
              <circle cx="15" cy="15" r="8.5" stroke="url(#logoGlow)" strokeWidth="1.2" fill="none" />
              <path
                d="M15 6.5c-2 2.5-3 5.3-3 8.5s1 6 3 8.5M15 6.5c2 2.5 3 5.3 3 8.5s-1 6-3 8.5"
                stroke="url(#logoGlow)"
                strokeWidth="1"
                fill="none"
                strokeOpacity="0.7"
              />
              <line x1="6.5" y1="15" x2="23.5" y2="15" stroke="url(#logoGlow)" strokeWidth="1" strokeOpacity="0.7" />
              <ellipse
                cx="15"
                cy="15"
                rx="13"
                ry="5"
                stroke="url(#orbitGrad)"
                strokeWidth="1"
                fill="none"
                transform="rotate(-25 15 15)"
                strokeOpacity="0.5"
              />
              <circle cx="24.5" cy="12" r="1.8" fill="#38bdf8" opacity="0.9" />
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="lLogoBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#EEF2FF" />
                  <stop offset="100%" stopColor="#E0E7FF" />
                </radialGradient>
                <linearGradient id="lOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle cx="15" cy="15" r="14" fill="url(#lLogoBg)" stroke="rgba(79,70,229,0.20)" strokeWidth="1" />
              <circle cx="15" cy="15" r="8.5" stroke="#4F46E5" strokeWidth="1.2" fill="none" strokeOpacity="0.7" />
              <path
                d="M15 6.5c-2 2.5-3 5.3-3 8.5s1 6 3 8.5M15 6.5c2 2.5 3 5.3 3 8.5s-1 6-3 8.5"
                stroke="#4F46E5"
                strokeWidth="1"
                fill="none"
                strokeOpacity="0.5"
              />
              <line x1="6.5" y1="15" x2="23.5" y2="15" stroke="#4F46E5" strokeWidth="1" strokeOpacity="0.5" />
              <ellipse
                cx="15"
                cy="15"
                rx="13"
                ry="5"
                stroke="url(#lOrbitGrad)"
                strokeWidth="1"
                fill="none"
                transform="rotate(-25 15 15)"
                strokeOpacity="0.45"
              />
              <circle cx="24.5" cy="12" r="1.8" fill="#4F46E5" opacity="0.85" />
            </svg>
          )}
        </div>
        <span className="ws-brand-name cursor-pointer" onClick={showHistory ? onBackToChat : undefined}>
          WebSurfer
        </span>
      </div>
      <div className="ws-nav-icons">
        {showHistory ? (
          <button
            type="button"
            onClick={onBackToChat}
            className="ws-nav-btn"
            aria-label={t('nav_back_a11y')}
            title={t('nav_back')}>
            <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onNewChat}
              className="ws-nav-btn"
              aria-label={t('nav_newChat_a11y')}
              title={t('nav_newChat_a11y')}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onLoadHistory}
              className="ws-nav-btn"
              aria-label={t('nav_loadHistory_a11y')}
              title={t('nav_loadHistory_a11y')}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </>
        )}
        <a
          href="https://github.com/derpx06/websurfer.git"
          target="_blank"
          rel="noopener noreferrer"
          className="ws-nav-btn"
          title="GitHub"
        >
          <svg
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 
    0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.089-.745.082-.729.082-.729 
    1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.76-1.605-2.665-.3-5.467-1.335-5.467-5.93 
    0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3.003-.404 
    c1.018.005 2.042.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 
    1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.92.43.37.814 1.102.814 2.222 
    0 1.606-.015 2.896-.015 3.286 0 .32.218.694.825.576C20.565 21.795 24 17.295 24 12 
    24 5.37 18.63 0 12 0z"
            />
          </svg>
        </a>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="ws-nav-btn"
          aria-label={t('nav_settings_a11y')}
          title={t('nav_settings_a11y')}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default SidePanelHeader;
