import React, { useState, useEffect } from 'react';
import { HiOutlineExternalLink, HiOutlineViewGrid } from 'react-icons/hi';

interface AgentSightProps {
    screenshot: string | null;
    isActive: boolean;
}

/**
 * AgentSight provides a real-time visual feed of the agent's current browser view.
 * It features a glassmorphic frame, smooth cross-fading between screenshots,
 * and a "Live" status indicator to communicate active monitoring.
 */
export const AgentSight: React.FC<AgentSightProps> = ({ screenshot, isActive }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [prevScreenshot, setPrevScreenshot] = useState<string | null>(null);

    // Cross-fade effect logic: swap screenshots with a transition
    useEffect(() => {
        if (screenshot && screenshot !== prevScreenshot) {
            const timer = setTimeout(() => {
                setPrevScreenshot(screenshot);
            }, 300); // Transition delay
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [screenshot, prevScreenshot]);

    if (!screenshot && !isActive) return null;

    return (
        <div className={`relative group transition-all duration-500 ease-in-out ${isExpanded ? 'fixed inset-4 z-50' : 'mx-4 my-2'
            }`}>
            <div className={`
        relative overflow-hidden rounded-xl border border-white/20 bg-black/40 backdrop-blur-md shadow-2xl
        ${isExpanded ? 'w-full h-full' : 'h-48 w-full'}
      `}>
                {/* Main Screenshot Display */}
                {screenshot ? (
                    <img
                        src={screenshot.startsWith('data:') ? screenshot : `data:image/jpeg;base64,${screenshot}`}
                        alt="Agent View"
                        className="w-full h-full object-cover transition-opacity duration-500"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-2">
                        <HiOutlineViewGrid size={32} className="animate-pulse" />
                        <span className="text-sm font-medium">Waiting for view...</span>
                    </div>
                )}

                {/* Live Indicator Overlay */}
                {isActive && (
                    <div className="absolute top-3 left-3 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live Agent Sight</span>
                    </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg border border-white/20 text-white transition-colors"
                        title={isExpanded ? "Collapse" : "Expand View"}
                    >
                        <HiOutlineExternalLink size={16} />
                    </button>
                </div>

                {/* Glass Edge Highlights */}
                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-xl" />
            </div>

            {/* Backdrop for expanded view */}
            {isExpanded && (
                <div
                    className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </div>
    );
};
