import React from 'react';
import { FaPaperclip } from 'react-icons/fa';

interface AttachedFile {
    name: string;
    content: string;
    type: string;
}

interface AttachmentBarProps {
    attachedFiles: AttachedFile[];
    onRemoveFile: (index: number) => void;
    isDarkMode: boolean;
}

export const AttachmentBar: React.FC<AttachmentBarProps> = ({ attachedFiles, onRemoveFile, isDarkMode }) => {
    if (attachedFiles.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-2 px-4 pt-4 pb-1 border-b ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-50 bg-gray-50/30'}`}>
            {attachedFiles.map((file, index) => (
                <div key={index} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-[800] tracking-tight transition-all hover:scale-105 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-white/5' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/50'}`}>
                    <FaPaperclip className="opacity-70" size={10} />
                    <span className="truncate max-w-[140px] uppercase">{file.name}</span>
                    <button type="button" onClick={() => onRemoveFile(index)} className="ml-1 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-black/10">✕</button>
                </div>
            ))}
        </div>
    );
};

interface RecordingOverlayProps {
    isRecording: boolean;
}

export const RecordingOverlay: React.FC<RecordingOverlayProps> = ({ isRecording }) => {
    if (!isRecording) return null;

    return (
        <div className="absolute -inset-x-2 -top-12 h-10 flex items-center justify-center gap-1.5 z-50 pointer-events-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                    key={i}
                    className="w-1 rounded-full bg-red-500 animate-[bounce_1s_ease-in-out_infinite]"
                    style={{
                        height: `${Math.random() * 100 + 20}%`,
                        animationDelay: `${i * 0.1}s`,
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                    }}
                />
            ))}
            <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Recording...</span>
        </div>
    );
};
