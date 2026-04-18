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
        <div className={`group relative transition-all duration-500 ease-in-out ${isExpanded ? 'fixed inset-4 z-50' : 'mx-4 my-2'
            }`}>
            <div className={`
        relative overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-2xl backdrop-blur-md
        ${isExpanded ? 'size-full' : 'h-48 w-full'}
      `}>
                {/* Main Screenshot Display */}
                {screenshot ? (
                    <img
                        src={screenshot.startsWith('data:') ? screenshot : `data:image/jpeg;base64,${screenshot}`}
                        alt="Agent View"
                        className="size-full object-cover transition-opacity duration-500"
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center space-y-2 text-white/40">
                        <HiOutlineViewGrid size={32} className="animate-pulse" />
                        <span className="text-sm font-medium">Waiting for view...</span>
                    </div>
                )}

                {/* Live Indicator Overlay */}
                {isActive && (
                    <div className="absolute left-3 top-3 flex items-center space-x-2 rounded-full border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-sm">
                        <div className="size-2 animate-pulse rounded-full bg-red-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Live Agent Sight</span>
                    </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute right-3 top-3 flex space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-white/20"
                        title={isExpanded ? "Collapse" : "Expand View"}
                    >
                        <HiOutlineExternalLink size={16} />
                    </button>
                </div>

                {/* Glass Edge Highlights */}
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
            </div>

            {/* Backdrop for expanded view */}
            {isExpanded && (
                <button
                    type="button"
                    aria-label="Collapse expanded agent view"
                    className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity ${isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </div>
    );
};
