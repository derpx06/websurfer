import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaMicrophone, FaPaperclip } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { AttachmentBar, RecordingOverlay } from './chat-input/Visuals';
import { ChatActionButtons, ShortcutHint } from './chat-input/Controls';

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
      const maxHeight = 120;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
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
    <div className="relative px-2 pb-1 pt-0 transition-all duration-500">
      <form onSubmit={handleSubmit} className="relative group/form">
        <RecordingOverlay isRecording={isRecording} />

        <div className={`flex flex-col rounded-[2rem] border transition-all duration-500 overflow-hidden ${isDarkMode
          ? 'bg-slate-900/45 border-white/15 shadow-[0_24px_45px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl focus-within:border-cyan-400/45 focus-within:bg-slate-900/55 focus-within:shadow-[0_25px_55px_-20px_rgba(0,0,0,0.9),0_0_25px_rgba(56,189,248,0.2)]'
          : 'bg-white/55 border-slate-200/70 backdrop-blur-2xl shadow-[0_20px_40px_-20px_rgba(15,23,42,0.35)] focus-within:border-indigo-400/70 focus-within:bg-white/70 focus-within:shadow-[0_24px_50px_-18px_rgba(15,23,42,0.32),0_0_20px_rgba(99,102,241,0.15)]'
          } ${disabled ? 'opacity-50 grayscale' : ''}`}>

          <AttachmentBar attachedFiles={attachedFiles} onRemoveFile={handleRemoveFile} isDarkMode={isDarkMode} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            className={`w-full px-5 py-5 bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none text-[15px] theme-scrollbar font-inter font-medium tracking-tight resize-none leading-relaxed transform transition-all duration-300 ${isDarkMode ? 'text-white placeholder-slate-400/80' : 'text-slate-900 placeholder-slate-500'}`}
            placeholder={attachedFiles.length > 0 ? 'Add a message...' : "Unleash your agent. What's the mission today?"}
          />

          <div className={`h-[1px] w-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

          <div className="flex items-center justify-between px-3 py-3.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleFileSelect}
                disabled={disabled}
                className={`p-2.5 rounded-xl transition-all duration-300 ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-cyan-400 active:scale-90' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 active:scale-90'}`}
                title="Attach files">
                <FaPaperclip size={13} />
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
                    className={`relative p-2.5 rounded-xl transition-all duration-500 z-10 ${isRecording
                      ? 'text-white bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110'
                      : isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-violet-400 active:scale-90' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 active:scale-90'
                      }`}>
                    {isProcessingSpeech ?
                      <AiOutlineLoading3Quarters size={13} className="animate-spin" /> :
                      <FaMicrophone size={13} className={isRecording ? 'scale-110 drop-shadow-md' : 'transition-transform group-hover/mic:scale-110'} />
                    }
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <ChatActionButtons
                showStopButton={showStopButton}
                onStopTask={onStopTask}
                historicalSessionId={historicalSessionId}
                handleReplay={handleReplay}
                isSendButtonDisabled={isSendButtonDisabled}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </div>

        <ShortcutHint isDarkMode={isDarkMode} disabled={disabled} />
      </form>
    </div>
  );
}
