# Critical Change Review (Current Unstaged Diff)

## Scope
This document reviews **all currently changed files** in the working tree and explains:
1. What changed
2. Why it changed
3. Agent-quality impact
4. Risks / tradeoffs

---

## A) Core Agent Execution, Prompts, and Memory

### `chrome-extension/src/background/agent/factory.ts`
- **What changed:** Reduced `any` usage, tightened return/input typing for model constructors, safer Llama response mapping.
- **Why:** Improve type safety around provider-specific payloads and reduce runtime shape ambiguity.
- **Impact:** More predictable model integration and fewer silent mismatches.
- **Risk:** Strict typing can expose previously hidden provider edge cases.

### `chrome-extension/src/background/agent/loopDetector.ts`
- **What changed:** Replaced simple uniqueness check with parsed action signatures, early repeated-scroll detection, same-URL repetition heuristics.
- **Why:** Old loop detection missed realistic stuck patterns.
- **Impact:** Faster escape from non-productive cycles.
- **Risk:** Can trigger false positives on legitimately repetitive workflows.

### `chrome-extension/src/background/agent/messages/service.ts`
- **What changed:** Added long-horizon compaction settings, integrated `LongHorizonMemoryManager`, returned compaction report from `cutMessages`.
- **Why:** Preserve useful history under token pressure without blunt truncation.
- **Impact:** Better continuity across long tasks; lower context loss.
- **Risk:** Summarization quality now matters; bad summaries can mislead downstream steps.

### `chrome-extension/src/background/agent/messages/compaction.ts` (new)
- **What changed:** New structured memory compaction pipeline (summary + hard facts + memory blocks + replacement insertion).
- **Why:** Introduce deterministic/LLM-backed compression for long sessions.
- **Impact:** Long tasks become more stable and token-efficient.
- **Risk:** Hard-fact extraction may over/under-capture depending on message phrasing.

### `chrome-extension/src/background/agent/prompts/base.ts`
- **What changed:** Pending subtasks now only include `pending|running` (exclude `failed`).
- **Why:** Failed tasks were being treated as still actionable.
- **Impact:** Cleaner planning state and less redundant retries.
- **Risk:** If failure recovery is expected later, this may hide failed tasks from immediate context.

### `chrome-extension/src/background/agent/prompts/templates/common.ts`
- **What changed:** Security rules normalized into structured tag block with clearer wording.
- **Why:** Improve prompt parsing consistency and reduce ambiguity.
- **Impact:** Better instruction clarity for adversarial web content.
- **Risk:** Slight behavior shift from reduced verbosity; depends on model adherence.

### `chrome-extension/src/background/agent/prompts/templates/navigator.ts`
- **What changed:** Major rewrite toward direct-execution policy, tool-selection heuristics, action-budget framing, anti-wandering constraints.
- **Why:** Reduce drift and inefficient browse patterns.
- **Impact:** Higher decisiveness and lower step waste.
- **Risk:** Over-constraining can reduce exploratory flexibility on ambiguous tasks.

### `chrome-extension/src/background/agent/prompts/templates/planner.ts`
- **What changed:** Planner prompt rewritten for concise execution-oriented planning and anti-cache-only completion rules.
- **Why:** Planner previously over-decomposed or ended with weak final outputs.
- **Impact:** Better next-step quality and stronger completion criteria.
- **Risk:** Aggressive brevity can under-specify complex multi-branch tasks.

### `chrome-extension/src/background/agent/prompts/templates/verifier.ts` (new)
- **What changed:** Added verifier system prompt contract.
- **Why:** Enable explicit final-answer quality gate.
- **Impact:** Fewer low-quality “done” responses.
- **Risk:** Adds another model pass latency/cost.

### `chrome-extension/src/background/agent/prompts/verifier.ts` (new)
- **What changed:** Added verifier prompt wrapper class.
- **Why:** Integrate verifier prompt in existing prompt architecture.
- **Impact:** Cleaner modularization for verifier agent.
- **Risk:** Minimal (thin adapter).

### `chrome-extension/src/background/agent/agents/verifier.ts` (new)
- **What changed:** Added final-answer verification agent with approve/revise response schema.
- **Why:** Reintroduce evaluator-like final answer validation.
- **Impact:** Higher answer correctness/completeness before final emit.
- **Risk:** If verifier hallucinates revisions, it can degrade factual integrity.

