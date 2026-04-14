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
            className={`flex-grow flex flex-col items-center justify-center px-6 relative overflow-hidden font-sans ${isDarkMode
                    ? "bg-obsidian text-slate-50 selection:bg-obsidian-accent selection:text-obsidian"
                    : "bg-luminous text-slate-600 selection:bg-luminous-accent selection:text-white"
                }`}
        >
            {/* Background Glow Effect */}
            <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? "bg-radial-glow-dark opacity-60" : "bg-radial-glow-light opacity-100"
                }`}></div>

            <div className="w-full max-w-md space-y-10 text-center z-10">
                <BrandingSection isDarkMode={isDarkMode} />
                <ActionSection isDarkMode={isDarkMode} onOpenSettings={onOpenSettings} />
            </div>
        </div>
    );
};

export default WelcomeScreen;
