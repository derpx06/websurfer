import React from 'react';
import { BrandingSection, ActionSection } from './welcome/Sections';

interface WelcomeScreenProps {
    isDarkMode: boolean;
    onOpenSettings: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isDarkMode, onOpenSettings }) => {
    return (
        <div
            data-purpose="welcome-main-container"
            className={`relative flex grow flex-col items-center justify-center overflow-hidden px-6 font-sans ${isDarkMode
                    ? "bg-obsidian text-slate-50 selection:bg-obsidian-accent selection:text-obsidian"
                    : "bg-luminous text-slate-600 selection:bg-luminous-accent selection:text-white"
                }`}
        >
            {/* Background Glow Effect */}
            <div className={`pointer-events-none absolute inset-0 ${isDarkMode ? "bg-radial-glow-dark opacity-60" : "bg-radial-glow-light opacity-100"
                }`}></div>

            <div className="z-10 w-full max-w-md space-y-10 text-center">
                <BrandingSection isDarkMode={isDarkMode} />
                <ActionSection isDarkMode={isDarkMode} onOpenSettings={onOpenSettings} />
            </div>
        </div>
    );
};

export default WelcomeScreen;