### `chrome-extension/src/background/agent/replay.ts`
- **What changed:** Removed unused `BaseChatModel` import.
- **Why:** Cleanup for lint/type hygiene.
- **Impact:** None functionally.
- **Risk:** None.

### `chrome-extension/src/background/agent/strategies/navigator.ts`
- **What changed:** Type-only import fix; removed `context.nSteps++` side increment.
- **Why:** Prevent duplicate step accounting and improve type hygiene.
- **Impact:** More reliable scheduler/step semantics.
- **Risk:** Any hidden dependency on old increment behavior may surface.

### `chrome-extension/src/background/agent/strategies/planner.ts`
- **What changed:** Type-only import cleanup.
- **Why:** TS lint consistency.
- **Impact:** None functionally.
- **Risk:** None.

### `chrome-extension/src/background/agent/types.ts`
- **What changed:** Defaults tightened (`maxActionsPerStep=4`, `retryDelay=4`, `planningInterval=4`).
- **Why:** Faster loops and lower action fan-out.
- **Impact:** Better precision/latency balance.
- **Risk:** May be too conservative for tasks needing wider per-step exploration.

---

## B) Browser/DOM Interaction Layer

### `chrome-extension/src/background/browser/dom/history/view.ts`
- **What changed:** `toDict` return type changed `any -> unknown`.
- **Why:** Safer typing.
- **Impact:** Better compile-time guardrails.
- **Risk:** None practical.

### `chrome-extension/src/background/browser/dom/views.ts`
- **What changed:** Expanded captured attributes, added possible-action annotations, action/constraint/accessibility helper methods.
- **Why:** Increase semantic context for action selection.
- **Impact:** Better element understanding and action targeting.
- **Risk:** Larger DOM prompt payload may increase token usage.

### `chrome-extension/src/background/browser/page.ts`
- **What changed:** Added sparse-DOM fallback capture with expanded viewport; added bounded `smartScroll`; import/type cleanup.
- **Why:** Address missing-interaction elements and repetitive weak scrolling.
- **Impact:** Better coverage on virtualized/dynamic pages and safer scroll behavior.
- **Risk:** Expanded capture can increase extraction overhead.

### `chrome-extension/src/background/browser/page/interaction.ts`
- **What changed:** Type-only import; replaced `ts-ignore` hidden check with safer optional method typing.
- **Why:** Reduce unsafe assumptions with Puppeteer types.
- **Impact:** More robust element visibility handling.
- **Risk:** Behavior differs where `isHidden()` is unavailable (falls back to false).

---

## C) Task Orchestration and Services

### `chrome-extension/src/background/services/speechToText.ts`
- **What changed:** Replaced naive `toString()` transcript extraction with structured content parsing.
- **Why:** Fix `[object Object]` voice transcription bug.
- **Impact:** Correct STT text appears in input.
- **Risk:** If provider schema changes, parser may need updates.

### `chrome-extension/src/background/task/factory.ts`
- **What changed:** `BrowserContext` import converted to type-only.
- **Why:** TS lint consistency.
- **Impact:** None functionally.
- **Risk:** None.

### `chrome-extension/src/background/task/manager.ts`
- **What changed:** Stronger message typing, safer string coercions, local extracted vars for tab/task IDs, type-only imports.
- **Why:** Reduce runtime type ambiguity from port messages.
- **Impact:** More stable command handling and replay/new-task flows.
- **Risk:** Stricter assumptions may reject malformed payloads previously tolerated.

### `chrome-extension/src/background/task/notifier.ts`
- **What changed:** Type-only `Executor` import.
- **Why:** TS cleanup.
- **Impact:** None functionally.
- **Risk:** None.

---

## D) Storage and Defaults

### `packages/storage/lib/base/types.ts`
- **What changed:** Zod schema type refined from loose `any` to `ZodTypeDef/unknown`.
- **Why:** Improve schema correctness at compile-time.
- **Impact:** Safer storage validation typing.
- **Risk:** Minor typing friction in loose callers.

### `packages/storage/lib/settings/generalSettings.ts`
- **What changed:** Added compaction settings and aligned defaults (`maxActionsPerStep=4`, `planningInterval=4`) with agent defaults.
- **Why:** Expose memory compaction controls and keep config coherent.
- **Impact:** Tunable long-task memory behavior.
- **Risk:** More settings complexity for users.

