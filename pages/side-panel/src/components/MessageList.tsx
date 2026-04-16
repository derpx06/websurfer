import type { Message } from '@extension/storage';
import { Actors } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaCheckCircle, FaChevronDown, FaRobot, FaUser } from 'react-icons/fa';
import { BsStars, BsCpuFill } from 'react-icons/bs';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
}

export default memo(function MessageList({ messages, isDarkMode = false }: MessageListProps) {
  const cycles: {
    userMessage: Message | null;
    blocks: {
      actor: Actors;
      messages: Message[];
    }[];
  }[] = [];

  let currentCycle = { userMessage: null as Message | null, blocks: [] as any[] };
  let currentBlock = null as any;

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
      <div className="flex items-center gap-4 my-6 opacity-40">
        <div className={`h-px flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
        <span className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {text} • {time}
        </span>
        <div className={`h-px flex-grow ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-6 px-4 py-4">
      {cycles.map((cycle, cIdx) => (
        <div key={cIdx} className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
          {cycle.userMessage && cIdx === 0 && renderDateSeparator(cycle.userMessage.timestamp)}

          {cycle.userMessage && (
            <div className="flex flex-col items-end mb-6">
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-none text-[14px] font-medium leading-relaxed font-inter shadow-sm ${isDarkMode
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                }`}>
                {cycle.userMessage.content}
              </div>
              <span className={`text-[10px] font-bold mt-1.5 opacity-40 uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
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
    <div className="flex gap-3 mb-4 group">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-[#1a1c23] border border-white/5 text-indigo-400' : 'bg-white border border-gray-100 text-indigo-600'}`}>
        <BsStars size={16} />
      </div>
      <div className="flex-grow flex flex-col items-start min-w-0">
        <div className="flex flex-col gap-2 w-full">
          {messages.map((m, i) => (
            <div key={i} className={`text-[14px] leading-relaxed font-regular animate-in fade-in duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                code: ({ node, ...props }) => <code className={`px-1 rounded ${isDarkMode ? 'bg-white/5 text-amber-300' : 'bg-gray-100 text-amber-600'}`} {...props} />
              }}>
                {m.content}
              </ReactMarkdown>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-3">
          {messages.some(m => m.content.includes('❌') || m.content.toLowerCase().includes('fail') || m.content.includes('⚠️')) ? (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <FaCheckCircle size={10} className="rotate-45" />
              <span>Failed</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
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
        ? `bg-white/5 border-white/5 ${isActive ? 'ring-1 ring-indigo-500/30' : ''}`
        : `bg-gray-50/50 border-gray-100 ${isActive ? 'ring-1 ring-indigo-200' : ''}`
      }`}>
      <div
        className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white'}`}
        onClick={toggle}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${isPlanner
          ? (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
          : (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
          }`}>
          {isPlanner ? <BsCpuFill size={16} /> : <FaRobot size={16} />}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {actorName}
            </span>
            {isActive && (
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              </span>
            )}
          </div>
          <p className={`text-[12px] font-medium truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} ${isOpen ? 'opacity-100' : 'opacity-80'}`}>
            {summaryText}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold hidden sm:inline ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </span>
          <FaChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`px-4 py-3 border-t max-h-[300px] overflow-y-auto scrollbar-thin ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-white/50'}`}>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const type = (isActive && isLast) ? 'run' : 'done';
              return (
                <div className="flex gap-3 group/step animate-in fade-in slide-in-from-left-2 duration-300" key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${type === 'done'
                      ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                      : 'bg-indigo-500 text-white animate-pulse'
                      }`}>
                      {type === 'done' ? <FaCheckCircle size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    {!isLast && <div className={`w-px h-full mt-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`} />}
                  </div>
                  <div className="flex-grow pb-1">
                    <p className={`text-[13px] leading-snug font-medium ${type === 'run'
                      ? (isDarkMode ? 'text-white' : 'text-indigo-600')
                      : (isDarkMode ? 'text-gray-400' : 'text-gray-600')
                      }`}>
                      {step.content}
                    </p>
                    <span className="text-[10px] font-bold opacity-30 mt-1 block uppercase">
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

