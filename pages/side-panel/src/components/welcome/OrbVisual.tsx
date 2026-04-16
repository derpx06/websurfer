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
        orbGradient: "from-indigo-500/50 via-cyan-400/40 to-white/30",
        orbBorder: "border-white/50",
        orbShadow: "shadow-[0_0_40px_rgba(34,211,238,0.6)]",
        iconColor: "text-white",
        iconShadow: "drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]",
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
        <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Deep Ambient Glows */}
            <div className={`absolute inset-0 ${theme.glowCyan} blur-[80px] rounded-full opacity-60`}></div>
            <div className={`absolute inset-0 ${theme.glowViolet} blur-[60px] rounded-full animate-pulse opacity-40`}></div>

            {/* Outer Rotating Rings */}
            <div className={`absolute inset-0 border ${theme.ringBorder} rounded-full animate-[spin_20s_linear_infinite] opacity-40`}></div>
            <div className={`absolute inset-10 border ${theme.ringBorder} rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-30`}></div>

            {/* Main AI Core Container */}
            <div className={`relative z-20 w-44 h-44 rounded-full p-[1px] bg-gradient-to-br ${theme.coreGradient} ${isDarkMode ? 'shadow-[0_0_70px_rgba(34,211,238,0.25)]' : 'shadow-[0_0_35px_rgba(79,70,229,0.12)]'}`}>
                <div className={`w-full h-full rounded-full ${theme.coreBg} backdrop-blur-3xl flex items-center justify-center overflow-hidden relative ${!isDarkMode ? 'border border-indigo-100/30' : ''}`}>
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
                    <div className="relative z-10 w-24 h-24 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full border ${isDarkMode ? 'border-cyan-400/20 blur-[1px]' : 'border-indigo-600/10 blur-[0.5px]'} animate-[spin_8s_linear_infinite]`}></div>

                        <svg className={`absolute inset-0 w-full h-full ${isDarkMode ? 'opacity-60' : 'opacity-40'} animate-pulse-gentle`} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="50" cy="50" r="40" stroke={`url(#${theme.latticeGradientId})`} strokeDasharray="2 4" strokeWidth="0.5"></circle>
                            <ellipse cx="50" cy="50" rx="40" ry="15" stroke={`url(#${theme.latticeGradientId})`} strokeWidth="0.5" transform="rotate(45 50 50)"></ellipse>
                            <ellipse cx="50" cy="50" rx="40" ry="15" stroke={`url(#${theme.latticeGradientId})`} strokeWidth="0.5" transform="rotate(-45 50 50)"></ellipse>
                        </svg>

                        {/* Central Intelligent Core (Orb) */}
                        <div className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr ${theme.orbGradient} border ${theme.orbBorder} ${theme.orbShadow} backdrop-blur-md flex items-center justify-center overflow-hidden`}>
                            <div className={`${isDarkMode ? 'bg-white/20' : 'bg-indigo-50/50'} absolute inset-0 animate-pulse`}></div>
                            <svg className={`w-6 h-6 ${theme.iconColor} ${theme.iconShadow}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* External Floating Agentic Elements - Compact */}
            <div className={`absolute z-30 w-9 h-9 ${theme.orbBg} backdrop-blur-md border ${theme.orbBorderSmall} rounded-xl flex items-center justify-center shadow-xl animate-orbit`} style={{ animationDelay: '-2s' }}>
                <svg className={`w-4 h-4 ${theme.orbTextCyan}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <div className={`absolute z-30 w-8 h-8 ${theme.orbBg} backdrop-blur-md border ${theme.orbBorderSmall} rounded-full flex items-center justify-center shadow-xl animate-orbit`} style={{ animationDuration: '15s', animationDelay: '-5s' }}>
                <svg className={`w-4 h-4 ${theme.orbTextViolet}`} fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
        </div>
    );
};