### `packages/storage/lib/settings/types.ts`
- **What changed:** Gemini/OpenRouter model lists switched to older entries (`2.0/1.5`).
- **Why:** Compatibility/stability decision.
- **Impact:** Potentially improved provider availability in some setups.
- **Risk:** Regresses capability if newer models were intentionally required.

---

## E) Side Panel Runtime Logic and Event Model

### `pages/side-panel/src/types/event.ts`
- **What changed:** Added `MEMORY_COMPACT` execution state.
- **Why:** Surface compaction lifecycle to UI.
- **Impact:** Enables explicit compaction feedback.
- **Risk:** None.

### `pages/side-panel/src/hooks/useAgentEventHandler.ts`
- **What changed:** Handles `MEMORY_COMPACT` events as visible messages.
- **Why:** Inform users when context gets compacted.
- **Impact:** Better transparency/debuggability.
- **Risk:** More system chatter if compaction is frequent.

### `pages/side-panel/src/hooks/useAgentConnection.ts`
- **What changed:** Added typed guards for runtime messages and stronger payload handling.
- **Why:** Prevent incorrect message-shape assumptions.
- **Impact:** Safer port communication and STT result handling.
- **Risk:** Invalid payloads are now less tolerated.

### `pages/side-panel/src/hooks/useChatSession.ts`
- **What changed:** Typed chat session state (`ChatSession[]`) and sorted cast cleanup.
- **Why:** Type safety.
- **Impact:** More reliable session metadata operations.
- **Risk:** Minimal.

### `pages/side-panel/src/hooks/useSidePanelController.ts`
- **What changed:** Removed unused imports/state plumbing.
- **Why:** Cleanup and reduced complexity.
- **Impact:** Leaner controller.
- **Risk:** None unless removed fields were implicitly relied on later.

### `pages/side-panel/src/hooks/useTaskExecution.ts`
- **What changed:** Stronger typing, improved historical-session -> follow-up transition logic, task/session ID handling cleanup.
- **Why:** Avoid wrong task mode/session targeting.
- **Impact:** More reliable task creation/follow-up behavior.
- **Risk:** Mode transitions differ from earlier behavior; edge-case UX may shift.

### `pages/side-panel/src/SidePanel.tsx`
- **What changed:** Added in-panel “Memory Compaction” message strip; passed `isAgentRunning` to message list.
- **Why:** Make compaction and active run state explicit in UI.
- **Impact:** Better observability.
- **Risk:** Additional UI noise.

### `pages/side-panel/src/components/MessageList.tsx`
- **What changed:** Added `isAgentRunning`, upgraded active-thought rendering, type cleanup, accessibility/semantic button fixes.
- **Why:** Improve live-state readability and code robustness.
- **Impact:** Clearer planner/navigator progress trace.
- **Risk:** More animated UI can distract some users.

### `pages/side-panel/src/components/ChatInput.tsx`
- **What changed:** Mention model typed via shared `Tab`, improved mention detection/replacement, safer active mention matching, better nano-tab serialization.
- **Why:** Fix brittle mention parsing and improve @tab reliability.
- **Impact:** Better context injection from referenced tabs.
- **Risk:** Regex-based mention matching can still miss unusual title formats.

### `pages/side-panel/src/components/chat-input/TabMentionsDropdown.tsx`
- **What changed:** Exported `Tab` type, filtered extension/internal tabs, improved filtering and keyboard handling, refreshed dropdown behavior.
- **Why:** Better UX + safer data set.
- **Impact:** More relevant mention options.
- **Risk:** Filtering may hide some tabs users expected.

### `pages/side-panel/src/components/AgentSight.tsx`
- **What changed:** Semantic/accessibility improvements (button backdrop), class cleanup.
- **Why:** A11y and lint hygiene.
- **Impact:** Better keyboard/screen-reader semantics.
- **Risk:** None.

### `pages/side-panel/src/components/ChatHistoryList.tsx`
- **What changed:** Mostly class-order/style refactors.
- **Why:** Formatting consistency.
- **Impact:** No core logic change.
- **Risk:** Low (visual-only drift).

### `pages/side-panel/src/components/EmptyChat.tsx`
- **What changed:** Mostly Tailwind/class normalization.
- **Why:** Consistency.
- **Impact:** Visual-only.
- **Risk:** Low.

