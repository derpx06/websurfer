import type { Message } from '@extension/storage';
import { Actors } from '@extension/storage';
import { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaCheckCircle, FaChevronDown, FaRobot } from 'react-icons/fa';
import { BsStars, BsCpuFill } from 'react-icons/bs';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
  onOptionSelect?: (text: string) => void;
}

export default memo(function MessageList({ messages, isDarkMode = false, onOptionSelect }: MessageListProps) {
  const cycles: {
    userMessage: Message | null;
    blocks: {
      actor: Actors;
      messages: Message[];
    }[];
  }[] = [];

  type MessageBlock = { actor: Actors; messages: Message[] };
  let currentCycle = { userMessage: null as Message | null, blocks: [] as MessageBlock[] };
  let currentBlock: MessageBlock | null = null;

  messages.forEach((msg) => {
    if (msg.actor === Actors.USER) {
      if (currentBlock) {
        currentCycle.blocks.push(currentBlock);
        currentBlock = null;
      }
      if (currentCycle.userMessage || currentCycle.blocks.length > 0) {
        cycles.push(currentCycle);
      }
      currentCycle = { userMessage: msg, blocks: [] };
    } else {
      if (!currentBlock || currentBlock.actor !== msg.actor) {
        if (currentBlock) currentCycle.blocks.push(currentBlock);
        currentBlock = { actor: msg.actor, messages: [msg] };
      } else {
        currentBlock.messages.push(msg);
      }
    }
  });

  if (currentBlock) currentCycle.blocks.push(currentBlock);
  if (currentCycle.userMessage || currentCycle.blocks.length > 0) {
    cycles.push(currentCycle);
  }

  const renderDateSeparator = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const text = isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="my-6 flex items-center gap-4 opacity-40">
        <div className={`h-px grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {text} • {time}
        </span>
        <div className={`h-px grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6 p-4">
      {cycles.map((cycle, cIdx) => (
        <div key={cIdx} className="animate-in fade-in slide-in-from-bottom-2 flex w-full flex-col duration-500">
          {cycle.userMessage && cIdx === 0 && renderDateSeparator(cycle.userMessage.timestamp)}

          {cycle.userMessage && (
            <div className="mb-6 flex flex-col items-end">
              <div className={`font-inter max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-[14px] font-medium leading-relaxed shadow-sm ${isDarkMode
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                }`}>
                {cycle.userMessage.content}
              </div>
              <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-tighter opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                {formatTimeOnly(cycle.userMessage.timestamp)}
              </span>
            </div>
          )}

          {cycle.blocks.length > 0 && (
            <div className="flex flex-col gap-4">
              {cycle.blocks.map((block, bIdx) => {
                const isLastInCycle = bIdx === cycle.blocks.length - 1;
                const isOverallLastBlock = cIdx === cycles.length - 1 && isLastInCycle;
                const progressIndex = block.messages.findIndex(m => m.content === 'Showing progress...');
                const hasProgress = progressIndex !== -1;
                const isActive = isOverallLastBlock && hasProgress;
                const nextBlockIsSystem = !isLastInCycle && cycle.blocks[bIdx + 1].actor === Actors.SYSTEM;
                const shouldDefaultOpen = isActive || isLastInCycle || nextBlockIsSystem;

                if (block.actor === Actors.SYSTEM) {
                  return (
                    <AnswerRow
                      key={bIdx}
                      messages={block.messages}
                      isDarkMode={isDarkMode}
                    />
                  );
                }

                if (block.actor === Actors.HITL) {
                  return (
                    <HITLBlock
                      key={bIdx}
                      messages={block.messages}
                      isDarkMode={isDarkMode}
                      onOptionSelect={onOptionSelect}
                    />
                  );
                }

                return (
                  <ThinkBlock
                    key={bIdx}
                    actor={block.actor}
                    messages={block.messages}
                    isActive={isActive}
                    defaultOpen={shouldDefaultOpen}
                    isDarkMode={isDarkMode}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

function formatTimeOnly(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AnswerRow({ messages, isDarkMode }: { messages: Message[], isDarkMode: boolean }) {
  const lastMsg = messages[messages.length - 1];
  return (
    <div className="group mb-4 flex gap-3">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110 ${isDarkMode ? 'border border-white/5 bg-[#1a1c23] text-indigo-400' : 'border border-gray-100 bg-white text-indigo-600'}`}>
        <BsStars size={16} />
      </div>
      <div className="flex min-w-0 grow flex-col items-start">
        <div className="flex w-full flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className={`font-regular animate-in fade-in text-[14px] leading-relaxed duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ ...props }) => <ul className="mb-2 ml-4 list-disc" {...props} />,
                ol: ({ ...props }) => <ol className="mb-2 ml-4 list-decimal" {...props} />,
                code: ({ ...props }) => <code className={`rounded px-1 ${isDarkMode ? 'bg-white/5 text-amber-300' : 'bg-gray-100 text-amber-600'}`} {...props} />
              }}>
                {m.content}
              </ReactMarkdown>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          {messages.some(m => m.content.includes('❌') || m.content.toLowerCase().includes('fail') || m.content.includes('⚠️')) ? (
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <FaCheckCircle size={10} className="rotate-45" />
              <span>Failed</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <FaCheckCircle size={10} />
              <span>Completed</span>
            </div>
          )}
          <span className={`text-[10px] font-bold opacity-30 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            {formatTimeOnly(lastMsg.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ThinkBlock({ actor, messages, isActive, defaultOpen, isDarkMode }: { actor: Actors, messages: Message[], isActive: boolean, defaultOpen?: boolean, isDarkMode: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? isActive);

  useEffect(() => {
    if (isActive || defaultOpen) setIsOpen(true);
  }, [isActive, defaultOpen]);

  const toggle = () => setIsOpen(!isOpen);

  const actorName = actor === Actors.PLANNER ? 'Planner' : actor === Actors.NAVIGATOR ? 'Navigator' : actor;
  const isPlanner = actor === Actors.PLANNER;

  const steps = messages.filter(m => m.content !== 'Showing progress...');
  const lastStep = steps[steps.length - 1];
  const summaryText = lastStep ? lastStep.content : 'Thinking...';

  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-300 ${isOpen ? 'shadow-lg' : 'shadow-sm'
      } ${isDarkMode
        ? `border-white/5 bg-white/5 ${isActive ? 'ring-1 ring-indigo-500/30' : ''}`
        : `border-gray-100 bg-gray-50/50 ${isActive ? 'ring-1 ring-indigo-200' : ''}`
      }`}>
      <button
        type="button"
        className={`flex cursor-pointer select-none items-center gap-3 px-3.5 py-3 transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white'}`}
        onClick={toggle}
      >
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${isPlanner
          ? (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
          : (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
          }`}>
          {isPlanner ? <BsCpuFill size={16} /> : <FaRobot size={16} />}
        </div>

        <div className="min-w-0 grow">
          <div className="mb-0.5 flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {actorName}
            </span>
            {isActive && (
              <span className="flex gap-0.5">
                <span className="size-1 animate-bounce rounded-full bg-indigo-500"></span>
                <span className="size-1 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.2s]"></span>
                <span className="size-1 animate-bounce rounded-full bg-indigo-500 [animation-delay:0.4s]"></span>
              </span>
            )}
          </div>
          <p className={`truncate text-[12px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} ${isOpen ? 'opacity-100' : 'opacity-80'}`}>
            {summaryText}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`hidden text-[10px] font-bold sm:inline ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </span>
          <FaChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
        </div>
      </button>

      {isOpen && (
        <div className={`scrollbar-thin max-h-[300px] overflow-y-auto border-t px-4 py-3 ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-white/50'}`}>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const type = (isActive && isLast) ? 'run' : 'done';
              return (
                <div className="group/step animate-in fade-in slide-in-from-left-2 flex gap-3 duration-300" key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-all ${type === 'done'
                      ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                      : 'animate-pulse bg-indigo-500 text-white'
                      }`}>
                      {type === 'done' ? <FaCheckCircle size={10} /> : <div className="size-1.5 rounded-full bg-white"></div>}
                    </div>
                    {!isLast && <div className={`mt-1 h-full w-px ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} />}
                  </div>
                  <div className="grow pb-1">
                    <p className={`text-[13px] font-medium leading-snug ${type === 'run'
                      ? (isDarkMode ? 'text-white' : 'text-indigo-600')
                      : (isDarkMode ? 'text-gray-400' : 'text-gray-600')
                      }`}>
                      {step.content}
                    </p>
                    <span className="mt-1 block text-[10px] font-bold uppercase opacity-30">
                      {formatTimeOnly(step.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HITLBlock({ messages, isDarkMode, onOptionSelect }: { messages: Message[], isDarkMode: boolean, onOptionSelect?: (text: string) => void }) {
  const lastMsg = messages[messages.length - 1];
  let question = lastMsg.content;
  let options: string[] = [];
  let fields: any[] = [];
  let type = 'question';
  let actionType = '';

  try {
    const data = JSON.parse(lastMsg.content);
    if (data.question) {
      question = data.question;
      options = data.options || [];
      fields = data.fields || [];
      type = data.type || 'question';
      actionType = data.actionType || '';
    }
  } catch (e) {
    // Not valid JSON
  }

  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const isConfirmation = type === 'confirmation';

  const handleSelect = (opt: string) => {
    if (dontAskAgain && actionType) {
      const key = `auto_confirm_${actionType}`;
      chrome.storage.local.set({ [key]: true });
    }
    onOptionSelect?.(opt);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responseArr = Object.entries(formData).map(([id, val]) => {
      const field = fields.find(f => f.id === id);
      return `${field?.label || id}: ${val}`;
    });
    onOptionSelect?.(responseArr.join('\n'));
  };

  return (
    <div className={`animate-in fade-in zoom-in-95 my-4 overflow-hidden rounded-2xl border duration-500 shadow-xl ${isDarkMode
      ? 'border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md'
      : 'border-indigo-200 bg-indigo-50/80 backdrop-blur-sm'
      }`}>
      <div className="flex flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-lg ring-1 transition-transform group-hover:scale-110 ${isDarkMode
              ? 'bg-indigo-600 text-white ring-indigo-400'
              : 'bg-indigo-500 text-white ring-indigo-300'
              }`}>
              {isConfirmation ? <FaCheckCircle size={20} /> : <BsStars size={20} className="animate-pulse" />}
            </div>
            <div className="flex flex-col">
              <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {isConfirmation ? 'Action Confirmation' : 'Human Intervention Needed'}
              </span>
              <span className={`text-[10px] font-medium opacity-50 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                {isConfirmation ? 'Please approve this sensitive action' : 'The agent is waiting for your decision'}
              </span>
            </div>
          </div>
        </div>

        <div className={`font-inter text-[15px] font-semibold leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {question}
        </div>

        {fields.length > 0 && (
          <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <label className={`text-[11px] font-bold uppercase tracking-wide opacity-70 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-[13px] font-medium transition-all focus:ring-2 focus:ring-indigo-500 outline-none ${isDarkMode
                        ? 'border-white/10 bg-black/20 text-white'
                        : 'border-indigo-100 bg-white text-gray-900 shadow-sm'
                        }`}
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-[13px] font-medium transition-all focus:ring-2 focus:ring-indigo-500 outline-none ${isDarkMode
                        ? 'border-white/10 bg-black/20 text-white placeholder:text-gray-500'
                        : 'border-indigo-100 bg-white text-gray-900 shadow-sm placeholder:text-gray-400'
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="submit"
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99] ${isDarkMode
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20'
                }`}
            >
              Submit Information
            </button>
          </form>
        )}

        {options.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className={`group relative flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode
                  ? 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                  : 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm border border-indigo-100'
                  }`}
              >
                <div className="absolute inset-0 translate-x-[-1003%] bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
                {opt}
              </button>
            ))}
          </div>
        )}

        {isConfirmation && actionType && (
          <div className="mt-4 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium opacity-70 hover:opacity-100">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="size-3.5 rounded border-indigo-300 bg-white/10 text-indigo-600 focus:ring-indigo-500"
              />
              <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Don't ask for confirmation for this again</span>
            </label>
          </div>
        )}
      </div>

      <div className={`flex items-center justify-between border-t px-4 py-2 text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'border-white/5 bg-white/5 text-indigo-400' : 'border-indigo-100 bg-indigo-50/30 text-indigo-500'
        }`}>
        <div className="flex items-center gap-2">
          <div className="size-1.5 animate-pulse rounded-full bg-indigo-500" />
          <span>Action Required</span>
        </div>
        <span className="opacity-40">{formatTimeOnly(lastMsg.timestamp)}</span>
      </div>
    </div>
  );
}
