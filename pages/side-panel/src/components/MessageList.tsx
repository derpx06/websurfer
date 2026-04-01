import type { Message } from '@extension/storage';
import { Actors } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
}

export default memo(function MessageList({ messages, isDarkMode = false }: MessageListProps) {
  // Group into cycles
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

  // Format date grouping helper
  const renderDateSeparator = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    let text = isToday ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="date-sep"><span>{text} · {time}</span></div>
    );
  };

  return (
    <>
      {cycles.map((cycle, cIdx) => (
        <div key={cIdx} className="w-full">
          {cycle.userMessage && cIdx === 0 && renderDateSeparator(cycle.userMessage.timestamp)}

          {cycle.userMessage && (
            <>
              <div className="msg-user">
                <div className="bub font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>{cycle.userMessage.content}</div>
              </div>
              <div className="ts font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>{formatTimeOnly(cycle.userMessage.timestamp)}</div>
            </>
          )}

          {cycle.blocks.length > 0 && (
            <div className="cycle-group">
              {cycle.blocks.map((block, bIdx) => {
                // If it is SYSTEM, render as answer row. Otherwise ThinkBlock
                if (block.actor === Actors.SYSTEM) {
                  return (
                    <AnswerRow
                      key={bIdx}
                      messages={block.messages}
                      isDarkMode={isDarkMode}
                    />
                  );
                }

                // If it's the very last block of the current cycle, and it's PLANNER, and it doesn't end with progress, 
                // we might want to extract the last non-progress message as the "AnswerRow" IF it looks like a final answer.
                // However, without strict schemas, we will render it natively as a think block, 
                // EXCEPT if the last message is what the user reads.
                // For safety, let's look for a concluding answer format.
                const isLastBlockInCycle = bIdx === cycle.blocks.length - 1;
                const progressIndex = block.messages.findIndex(m => m.content === 'Showing progress...');
                const hasProgress = progressIndex !== -1;

                // Identify if this block is currently active (last block in the entire array and has progress)
                const isLastInCycle = bIdx === cycle.blocks.length - 1;
                // Identify if this block is currently active (last block in the entire array and has progress)
                const isOverallLastBlock = cIdx === cycles.length - 1 && isLastInCycle;
                const isActive = isOverallLastBlock && hasProgress;

                // If the next block in this cycle is SYSTEM, then this is the "last step" of the plan
                const nextBlockIsSystem = !isLastInCycle && cycle.blocks[bIdx + 1].actor === Actors.SYSTEM;
                const shouldDefaultOpen = isActive || isLastInCycle || nextBlockIsSystem;

                return (
                  <ThinkBlock
                    key={bIdx}
                    actor={block.actor}
                    messages={block.messages}
                    isActive={isActive}
                    defaultOpen={shouldDefaultOpen}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
});

function formatTimeOnly(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AnswerRow({ messages, isDarkMode }: { messages: Message[], isDarkMode: boolean }) {
  const lastMsg = messages[messages.length - 1];
  return (
    <div className="ans-row">
      <div className="ans-av">
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 2c-2.5 3-4 6.4-4 10s1.5 7 4 10M12 2c2.5 3 4 6.4 4 10s-1.5 7-4 10" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
      </div>
      <div className="ans-body">
        {messages.map((m, i) => (
          <div key={i} className="ans-bub mb-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m.content}
            </ReactMarkdown>
          </div>
        ))}
        <div className="ans-foot">
          <span className="ans-check"><svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>Done</span>
          <span className="ans-time">{formatTimeOnly(lastMsg.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function ThinkBlock({ actor, messages, isActive, defaultOpen }: { actor: Actors, messages: Message[], isActive: boolean, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? isActive);

  // Also auto-open if it becomes active or defaultOpen changes
  useEffect(() => {
    if (isActive || defaultOpen) setIsOpen(true);
  }, [isActive, defaultOpen]);

  const toggle = () => setIsOpen(!isOpen);

  const actorName = actor === Actors.PLANNER ? 'Planner' : actor === Actors.NAVIGATOR ? 'Navigator' : actor;
  const actorClass = actor === Actors.PLANNER ? 'planner' : 'navigator';

  // Filter out progress messages for counts
  const steps = messages.filter(m => m.content !== 'Showing progress...');
  const hasProgress = messages.some(m => m.content === 'Showing progress...');

  // Summary text is the last real step
  const lastStep = steps[steps.length - 1];
  const summaryText = lastStep ? lastStep.content : 'Thinking...';

  return (
    <div className={`tb ${actorClass} ${isActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}>
      <div className="tb-head" onClick={toggle}>
        <div className="pill">
          <div className={`pill-dot ${isActive ? 'pulse' : ''}`}></div>
          <span className="pill-name font-outfit" style={{ fontFamily: "'Outfit', sans-serif" }}>{actorName}</span>
        </div>
        <span className="tb-sum font-inter" style={{ fontFamily: "'Inter', sans-serif" }}>{summaryText}</span>
        <div className="tb-meta">
          {isActive ? (
            <div className="sdots"><div className="sd"></div><div className="sd"></div><div className="sd"></div></div>
          ) : (
            <span className="tb-steps">{steps.length} steps</span>
          )}
        </div>
        <div className="tb-chev">
          <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>
      <div className="tb-body">
        <div className="tb-scroll">
          {steps.map((step, i) => {
            // If isActive and this is the last step, mark it as 'cur' and 'run'
            const isLast = i === steps.length - 1;
            const type = (isActive && isLast) ? 'run' : 'done';
            return (
              <div className="step" key={i}>
                <div className={`step-ico ${type}`}>
                  {type === 'done' ? (
                    <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  )}
                </div>
                <div className={`step-txt ${type === 'run' ? 'cur' : ''}`}>
                  {step.content}
                  {type === 'run' && <span className="bc"></span>}
                </div>
                <div className="step-t">{formatTimeOnly(step.timestamp)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
