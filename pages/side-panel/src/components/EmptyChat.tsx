import React from 'react';
import { OrbVisual } from './welcome/OrbVisual';

interface EmptyChatProps {
    onSelectPrompt: (text: string) => void;
    isDarkMode: boolean;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectPrompt, isDarkMode }) => {
    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Background Studio Lighting */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                <div className={`absolute inset-0 opacity-[0.14] ${isDarkMode
                    ? 'bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.5),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,0.4),transparent_50%)]'
                    : 'bg-[radial-gradient(circle_at_0%_0%,rgba(165,180,252,0.4),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(165,243,252,0.3),transparent_50%)]'
                    }`}></div>
                <div className={`absolute inset-0 ${isDarkMode ? 'opacity-[0.03]' : 'opacity-[0.01]'} bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")]`}></div>
            </div>

            {/* Content Layer - Optimized Precision */}
            <div className={`relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden p-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} scrollbar-none`}>
                <div className="relative z-10 flex flex-col flex-1 pb-16">

                    {/* HERO SECTION - RECALIBRATED */}
                    <div className="flex flex-col items-center text-center mt-6 mb-10 transition-all duration-1000 animate-rise">
                        <div className="mb-6 relative scale-90">
                            <div className={`absolute inset-0 blur-[60px] opacity-25 scale-125 transition-all duration-[2s] group-hover:opacity-40 ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300/30'}`}></div>
                            <div className="relative z-10">
                                <OrbVisual isDarkMode={isDarkMode} />
                            </div>
                        </div>

                        <h1 className="text-[30px] font-black tracking-[-0.04em] mb-2 font-outfit leading-tight drop-shadow-sm">
                            Your AI <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 via-cyan-400 to-indigo-600 animate-shimmer bg-[length:200%_auto]">Browser Agent</span>
                        </h1>
                        <p className={`max-w-[280px] text-[15px] font-medium leading-relaxed tracking-tight ${isDarkMode ? 'text-slate-400/90' : 'text-slate-500'} font-outfit`}>
                            Describe a mission. WebSurfer handles the rest.
                        </p>
                    </div>

                    {/* MISSION TILES - PREMIUM GRID */}
                    <div className="w-full px-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-slate-200/60'}`}></div>
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-indigo-400/80' : 'text-indigo-600/60'}`}>Tactical Intelligence</h3>
                            <div className={`h-[1px] flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-slate-200/60'}`}></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                            {[
                                { title: 'Market Alpha', desc: 'Find SF Series A rounds', prompt: 'Research the latest Series A funding rounds in San Francisco on TechCrunch' },
                                { title: 'Global Search', desc: 'Search web with DuckDuckGo', prompt: 'Search DuckDuckGo for: "Latest advancements in browser-based AI agents"' },
                                { title: 'Hardware Scout', desc: 'Cheapest RTX 4090 deals', prompt: 'Find the cheapest RTX 4090 currently in stock across Amazon, Best Buy, and Newegg' },
                                { title: 'Data Extraction', desc: 'Pricing tables to MD', prompt: 'Extract pricing plans from this page as markdown' },
                                { title: 'Social Audit', desc: 'Export all lead emails', prompt: 'Extract all email addresses and social media profiles found on this page' },
                                { title: 'Fact Checker', desc: 'Verify claims vs PRs', prompt: 'Fact check the technical claims in this article against official press releases' },
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSelectPrompt(item.prompt)}
                                    className={`group/tile relative flex flex-col items-start text-left p-5 rounded-[28px] border transition-all duration-500 hover:-translate-y-1.5 ${isDarkMode
                                        ? 'bg-slate-900/45 border-white/10 hover:bg-slate-900/60 hover:border-indigo-500/40 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.15)] shadow-xl'
                                        : 'bg-indigo-50/50 border-indigo-100/60 hover:bg-white hover:border-indigo-300 hover:shadow-[0_15px_35px_-10px_rgba(99,102,241,0.15)]'
                                        } backdrop-blur-xl`}>
                                    <h4 className={`text-[14.5px] font-black tracking-tight font-outfit mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                                    <p className={`text-[12px] font-semibold tracking-tight leading-[1.6] mb-8 ${isDarkMode ? 'text-slate-300/80 group-hover/tile:text-slate-100' : 'text-slate-600 group-hover/tile:text-slate-700'} transition-colors duration-300`}>
                                        {item.desc}
                                    </p>

                                    <div className={`absolute bottom-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ${isDarkMode
                                        ? 'bg-white/5 text-white/40 group-hover/tile:bg-indigo-500 group-hover/tile:text-white group-hover/tile:shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                        : 'bg-white text-slate-400 group-hover/tile:bg-indigo-500 group-hover/tile:text-white group-hover/tile:shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                                        }`}>
                                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmptyChat;
