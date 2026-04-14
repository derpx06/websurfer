import React from 'react';

interface EmptyChatProps {
    onSelectPrompt: (text: string) => void;
    isDarkMode: boolean;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectPrompt, isDarkMode }) => {
    return (
        <div className={`relative flex flex-col h-full overflow-hidden p-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>

            {/* Background Ambient Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-[10%] -right-[10%] w-[80%] h-[50%] rounded-full blur-[130px] opacity-25 ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-200'}`}></div>
                <div className={`absolute -bottom-[20%] -left-[10%] w-[90%] h-[60%] rounded-full blur-[150px] opacity-15 ${isDarkMode ? 'bg-cyan-600' : 'bg-cyan-200'}`}></div>
            </div>

            <div className="relative z-10 flex flex-col flex-1 pb-4">
                {/* HERO SECTION */}
                <div className="flex flex-col items-center text-center mt-2 mb-2">
                    <div className="relative mb-2 group">

                        {/* Premium Orbital Backdrop - Static & Subtle */}
                        <div className="absolute inset-0 z-0 opacity-5">
                            {/* Primary Orbit */}
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-indigo-500`}></div>
                            {/* Secondary Orbit */}
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-cyan-500`}></div>
                        </div>

                        {/* Glow and Logo Container - Static Professional Design */}
                        <div className={`absolute inset-0 rounded-full blur-[40px] scale-110 opacity-10 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-200'}`}></div>
                        <div className={`relative flex items-center justify-center w-20 h-20 rounded-full border shadow-sm backdrop-blur-3xl transition-all duration-500 ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-indigo-400' : 'bg-white border-indigo-100 text-indigo-600'}`}>
                            <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Globe Sphere - Static & Precise */}
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="0.5" className="opacity-15" />
                                <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="0.8" className="opacity-20" />
                                <ellipse cx="32" cy="32" rx="7" ry="22" stroke="currentColor" strokeWidth="1" className="opacity-25" />

                                <circle cx="32" cy="32" r="4.5" fill="currentColor" />
                                <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" className="opacity-30" />

                                {/* Dynamic Intelligence Nodes */}
                                <circle cx="32" cy="4" r="1.5" fill="currentColor" />
                                <circle cx="32" cy="60" r="1.5" fill="currentColor" />
                                <circle cx="4" cy="32" r="1.5" fill="currentColor" />
                                <circle cx="60" cy="32" r="1.5" fill="currentColor" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-[24px] font-[900] tracking-tight mb-1 font-outfit leading-none">
                        Your AI <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400">Browser Agent</span>
                    </h1>
                    <p className={`max-w-[260px] text-[12px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-inter opacity-70`}>
                        I automate your complex web workflows autonomously.
                    </p>
                </div>

                {/* QUICK ACTIONS */}
                <div className="w-full max-w-sm mx-auto mb-6">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Quick Capabilities</h3>
                        <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {[
                            {
                                id: 'sum',
                                title: 'Summarize',
                                desc: 'Insights',
                                icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>,
                                color: 'blue',
                                prompt: 'Search and summarize the latest news about '
                            },
                            {
                                id: 'fill',
                                title: 'Automate',
                                desc: 'Forms',
                                icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
                                color: 'emerald',
                                prompt: 'Fill out the form on this page with '
                            },
                            {
                                id: 'extract',
                                title: 'Scrape',
                                desc: 'Data',
                                icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
                                color: 'violet',
                                prompt: 'Extract all data from the current page and '
                            },
                            {
                                id: 'shot',
                                title: 'Capture',
                                desc: 'Screen',
                                icon: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
                                color: 'amber',
                                prompt: 'Navigate to and take a screenshot of '
                            }
                        ].map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onSelectPrompt(action.prompt)}
                                className={`group flex flex-col items-start p-3 rounded-[18px] border transition-all duration-300 text-left ${isDarkMode
                                    ? 'bg-slate-900/40 border-white/5 hover:bg-slate-800/40 hover:border-indigo-500/20 shadow-xl shadow-black/20'
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-lg shadow-sm'
                                    }`}>
                                <div className={`p-1.5 rounded-lg mb-2 transition-transform group-hover:scale-105 duration-300 ${isDarkMode
                                    ? `bg-${action.color}-500/10 text-${action.color}-400`
                                    : `bg-${action.color}-50 text-${action.color}-600`
                                    }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        {action.icon}
                                    </svg>
                                </div>
                                <div className="text-[13px] font-extrabold font-outfit mb-0.5">{action.title}</div>
                                <div className={`text-[9px] font-semibold leading-snug tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-gray-500'} font-inter`}>{action.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="w-full max-w-sm mx-auto">
                    <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 pl-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Recommended Workflows</h3>

                    <div className="space-y-1.5">
                        {[
                            { color: 'amber', label: 'Market Intelligence', text: 'Summarize top Hacker News', prompt: 'Go to Hacker News and summarize the top 5 stories' },
                            { color: 'emerald', label: 'Development', text: 'Trending Python repos on GitHub', prompt: 'Search GitHub for trending Python repos this week and list them' },
                            { color: 'indigo', label: 'Travel Planning', text: 'Cheapest flights to Bangalore', prompt: 'Find the cheapest flight from Mumbai to Bangalore next Friday' },
                            { color: 'sky', label: 'Communication', text: 'Check inbox for unread priority', prompt: 'Check my inbox and tell me if I have any unread important messages' }
                        ].map((example, idx) => (
                            <button
                                key={idx}
                                className={`group w-full flex items-center justify-between px-3.5 py-2 rounded-xl border transition-all duration-300 ${isDarkMode
                                    ? 'bg-slate-900/30 border-white/5 hover:bg-slate-800/50 hover:border-indigo-500/20'
                                    : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-indigo-100'
                                    }`}
                                onClick={() => onSelectPrompt(example.prompt)}>
                                <div className="flex flex-col items-start gap-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <div className={`w-[2px] h-2.5 rounded-full bg-${example.color}-500 opacity-40`}></div>
                                        <span className={`text-[8.5px] font-[800] uppercase tracking-wider ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`}>{example.label}</span>
                                    </div>
                                    <span className={`text-[12px] font-bold truncate max-w-[240px] ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{example.text}</span>
                                </div>
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-white/5 text-slate-500 group-hover:text-indigo-400' : 'bg-white text-gray-300 group-hover:text-indigo-500'}`}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default EmptyChat;