### `pages/side-panel/src/components/SidePanelHeader.tsx`
- **What changed:** clickable brand container became semantic `button`; style cleanups.
- **Why:** Accessibility and consistency.
- **Impact:** Better semantics.
- **Risk:** Minor visual/interaction differences.

### `pages/side-panel/src/components/WelcomeScreen.tsx`
- **What changed:** class order/layout normalization.
- **Why:** consistency.
- **Impact:** visual-only.
- **Risk:** low.

### `pages/side-panel/src/components/chat-input/Controls.tsx`
- **What changed:** style/ordering cleanup.
- **Why:** consistency.
- **Impact:** visual-only.
- **Risk:** low.

### `pages/side-panel/src/components/chat-input/Visuals.tsx`
- **What changed:** style/ordering cleanup.
- **Why:** consistency.
- **Impact:** visual-only.
- **Risk:** low.

### `pages/side-panel/src/components/welcome/OrbVisual.tsx`
- **What changed:** style/class normalization.
- **Why:** consistency.
- **Impact:** visual-only.
- **Risk:** low.

### `pages/side-panel/src/components/welcome/Sections.tsx`
- **What changed:** style/class normalization.
- **Why:** consistency.
- **Impact:** visual-only.
- **Risk:** low.

---

## F) Options Page and Settings UI

### `pages/options/src/Options.tsx`
- **What changed:** class normalization/reordering.
- **Why:** formatting consistency.
- **Impact:** visual-only.
- **Risk:** low.

### `pages/options/src/components/AnalyticsSettings.tsx`
- **What changed:** removed unused icons; extensive class/style cleanup; toggle input now has explicit `id` + `aria-label`.
- **Why:** lint/a11y consistency.
- **Impact:** cleaner, more accessible controls.
- **Risk:** low.

### `pages/options/src/components/FirewallSettings.tsx`
- **What changed:** class/style cleanup; semantic toggle improvements with `id` and `aria-label`.
- **Why:** a11y + consistency.
- **Impact:** cleaner UX semantics.
- **Risk:** low.

### `pages/options/src/components/GeneralSettings.tsx`
- **What changed:** class/style cleanup; semantic toggle IDs; **added Memory Compaction settings section** bound to new storage fields.
- **Why:** expose compaction controls and improve options maintainability.
- **Impact:** users can tune long-horizon memory behavior.
- **Risk:** extra settings can overwhelm non-technical users.

### `pages/options/src/components/Layout.tsx`
- **What changed:** semantic `button` for brand click target, import typing fix, style normalization.
- **Why:** a11y + lint cleanup.
- **Impact:** better semantics.
- **Risk:** low.

### `pages/options/src/components/ModelSettings.tsx`
- **What changed:** removed unused code/imports (keyboard handler, azure deployment helpers, stale state), type cleanups, class normalization.
- **Why:** reduce dead code and lint burden.
- **Impact:** leaner component surface.
- **Risk:** If removed helper paths were intended for near-future Azure flows, functionality may now be missing.

---

## G) Docs / Project Notes

### `EXTENSION_UPGRADE_NOTES.md` (new)
- **What changed:** Added comprehensive upgrade narrative covering prompts, defaults, verifier, compaction, loop detection, and architecture rationale.
- **Why:** document strategic direction and expected effects.
- **Impact:** easier review and onboarding for these changes.
- **Risk:** can drift from code if not maintained with future diffs.

---

## Overall Critical Assessment

- **High-value agent-quality improvements:**
  - STT parsing fix (`speechToText.ts`)
  - loop control (`loopDetector.ts`)
  - bounded smart scroll + sparse DOM fallback (`browser/page.ts`)
  - anti-wandering prompt rewrite (`navigator.ts`, `planner.ts`)
  - long-horizon memory compaction (`messages/service.ts`, `messages/compaction.ts`)
  - verifier sub-agent (`agents/verifier.ts` + verifier prompts)

- **Mostly hygiene/UX consistency changes:**
  - large part of `pages/options/**` and `pages/side-panel/components/**`
  - these improve maintainability and accessibility, but do **not** materially change core agent intelligence.

- **Biggest tradeoff introduced:**
  - added complexity (verifier + compaction + richer prompt policy) improves quality but increases tuning surface and failure modes if summaries/prompts drift.
