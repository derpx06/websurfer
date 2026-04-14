import React from 'react';

interface OrbVisualProps {
    isDarkMode: boolean;
}

export const OrbVisual: React.FC<OrbVisualProps> = ({ isDarkMode }) => {
    const theme = isDarkMode ? {
        glowCyan: "bg-cyan-500/10",
        glowViolet: "bg-violet-500/10",
        ringBorder: "border-white/5",
        coreGradient: "from-white/20 via-transparent to-white/5",
        coreBg: "bg-slate-950/80",
        coreGlowId: "coreGlowDark",
        coreGlowColor: "#22d3ee",
        latticeGradientId: "latticeGradientDark",
        latticeColor1: "#22d3ee",
        latticeColor2: "#8b5cf6",
        orbGradient: "from-cyan-500/40 via-violet-500/40 to-white/30",
        orbBorder: "border-white/40",
        orbShadow: "shadow-[0_0_30px_rgba(34,211,238,0.5)]",
        iconColor: "text-white",
        iconShadow: "drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]",
        dataPathCyan: "via-cyan-400/50",
        dataPathViolet: "via-violet-400/50",
        particleCyan: "bg-cyan-400",
        particleViolet: "bg-violet-400",
        orbBg: "bg-slate-900/60",
        orbBorderSmall: "border-white/10",
        orbTextCyan: "text-cyan-400",
        orbTextViolet: "text-violet-400",
    } : {
        glowCyan: "bg-indigo-500/5",
        glowViolet: "bg-violet-500/5",
        ringBorder: "border-indigo-200/50",
        coreGradient: "from-indigo-200 via-transparent to-indigo-50",
        coreBg: "bg-white",
        coreGlowId: "coreGlowLight",
        coreGlowColor: "#4F46E5",
        latticeGradientId: "latticeGradientLight",
        latticeColor1: "#4F46E5",
        latticeColor2: "#8B5CF6",
        orbGradient: "from-indigo-50 via-white to-indigo-100",
        orbBorder: "border-indigo-200",
        orbShadow: "shadow-[0_0_20px_rgba(79,70,229,0.2)]",
        iconColor: "text-indigo-600",
        iconShadow: "drop-shadow-[0_0_4px_rgba(79,70,229,0.3)]",
        dataPathCyan: "via-indigo-300/40",
        dataPathViolet: "via-violet-300/40",
        particleCyan: "bg-indigo-300",
        particleViolet: "bg-violet-300",
        orbBg: "bg-white/80",
        orbBorderSmall: "border-indigo-100",
        orbTextCyan: "text-indigo-500",
        orbTextViolet: "text-violet-500",
    };

    return (
        <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Deep Ambient Glows */}
            <div className={`absolute inset-0 ${theme.glowCyan} blur-[100px] rounded-full`}></div>
            <div className={`absolute inset-0 ${theme.glowViolet} blur-[60px] rounded-full animate-pulse`}></div>

            {/* Outer Rotating Rings */}
            <div className={`absolute inset-0 border ${theme.ringBorder} rounded-full animate-[spin_20s_linear_infinite] opacity-30`}></div>
            <div className={`absolute inset-8 border ${theme.ringBorder} rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-20`}></div>

            {/* Main AI Core Container */}
            <div className={`relative z-20 w-52 h-52 rounded-full p-[2px] bg-gradient-to-br ${theme.coreGradient} ${isDarkMode ? 'shadow-[0_0_80px_rgba(34,211,238,0.2)]' : 'shadow-[0_0_40px_rgba(79,70,229,0.1)]'}`}>
                <div className={`w-full h-full rounded-full ${theme.coreBg} backdrop-blur-xl flex items-center justify-center overflow-hidden relative ${!isDarkMode ? 'border border-indigo-100/50' : ''}`}>
                    {/* Internal Neural Mesh/Glow */}
                    <div className="absolute inset-0 opacity-40">
                        <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                            <defs>
                                <radialGradient id={theme.coreGlowId} cx="50%" cy="50%" fx="50%" fy="50%" r="50%">
                                    <stop offset="0%" stopColor={theme.coreGlowColor} stopOpacity="0.3"></stop>
                                    <stop offset="100%" stopColor="transparent"></stop>
                                </radialGradient>
                            </defs>
                            <circle cx="50" cy="50" fill={`url(#${theme.coreGlowId})`} r="40"></circle>
                        </svg>
                    </div>

                    {/* Central High-Fidelity Icon */}
                    <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-cyan-400/20 blur-[1px]' : 'border-indigo-600/10 blur-[0.5px]'} animate-[spin_8s_linear_infinite]`}></div>
                        <div className={`absolute inset-2 rounded-full border ${isDarkMode ? 'border-violet-400/10' : 'border-violet-600/5'} animate-[spin_12s_linear_infinite_reverse]`}></div>

                        <svg className={`absolute inset-0 w-full h-full ${isDarkMode ? 'opacity-60' : 'opacity-40'} animate-pulse-gentle`} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="50" cy="50" r="40" stroke={`url(#${theme.latticeGradientId})`} strokeDasharray="2 4" strokeWidth="0.5"></circle>
                            <ellipse cx="50" cy="50" rx="40" ry="15" stroke={`url(#${theme.latticeGradientId})`} strokeWidth="0.5" transform="rotate(45 50 50)"></ellipse>
                            <ellipse cx="50" cy="50" rx="40" ry="15" stroke={`url(#${theme.latticeGradientId})`} strokeWidth="0.5" transform="rotate(-45 50 50)"></ellipse>
                            <ellipse cx="50" cy="50" rx="40" ry="15" stroke={`url(#${theme.latticeGradientId})`} strokeWidth="0.5"></ellipse>
                            <defs>
                                <linearGradient id={theme.latticeGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                                    <stop offset="0%" stopColor={theme.latticeColor1} stopOpacity={isDarkMode ? 0.5 : 0.6}></stop>
                                    <stop offset="100%" stopColor={theme.latticeColor2} stopOpacity={isDarkMode ? 0.2 : 0.3}></stop>
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Central Intelligent Core (Orb) */}
                        <div className={`relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr ${theme.orbGradient} border ${theme.orbBorder} ${theme.orbShadow} backdrop-blur-md flex items-center justify-center overflow-hidden`}>
                            <div className={`${isDarkMode ? 'bg-white/20' : 'bg-indigo-50/50'} absolute inset-0 animate-pulse`}></div>
                            <svg className={`w-8 h-8 ${theme.iconColor} ${theme.iconShadow}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                            </svg>
                        </div>

                        {/* Dynamic Data Paths */}
                        <div className="absolute inset-0">
                            <div className={`absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent ${theme.dataPathCyan} to-transparent rotate-45`}></div>
                            <div className={`absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent ${theme.dataPathViolet} to-transparent -rotate-45`}></div>
                        </div>
                    </div>

                    {/* Floating Data Particles */}
                    <div className="absolute inset-0">
                        <div className={`absolute top-1/4 left-1/4 w-1 h-1 ${isDarkMode ? 'bg-white' : 'bg-indigo-400'} rounded-full animate-ping`}></div>
                        <div className={`absolute bottom-1/3 right-1/4 w-1 h-1 ${theme.particleCyan} rounded-full animate-pulse`}></div>
                        <div className={`absolute top-1/2 right-1/3 w-1.5 h-1.5 ${theme.particleViolet} rounded-full blur-[1px]`}></div>
                    </div>
                </div>
            </div>

            {/* External Floating Agentic Elements */}
            <div className={`absolute z-30 w-12 h-12 ${theme.orbBg} backdrop-blur-md border ${theme.orbBorderSmall} rounded-xl flex items-center justify-center shadow-2xl animate-orbit`} style={{ animationDelay: '-2s' }}>
                <svg className={`w-6 h-6 ${theme.orbTextCyan}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <div className={`absolute z-30 w-10 h-10 ${theme.orbBg} backdrop-blur-md border ${theme.orbBorderSmall} rounded-full flex items-center justify-center shadow-2xl animate-orbit`} style={{ animationDuration: '15s', animationDelay: '-5s' }}>
                <svg className={`w-5 h-5 ${theme.orbTextViolet}`} fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div className={`absolute z-30 w-14 h-8 ${theme.orbBg} backdrop-blur-md border ${theme.orbBorderSmall} rounded-lg flex items-center justify-center shadow-2xl animate-orbit`} style={{ animationDuration: '12s', animationDelay: '-8s' }}>
                <div className="flex space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-cyan-400' : 'bg-indigo-500'} animate-bounce`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-cyan-400/60' : 'bg-indigo-500/60'} animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-cyan-400/30' : 'bg-indigo-500/30'} animate-bounce`} style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        </div>
    );
};
