import React from 'react';
import { OrbVisual } from './OrbVisual';
import { t } from '@extension/i18n';

interface BrandingSectionProps {
    isDarkMode: boolean;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({ isDarkMode }) => {
    return (
        <div className="flex flex-col items-center space-y-8" data-purpose="branding">
            <OrbVisual isDarkMode={isDarkMode} />
            <div className="space-y-4">
                <h1 className={`text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${isDarkMode
                        ? "from-white via-slate-200 to-obsidian-accent/60"
                        : "from-slate-900 via-slate-700 to-indigo-600/80"
                    }`} data-purpose="main-headline">
                    {t('welcome_title')}
                </h1>
                <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"} text-lg font-light leading-relaxed text-balance`} data-purpose="description-text">
                    {t('welcome_instruction')}
                </p>
            </div>
        </div>
    );
};

interface ActionSectionProps {
    isDarkMode: boolean;
    onOpenSettings: () => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({ isDarkMode, onOpenSettings }) => {
    return (
        <div className="space-y-8" data-purpose="actions">
            <button
                onClick={onOpenSettings}
                className={`w-full py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] btn-glow shadow-lg ${isDarkMode
                        ? "bg-gradient-to-r from-obsidian-accent to-obsidian-violet text-obsidian shadow-obsidian-accent/20"
                        : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-200"
                    }`} data-purpose="settings-button">
                {t('welcome_openSettings')}
            </button>
            <div className={`flex items-center justify-center space-x-6 text-sm font-semibold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} data-purpose="external-links">
                <a className={`${isDarkMode ? "hover:text-obsidian-accent" : "hover:text-indigo-600"} transition-colors flex items-center`} href="https://github.com/WebSurfer/WebSurfer?tab=readme-ov-file#-quick-start" target="_blank" rel="noopener noreferrer">
                    <span>{t('welcome_quickStart')}</span>
                </a>
            </div>
        </div>
    );
};
