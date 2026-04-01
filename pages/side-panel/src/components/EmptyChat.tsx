import React from 'react';

interface EmptyChatProps {
    onSelectPrompt: (text: string) => void;
    isDarkMode: boolean;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectPrompt, isDarkMode }) => {
    return (
        <div className={`ws-body ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
            <div className="bg-fx">
                <div className="bg-blob bb1"></div>
                <div className="bg-blob bb2"></div>
            </div>

            {/* HERO SECTION */}
            <div className="ws-hero">
                <div className="ws-orb-wrap">
                    <div className="ws-orb-ring-outer"></div>
                    <div className="ws-orb-ring-mid"></div>
                    <div className="ws-orb-core">
                        {/* Crisp globe SVG — latitude/longitude lines clearly visible */}
                        <svg className="ws-orb-globe" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2c-2.5 3-4 6.4-4 10s1.5 7 4 10M12 2c2.5 3 4 6.4 4 10s-1.5 7-4 10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M3.5 7h17M3.5 17h17" strokeOpacity="0.45" />
                        </svg>
                    </div>
                </div>
                <div className="ws-hero-title font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Your AI <span>Browser Agent</span></div>
                <p className="ws-hero-sub font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>Describe what you need — I'll navigate, click, fill forms and extract data autonomously.</p>
            </div>

            {/* QUICK ACTIONS */}
            <div className="ws-label">Quick Actions</div>
            <div className="ws-grid">
                <div className="ws-ac" onClick={() => onSelectPrompt('Search and summarize the latest news about ')}>
                    <div className="ws-ac-ico ws-ico-c">
                        <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
                        </svg>
                    </div>
                    <div>
                        <div className="ws-ac-name font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Search & Summarize</div>
                        <div className="ws-ac-hint font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>Find and distill web content</div>
                    </div>
                </div>

                <div className="ws-ac" onClick={() => onSelectPrompt('Fill out the form on this page with ')}>
                    <div className="ws-ac-ico ws-ico-v">
                        <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                    </div>
                    <div>
                        <div className="ws-ac-name font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Fill Forms</div>
                        <div className="ws-ac-hint font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>Auto-complete any web form</div>
                    </div>
                </div>

                <div className="ws-ac" onClick={() => onSelectPrompt('Extract all data from the current page and ')}>
                    <div className="ws-ac-ico ws-ico-a">
                        <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                    </div>
                    <div>
                        <div className="ws-ac-name font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Extract Data</div>
                        <div className="ws-ac-hint font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>Scrape tables, lists, text</div>
                    </div>
                </div>

                <div className="ws-ac" onClick={() => onSelectPrompt('Navigate to and take a screenshot of ')}>
                    <div className="ws-ac-ico ws-ico-g">
                        <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                    </div>
                    <div>
                        <div className="ws-ac-name font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>Screenshot</div>
                        <div className="ws-ac-hint font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>Capture any page or element</div>
                    </div>
                </div>
            </div>

            {/* EXAMPLES */}
            <div className="ws-examples">
                <div className="ws-label">Try asking…</div>

                <button className="ws-ex" onClick={() => onSelectPrompt('Go to Hacker News and summarize the top 5 stories')}>
                    <span className="ws-ex-dot" style={{ background: '#f59e0b', boxShadow: '0 0 7px rgba(245,158,11,.45)' }}></span>
                    <span className="ws-ex-txt">Summarize top 5 Hacker News stories</span>
                    <span className="ws-ex-arr">→</span>
                </button>
                <button className="ws-ex" onClick={() => onSelectPrompt('Search GitHub for trending Python repos this week and list them')}>
                    <span className="ws-ex-dot" style={{ background: '#34d399', boxShadow: '0 0 7px rgba(52,211,153,.45)' }}></span>
                    <span className="ws-ex-txt">Find trending Python repos on GitHub</span>
                    <span className="ws-ex-arr">→</span>
                </button>
                <button className="ws-ex" onClick={() => onSelectPrompt('Find the cheapest flight from Mumbai to Bangalore next Friday')}>
                    <span className="ws-ex-dot" style={{ background: '#818cf8', boxShadow: '0 0 7px rgba(129,140,248,.45)' }}></span>
                    <span className="ws-ex-txt">Cheapest flight Mumbai → Bangalore Friday</span>
                    <span className="ws-ex-arr">→</span>
                </button>
                <button className="ws-ex" onClick={() => onSelectPrompt('Check my inbox and tell me if I have any unread important messages')}>
                    <span className="ws-ex-dot" style={{ background: '#38bdf8', boxShadow: '0 0 7px rgba(56,189,248,.45)' }}></span>
                    <span className="ws-ex-txt">Check inbox for unread important messages</span>
                    <span className="ws-ex-arr">→</span>
                </button>
            </div>
        </div>
    );
};

export default EmptyChat;
