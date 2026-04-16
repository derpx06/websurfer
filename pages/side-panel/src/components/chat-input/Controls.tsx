import React from 'react';
import { FaRegStopCircle } from 'react-icons/fa';
import { BsArrowRepeat, BsSendFill } from 'react-icons/bs';

interface ChatActionButtonsProps {
    showStopButton: boolean;
    onStopTask: () => void;
    historicalSessionId?: string | null;
    handleReplay: () => void;
    isSendButtonDisabled: boolean;
    isDarkMode: boolean;
}

export const ChatActionButtons: React.FC<ChatActionButtonsProps> = ({
    showStopButton,
    onStopTask,
    historicalSessionId,
    handleReplay,
    isSendButtonDisabled,
    isDarkMode
}) => {
    if (showStopButton) {
        return (
            <button
                type="button"
                onClick={onStopTask}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-[13px] font-black shadow-lg transition-all active:scale-95 group/stop">
                <span className="tracking-tight uppercase">Stop</span>
                <FaRegStopCircle size={14} className="group-hover/stop:rotate-90 transition-transform duration-300" />
            </button>
        );
    }

    if (historicalSessionId) {
        return (
            <button
                type="button"
                onClick={handleReplay}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-black shadow-lg transition-all active:scale-95 group/replay ${isDarkMode
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-500/10'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}>
                <span className="tracking-tight uppercase">Replay</span>
                <BsArrowRepeat size={16} className="group-hover/replay:rotate-180 transition-transform duration-500" />
            </button>
        );
    }

    return (
        <button
            type="submit"
            disabled={isSendButtonDisabled}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[13px] font-black transition-all duration-500 uppercase tracking-widest shadow-2xl relative overflow-hidden group/send ${isSendButtonDisabled
                ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-400')
                : 'bg-gradient-to-br from-cyan-500 via-indigo-500 to-indigo-600 text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                }`}
            style={{ fontFamily: "'Outfit', sans-serif" }}>
            <span className="relative z-10 transition-colors duration-300">Send</span>
            <BsSendFill
                size={14}
                className={`relative z-10 transition-all duration-500 ${!isSendButtonDisabled ? 'group-hover/send:translate-x-1 group-hover/send:-translate-y-1 group-hover/send:scale-110' : ''}`}
            />
            {!isSendButtonDisabled && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/send:translate-x-full transition-transform duration-1000" />
            )}
        </button>
    );
};

interface ShortcutHintProps {
    isDarkMode: boolean;
    disabled: boolean;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({ isDarkMode, disabled }) => {
    if (disabled) return null;

    return (
        <div className="flex items-center justify-center gap-3 mt-4 opacity-70 hover:opacity-100 transition-opacity duration-500">
            <div className="flex items-center gap-1.5 grayscale-0 opacity-100 transition-all duration-500">
                <span className={`flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-md border text-[10px] font-black font-mono shadow-sm ${isDarkMode ? 'bg-white/10 border-white/20 text-slate-300' : 'bg-white border-slate-300 text-slate-600'}`}>⌘</span>
                <span className={`flex items-center justify-center h-[20px] px-2 rounded-md border text-[10px] font-black font-mono shadow-sm ${isDarkMode ? 'bg-white/10 border-white/20 text-slate-300' : 'bg-white border-slate-300 text-slate-600'}`}>ENTER</span>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] font-outfit ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>navigate & automate</span>
        </div>
    );
};
