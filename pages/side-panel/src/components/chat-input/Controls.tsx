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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-black transition-all duration-300 uppercase tracking-widest ${isSendButtonDisabled
                ? (isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400')
                : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 active:translate-y-0 group/send'
                }`}>
            <span>Send</span>
            <BsSendFill size={12} className={`transition-all duration-500 ${!isSendButtonDisabled ? 'group-hover/send:translate-x-1 group-hover/send:-translate-y-1' : ''}`} />
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
        <div className="flex items-center justify-center gap-2 mt-2 opacity-60">
            <div className="flex items-center gap-1">
                <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-0.5 rounded border text-[9px] font-black ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-gray-100 text-gray-400'}`}>⌘</span>
                <span className={`flex items-center justify-center h-[18px] px-1.5 rounded border text-[9px] font-black ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-gray-100 text-gray-400'}`}>ENTER</span>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}>automate</span>
        </div>
    );
};
