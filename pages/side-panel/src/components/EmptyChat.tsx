import React from 'react';

interface EmptyChatProps {
    onSelectPrompt: (text: string) => void;
    isDarkMode: boolean;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectPrompt, isDarkMode }) => {
    return (
        <div className={`relative flex flex-col h-full overflow-y-auto overflow-x-hidden p-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/20`}>

            {/* Background Ambient Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-[10%] -right-[10%] w-[80%] h-[50%] rounded-full blur-[130px] opacity-25 ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-200'}`}></div>
                <div className={`absolute -bottom-[20%] -left-[10%] w-[90%] h-[60%] rounded-full blur-[150px] opacity-15 ${isDarkMode ? 'bg-cyan-600' : 'bg-cyan-200'}`}></div>
            </div>

            <div className="relative z-10 flex flex-col flex-1 pb-4">
                {/* HERO SECTION */}
                <div className="flex flex-col items-center text-center mt-6 mb-8 transition-all duration-700">
                    <div className="relative mb-6 group">

                        {/* Premium Orbital Backdrop - Static & Subtle */}
                        <div className="absolute inset-0 z-0 opacity-5">
                            {/* Primary Orbit */}
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-indigo-500`}></div>
                            {/* Secondary Orbit */}
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-cyan-500`}></div>
                        </div>

                        {/* Glow and Logo Container - High-Fidelity Professional Design */}
                        <div className={`absolute inset-0 rounded-full blur-[60px] scale-125 opacity-20 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'} animate-[pulse_8s_ease-in-out_infinite]`}></div>
                        <div className={`relative flex items-center justify-center w-24 h-24 rounded-full border shadow-[0_0_50px_rgba(99,102,241,0.15)] backdrop-blur-3xl transition-all duration-1000 group-hover:scale-105 ${isDarkMode ? 'bg-[#1e293b]/60 border-white/10 text-indigo-400' : 'bg-white/90 border-indigo-100 text-indigo-600'}`}>
                            <svg className="w-14 h-14 transition-all duration-1000" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Globe Sphere - Sophisticated Precise Look */}
                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
                                <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="0.8" className="opacity-25" />
                                <ellipse cx="32" cy="32" rx="7" ry="22" stroke="currentColor" strokeWidth="1" className="opacity-30" />

                                <circle cx="32" cy="32" r="4.5" fill="currentColor" />
                                <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" className="opacity-40 animate-[spin_60s_linear_infinite]" />

                                {/* Dynamic Intelligence Nodes */}
                                <circle cx="32" cy="4" r="1.5" fill="currentColor" className="animate-pulse" />
                                <circle cx="32" cy="60" r="1.5" fill="currentColor" />
                                <circle cx="4" cy="32" r="1.5" fill="currentColor" />
                                <circle cx="60" cy="32" r="1.5" fill="currentColor" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-[32px] font-[900] tracking-tight mb-3 font-outfit leading-none">
                        Your AI <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400">Browser Agent</span>
                    </h1>
                    <p className={`max-w-[300px] text-[14px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-600'} font-inter`}>
                        I automate your complex web workflows<br />autonomously with precision.
                    </p>
                </div>

                {/* QUICK ACTIONS */}
                <div className="w-full max-w-sm mx-auto mb-6">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Quick Capabilities</h3>
                        <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                className={`group flex flex-col items-start p-5 rounded-[24px] border transition-all duration-300 text-left hover:-translate-y-1.5 ${isDarkMode
                                    ? 'bg-[#1e293b]/40 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 shadow-2xl shadow-black/20'
                                    : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-[0_25px_50px_rgba(0,0,0,0.06)] shadow-sm'
                                    }`}>
                                <div className={`p-2.5 rounded-xl mb-4 transition-transform group-hover:scale-110 duration-300 ${isDarkMode
                                    ? `bg-${action.color}-500/10 text-${action.color}-400`
                                    : `bg-${action.color}-50 text-${action.color}-600`
                                    }`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        {action.icon}
                                    </svg>
                                </div>
                                <div className="text-[15px] font-[800] font-outfit mb-0.5 leading-tight">{action.title}</div>
                                <div className={`text-[11px] font-semibold leading-snug tracking-tight ${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-inter`}>{action.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* EXAMPLES */}
                <div className="w-full max-w-sm mx-auto">
                    <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 pl-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Recommended Workflows</h3>

                    <div className="space-y-3">
                        {[
                            { color: 'amber', label: 'Market Intelligence', text: 'Summarize top Hacker News', prompt: 'Go to Hacker News and summarize the top 5 stories' },
                            { color: 'emerald', label: 'Development', text: 'Trending Python repos on GitHub', prompt: 'Search GitHub for trending Python repos this week and list them' },
                            { color: 'indigo', label: 'Travel Planning', text: 'Cheapest flights to Bangalore', prompt: 'Find the cheapest flight from Mumbai to Bangalore next Friday' },
                            { color: 'sky', label: 'Communication', text: 'Check inbox for unread priority', prompt: 'Check my inbox and tell me if I have any unread important messages' }
                        ].map((example, idx) => (
                            <button
                                key={idx}
                                className={`group w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 ${isDarkMode
                                    ? 'bg-[#1e293b]/30 border-white/5 hover:bg-[#2e3b52] hover:border-indigo-500/40 hover:shadow-xl'
                                    : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-indigo-200 hover:shadow-lg'
                                    }`}
                                onClick={() => onSelectPrompt(example.prompt)}>
                                <div className="flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className={`w-[2.5px] h-3.5 rounded-full bg-${example.color}-500 opacity-60`}></div>
                                        <span className={`text-[10px] font-[800] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{example.label}</span>
                                    </div>
                                    <span className={`text-[14px] font-bold truncate max-w-[240px] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{example.text}</span>
                                </div>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-white text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
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
