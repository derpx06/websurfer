import React from 'react';
import { t } from '@extension/i18n';

interface WelcomeScreenProps {
    isDarkMode: boolean;
    onOpenSettings: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isDarkMode, onOpenSettings }) => {
    return isDarkMode ? (
        <div data-purpose="welcome-main-container" className="flex-grow flex flex-col items-center justify-center px-6 relative overflow-hidden bg-obsidian text-slate-50 font-sans selection:bg-obsidian-accent selection:text-obsidian">
            <div className="absolute inset-0 bg-radial-glow-dark opacity-60 pointer-events-none"></div>
            <div className="w-full max-w-md space-y-10 text-center z-10">
                {/* App Brand/Visual Section */}
                <div className="flex flex-col items-center space-y-8" data-purpose="branding">
                    <div className="relative w-72 h-72 flex items-center justify-center">
                        {/* Deep Ambient Glows */}
                        <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full"></div>
                        <div className="absolute inset-0 bg-violet-500/10 blur-[60px] rounded-full animate-pulse"></div>
                        {/* Outer Rotating Rings */}
                        <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_20s_linear_infinite] opacity-30"></div>
                        <div className="absolute inset-8 border border-white/10 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-20"></div>
                        {/* Main AI Core Container */}
                        <div className="relative z-20 w-52 h-52 rounded-full p-[2px] bg-gradient-to-br from-white/20 via-transparent to-white/5 shadow-[0_0_80px_rgba(34,211,238,0.2)]">
                            <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-xl flex items-center justify-center overflow-hidden relative">
                                {/* Internal Neural Mesh/Glow */}
                                <div className="absolute inset-0 opacity-40">
                                    <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                                        <defs>
                                            <radialGradient id="coreGlowDark" cx="50%" cy="50%" fx="50%" fy="50%" r="50%">
                                                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3"></stop>
                                                <stop offset="100%" stopColor="transparent"></stop>
                                            </radialGradient>
                                        </defs>
                                        <circle cx="50" cy="50" fill="url(#coreGlowDark)" r="40"></circle>
                                    </svg>
                                </div>
                                {/* Central High-Fidelity Icon */}
                                <div className="relative z-10">
                                    <div className="relative">
                                        {/* High-Fidelity Agentic Core */}
                                        <div className="relative w-32 h-32 flex items-center justify-center">
                                            {/* Outer Navigation Ring (Lattice) */}
                                            <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-[spin_8s_linear_infinite] blur-[1px]"></div>
                                            <div className="absolute inset-2 rounded-full border border-violet-400/10 animate-[spin_12s_linear_infinite_reverse]"></div>
                                            {/* The Stylized Globe/Lattice */}
                                            <svg className="absolute inset-0 w-full h-full opacity-60 animate-pulse-gentle" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="50" cy="50" r="40" stroke="url(#latticeGradientDark)" strokeDasharray="2 4" strokeWidth="0.5"></circle>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientDark)" strokeWidth="0.5" transform="rotate(45 50 50)"></ellipse>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientDark)" strokeWidth="0.5" transform="rotate(-45 50 50)"></ellipse>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientDark)" strokeWidth="0.5"></ellipse>
                                                <defs>
                                                    <linearGradient id="latticeGradientDark" x1="0%" x2="100%" y1="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5"></stop>
                                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2"></stop>
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            {/* Central Intelligent Core (Orb) */}
                                            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/40 via-violet-500/40 to-white/30 border border-white/40 shadow-[0_0_30px_rgba(34,211,238,0.5)] backdrop-blur-md flex items-center justify-center overflow-hidden">
                                                {/* Internal Pulse */}
                                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                <svg className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                                                </svg>
                                            </div>
                                            {/* Dynamic Data Paths */}
                                            <div className="absolute inset-0">
                                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent rotate-45"></div>
                                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-violet-400/50 to-transparent -rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Floating Data Particles (Simulated) */}
                                <div className="absolute inset-0">
                                    <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                                    <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                                    <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-violet-400 rounded-full blur-[1px]"></div>
                                </div>
                            </div>
                        </div>
                        {/* External Floating Agentic Elements */}
                        {/* Search Orb */}
                        <div className="absolute z-30 w-12 h-12 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-2xl animate-orbit" style={{ animationDelay: '-2s' }}>
                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        {/* Task/Action Orb */}
                        <div className="absolute z-30 w-10 h-10 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-2xl animate-orbit" style={{ animationDuration: '15s', animationDelay: '-5s' }}>
                            <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        {/* Processing Orb */}
                        <div className="absolute z-30 w-14 h-8 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center shadow-2xl animate-orbit" style={{ animationDuration: '12s', animationDelay: '-8s' }}>
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/30 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-obsidian-accent/60" data-purpose="main-headline">
                            {t('welcome_title')}
                        </h1>
                        <p className="text-slate-400 text-lg font-light leading-relaxed text-balance" data-purpose="description-text">
                            {t('welcome_instruction')}
                        </p>
                    </div>
                </div>
                {/* Action Section */}
                <div className="space-y-8" data-purpose="actions">
                    <button
                        onClick={onOpenSettings}
                        className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-obsidian-accent to-obsidian-violet text-obsidian font-bold text-lg transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] btn-glow shadow-lg shadow-obsidian-accent/20" data-purpose="settings-button">
                        {t('welcome_openSettings')}
                    </button>
                    {/* Secondary Links */}
                    <div className="flex items-center justify-center space-x-6 text-sm font-semibold text-slate-500" data-purpose="external-links">
                        <a className="hover:text-obsidian-accent transition-colors flex items-center" href="https://github.com/WebSurfer/WebSurfer?tab=readme-ov-file#-quick-start" target="_blank" rel="noopener noreferrer">
                            <span>{t('welcome_quickStart')}</span>
                        </a>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <a className="hover:text-obsidian-accent transition-colors flex items-center" href="https://discord.gg/NN3ABHggMK" target="_blank" rel="noopener noreferrer">
                            <span>{t('welcome_joinCommunity')}</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <div data-purpose="welcome-main-container" className="flex-grow flex flex-col items-center justify-center px-6 relative overflow-hidden bg-luminous text-slate-600 font-sans selection:bg-luminous-accent selection:text-white">
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-radial-glow-light opacity-100 pointer-events-none"></div>
            <div className="w-full max-w-md space-y-10 text-center z-10">
                {/* App Brand/Visual Section */}
                <div className="flex flex-col items-center space-y-8" data-purpose="branding">
                    <div className="relative w-72 h-72 flex items-center justify-center">
                        {/* Deep Ambient Glows adapted for light mode */}
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full"></div>
                        <div className="absolute inset-0 bg-violet-500/5 blur-[60px] rounded-full animate-pulse"></div>
                        {/* Outer Rotating Rings */}
                        <div className="absolute inset-0 border border-indigo-200/50 rounded-full animate-[spin_20s_linear_infinite] opacity-30"></div>
                        <div className="absolute inset-8 border border-indigo-200/50 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-20"></div>
                        {/* Main AI Core Container */}
                        <div className="relative z-20 w-52 h-52 rounded-full p-[2px] bg-gradient-to-br from-indigo-200 via-transparent to-indigo-50 shadow-[0_0_40px_rgba(79,70,229,0.1)]">
                            <div className="w-full h-full rounded-full bg-white backdrop-blur-xl flex items-center justify-center overflow-hidden relative border border-indigo-100/50">
                                {/* Internal Neural Mesh/Glow */}
                                <div className="absolute inset-0 opacity-20">
                                    <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                                        <defs>
                                            <radialGradient id="coreGlowLight" cx="50%" cy="50%" fx="50%" fy="50%" r="50%">
                                                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3"></stop>
                                                <stop offset="100%" stopColor="transparent"></stop>
                                            </radialGradient>
                                        </defs>
                                        <circle cx="50" cy="50" fill="url(#coreGlowLight)" r="40"></circle>
                                    </svg>
                                </div>
                                {/* Central High-Fidelity Icon */}
                                <div className="relative z-10">
                                    <div className="relative">
                                        {/* High-Fidelity Agentic Core */}
                                        <div className="relative w-32 h-32 flex items-center justify-center">
                                            {/* Outer Navigation Ring (Lattice) */}
                                            <div className="absolute inset-0 rounded-full border border-indigo-600/10 animate-[spin_8s_linear_infinite] blur-[0.5px]"></div>
                                            <div className="absolute inset-2 rounded-full border border-violet-600/5 animate-[spin_12s_linear_infinite_reverse]"></div>
                                            {/* The Stylized Globe/Lattice */}
                                            <svg className="absolute inset-0 w-full h-full opacity-40 animate-pulse-gentle" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="50" cy="50" r="40" stroke="url(#latticeGradientLight)" strokeDasharray="2 4" strokeWidth="0.5"></circle>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientLight)" strokeWidth="0.5" transform="rotate(45 50 50)"></ellipse>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientLight)" strokeWidth="0.5" transform="rotate(-45 50 50)"></ellipse>
                                                <ellipse cx="50" cy="50" rx="40" ry="15" stroke="url(#latticeGradientLight)" strokeWidth="0.5"></ellipse>
                                                <defs>
                                                    <linearGradient id="latticeGradientLight" x1="0%" x2="100%" y1="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.6"></stop>
                                                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3"></stop>
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            {/* Central Intelligent Core (Orb) */}
                                            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-50 via-white to-indigo-100 border border-indigo-200 shadow-[0_0_20px_rgba(79,70,229,0.2)] backdrop-blur-md flex items-center justify-center overflow-hidden">
                                                {/* Internal Pulse */}
                                                <div className="absolute inset-0 bg-indigo-50/50 animate-pulse"></div>
                                                <svg className="w-8 h-8 text-indigo-600 drop-shadow-[0_0_4px_rgba(79,70,229,0.3)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                                                </svg>
                                            </div>
                                            {/* Dynamic Data Paths */}
                                            <div className="absolute inset-0">
                                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-indigo-300/40 to-transparent rotate-45"></div>
                                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-violet-300/40 to-transparent -rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Floating Data Particles (Simulated) */}
                                <div className="absolute inset-0">
                                    <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-indigo-400 rounded-full animate-ping"></div>
                                    <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-indigo-300 rounded-full animate-pulse"></div>
                                    <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-violet-300 rounded-full blur-[0.5px]"></div>
                                </div>
                            </div>
                        </div>
                        {/* External Floating Agentic Elements adapted for light background */}
                        {/* Search Orb */}
                        <div className="absolute z-30 w-12 h-12 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-xl flex items-center justify-center shadow-lg animate-orbit" style={{ animationDelay: '-2s' }}>
                            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        {/* Task/Action Orb */}
                        <div className="absolute z-30 w-10 h-10 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-full flex items-center justify-center shadow-lg animate-orbit" style={{ animationDuration: '15s', animationDelay: '-5s' }}>
                            <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        {/* Processing Orb */}
                        <div className="absolute z-30 w-14 h-8 bg-white/80 backdrop-blur-md border border-indigo-100 rounded-lg flex items-center justify-center shadow-lg animate-orbit" style={{ animationDuration: '12s', animationDelay: '-8s' }}>
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/30 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-slate-900 via-slate-700 to-indigo-600/80" data-purpose="main-headline">
                            {t('welcome_title')}
                        </h1>
                        <p className="text-slate-600 text-lg font-light leading-relaxed text-balance" data-purpose="description-text">
                            {t('welcome_instruction')}
                        </p>
                    </div>
                </div>
                {/* Action Section */}
                <div className="space-y-8" data-purpose="actions">
                    <button
                        onClick={onOpenSettings}
                        className="w-full py-4 px-8 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] btn-glow shadow-md shadow-indigo-200" data-purpose="settings-button">
                        {t('welcome_openSettings')}
                    </button>
                    {/* Secondary Links */}
                    <div className="flex items-center justify-center space-x-6 text-sm font-semibold text-slate-400" data-purpose="external-links">
                        <a className="hover:text-indigo-600 transition-colors flex items-center" href="https://github.com/WebSurfer/WebSurfer?tab=readme-ov-file#-quick-start" target="_blank" rel="noopener noreferrer">
                            <span>{t('welcome_quickStart')}</span>
                        </a>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <a className="hover:text-indigo-600 transition-colors flex items-center" href="https://discord.gg/NN3ABHggMK" target="_blank" rel="noopener noreferrer">
                            <span>{t('welcome_joinCommunity')}</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
