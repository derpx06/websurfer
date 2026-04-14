import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaMicrophone, FaPaperclip } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { t } from '@extension/i18n';
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
    <div className={`relative px-4 pb-3 pt-1 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1117]/80' : 'bg-white/40'} backdrop-blur-3xl`}>
      <form onSubmit={handleSubmit} className="relative group/form">
        <RecordingOverlay isRecording={isRecording} />

        <div className={`flex flex-col rounded-2xl border transition-all duration-500 overflow-hidden ${isDarkMode
          ? 'bg-[#1a1c23]/70 border-white/10 focus-within:border-indigo-500/50 focus-within:bg-[#1a1c23]/90 focus-within:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.1)]'
          : 'bg-white/80 border-gray-100 focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1),0_0_15px_rgba(99,102,241,0.05)] shadow-sm'
          } ${disabled ? 'opacity-60 grayscale-[0.5]' : ''}`}>

          <AttachmentBar attachedFiles={attachedFiles} onRemoveFile={handleRemoveFile} isDarkMode={isDarkMode} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            className={`w-full px-4 py-4 bg-transparent border-0 focus:ring-0 text-[15px] theme-scrollbar font-inter font-medium tracking-tight ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-gray-900 placeholder-gray-400'}`}
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

