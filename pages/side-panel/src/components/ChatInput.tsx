import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaMicrophone, FaRegStopCircle, FaPaperclip, FaChevronRight } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { BsArrowRepeat, BsSendFill } from 'react-icons/bs';
import { t } from '@extension/i18n';

interface ChatInputProps {
  onSendMessage: (text: string, displayText?: string) => void;
  onStopTask: () => void;
  onMicClick?: () => void;
  isRecording?: boolean;
  isProcessingSpeech?: boolean;
  disabled: boolean;
  showStopButton: boolean;
  setContent?: (setter: (text: string) => void) => void;
  isDarkMode?: boolean;
  historicalSessionId?: string | null;
  onReplay?: (sessionId: string) => void;
}

interface AttachedFile {
  name: string;
  content: string;
  type: string;
}

export default function ChatInput({
  onSendMessage,
  onStopTask,
  onMicClick,
  isRecording = false,
  isProcessingSpeech = false,
  disabled,
  showStopButton,
  setContent,
  isDarkMode = false,
  historicalSessionId,
  onReplay,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const isSendButtonDisabled = useMemo(
    () => disabled || (text.trim() === '' && attachedFiles.length === 0),
    [disabled, text, attachedFiles],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Max height for approximately 4-5 lines of text
      const maxHeight = 120;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;

      // Toggle scrollbar visibility
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Use requestAnimationFrame to ensure the DOM has updated before measuring
    requestAnimationFrame(adjustTextareaHeight);
  };

  useEffect(() => {
    if (setContent) setContent(setText);
  }, [setContent]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedText = text.trim();

      if (trimmedText || attachedFiles.length > 0) {
        let messageContent = trimmedText;
        let displayContent = trimmedText;

        if (attachedFiles.length > 0) {
          const fileContents = attachedFiles
            .map(file => `\n\n<nano_file_content type="file" name="${file.name}">\n${file.content}\n</nano_file_content>`)
            .join('\n');

          messageContent = trimmedText
            ? `${trimmedText}\n\n<nano_attached_files>${fileContents}</nano_attached_files>`
            : `<nano_attached_files>${fileContents}</nano_attached_files>`;

          const fileList = attachedFiles.map(file => `📎 ${file.name}`).join('\n');
          displayContent = trimmedText ? `${trimmedText}\n\n${fileList}` : fileList;
        }

        onSendMessage(messageContent, displayContent);
        setText('');
        setAttachedFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    },
    [text, attachedFiles, onSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const handleReplay = useCallback(() => {
    if (historicalSessionId && onReplay) onReplay(historicalSessionId);
  }, [historicalSessionId, onReplay]);

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1024 * 1024) continue;
      try {
        const content = await file.text();
        newFiles.push({ name: file.name, content, type: file.type || 'text/plain' });
      } catch (err) { console.error(err); }
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRemoveFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

  return (
    <div className={`relative px-4 pb-3 pt-1 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1117]/80' : 'bg-white/40'} backdrop-blur-3xl`}>
      <form onSubmit={handleSubmit} className="relative group/form">

        {/* Recording Overlay Visualizer */}
        {isRecording && (
          <div className="absolute -inset-x-2 -top-12 h-10 flex items-center justify-center gap-1.5 z-50 pointer-events-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className={`w-1 rounded-full bg-red-500 animate-[bounce_1s_ease-in-out_infinite]`}
                style={{
                  height: `${Math.random() * 100 + 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                }}
              />
            ))}
            <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Recording...</span>
          </div>
        )}

        {/* Input Wrapper with High-End Glassmorphism */}
        <div className={`flex flex-col rounded-2xl border transition-all duration-500 overflow-hidden ${isDarkMode
          ? 'bg-[#1a1c23]/70 border-white/10 focus-within:border-indigo-500/50 focus-within:bg-[#1a1c23]/90 focus-within:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.1)]'
          : 'bg-white/80 border-gray-100 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),0_0_15px_rgba(99,102,241,0.05)] shadow-sm'
          } ${disabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>

          {/* File attachment strip */}
          {attachedFiles.length > 0 && (
            <div className={`flex flex-wrap gap-2 px-4 pt-4 pb-1 border-b ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-50 bg-gray-50/30'}`}>
              {attachedFiles.map((file, index) => (
                <div key={index} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-[800] tracking-tight transition-all hover:scale-105 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-white/5' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/50'}`}>
                  <FaPaperclip className="opacity-70" size={10} />
                  <span className="truncate max-w-[140px] uppercase">{file.name}</span>
                  <button type="button" onClick={() => handleRemoveFile(index)} className="ml-1 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-black/10">✕</button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            className={`w-full px-4 py-4 bg-transparent border-0 focus:ring-0 text-[15px] leading-[1.6] resize-none overflow-hidden scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent font-inter font-medium tracking-tight ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
            placeholder={attachedFiles.length > 0 ? 'Add a message...' : t('chat_input_placeholder')}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleFileSelect}
                disabled={disabled}
                className={`p-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900 shadow-sm hover:shadow'}`}
                title="Attach files">
                <FaPaperclip size={16} />
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />

              {onMicClick && (
                <div className="relative group/mic">
                  {isRecording && (
                    <div className="absolute inset-0 rounded-2xl bg-red-500/20 animate-ping"></div>
                  )}
                  <button
                    type="button"
                    onClick={onMicClick}
                    disabled={disabled || isProcessingSpeech}
                    className={`relative p-3 rounded-2xl transition-all duration-500 z-10 ${isRecording
                      ? 'text-white bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white hover:shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900 shadow-sm hover:shadow'
                      }`}>
                    {isProcessingSpeech ?
                      <AiOutlineLoading3Quarters size={16} className="animate-spin" /> :
                      <FaMicrophone size={16} className={isRecording ? 'scale-110 drop-shadow-md' : 'transition-transform group-hover/mic:scale-110'} />
                    }
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {showStopButton ? (
                <button
                  type="button"
                  onClick={onStopTask}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-[13px] font-black shadow-lg transition-all active:scale-95 group/stop">
                  <span className="tracking-tight uppercase">Stop</span>
                  <FaRegStopCircle size={14} className="group-hover/stop:rotate-90 transition-transform duration-300" />
                </button>
              ) : historicalSessionId ? (
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
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* Ultra-Minimal Persistent Shortcut Hint */}
        {!disabled && (
          <div className="flex items-center justify-center gap-2 mt-2 opacity-60">
            <div className="flex items-center gap-1">
              <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-0.5 rounded border text-[9px] font-black ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-gray-100 text-gray-400'}`}>⌘</span>
              <span className={`flex items-center justify-center h-[18px] px-1.5 rounded border text-[9px] font-black ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-white border-gray-100 text-gray-400'}`}>ENTER</span>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}>automate</span>
          </div>
        )}
      </form>
    </div>
  );
}

