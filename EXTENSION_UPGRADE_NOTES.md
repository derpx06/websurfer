`# WebGenie Extension Upgrade Notes

## Goal
Improve agent effectiveness by making execution more direct, more precise, and faster without reducing capability.

## What Was Upgraded

### 1. Stronger Direct-Execution Prompt Policy
Files:
- `chrome-extension/src/background/agent/prompts/templates/navigator.ts`
- `chrome-extension/src/background/agent/prompts/templates/planner.ts`

Changes:
- Rewrote navigator policy to prioritize decisive, high-confidence actions.
- Explicit anti-wandering behavior:
  - avoid broad browsing when direct path exists
  - pivot after repeated failed strategy
  - prefer smallest high-information action when uncertain
- Added action-budget section to navigator prompt with strict per-step limit guidance.
- Rewrote planner policy to avoid over-decomposition and produce concise, execution-ready next steps.
- Planner now prefers 1-2 direct next steps unless absolutely necessary.

Expected impact:
- Less "running around" behavior
- Faster convergence to task-completing actions
- Better consistency between planner and navigator

### 2. Runtime Hard Cap for Action Count per Step
File:
- `chrome-extension/src/background/agent/agents/navigator.ts`

Changes:
- Added hard runtime trimming of model-proposed actions to `maxActionsPerStep`.
- This enforces budget even if the model over-outputs actions.

Expected impact:
- Lower step bloat
- Fewer wasteful or speculative actions
- Better latency per loop

### 3. Early Stop When Task Is Done Inside a Multi-Action Step
File:
- `chrome-extension/src/background/agent/agents/navigator.ts`

Changes:
- If an action result indicates `isDone`, remaining actions in that same step are skipped.

Expected impact:
- Immediate completion behavior
- Avoids post-done unnecessary interactions

### 4. Better Default Execution Settings
Files:
- `chrome-extension/src/background/agent/types.ts`
- `packages/storage/lib/settings/generalSettings.ts`

Changes:
- `maxActionsPerStep`: reduced to `4`
- `planningInterval`: changed to `4`
- `retryDelay` default in agent options: reduced to `4`

Why:
- Lower action fan-out improves precision and reduces side effects.
- Slightly less frequent planner calls reduce overhead while preserving strategic guidance.
- Shorter retry delay improves recovery speed.

Expected impact:
- Faster wall-clock execution
- Better precision under noisy pages
- Lower tendency to overcomplicate per-step behavior

## Important Compatibility Note
`NavigatorPrompt` was already formatting `{{max_actions}}`, but the template did not use it.
This mismatch is now fixed by adding `{{max_actions}}` directly to the navigator template.

## Tuning Knobs (if you want even more aggressive behavior)
1. Lower `maxActionsPerStep` to `3` for highly precise tasks.
2. Raise `planningInterval` to `5` for long repetitive flows where planner overhead is costly.
3. Keep `useVision=true` only when needed; otherwise leave off for speed.

## Files Changed (Summary)
- `chrome-extension/src/background/agent/prompts/templates/navigator.ts`
- `chrome-extension/src/background/agent/prompts/templates/planner.ts`
- `chrome-extension/src/background/agent/agents/navigator.ts`
- `chrome-extension/src/background/agent/types.ts`
- `packages/storage/lib/settings/generalSettings.ts`

## Validation Checklist
- Build succeeds (`pnpm build`)
- Side panel can start/cancel/resume tasks
- Navigator action logs show trimming when model proposes too many actions
- Multi-action steps stop immediately when `done` is triggered

## v2 Core Intelligence Upgrades

### 5. Adaptive Planning Scheduler
File:
- `chrome-extension/src/background/agent/executor.ts`

Changes:
- Replaced rigid modulo-only planning trigger with adaptive scheduling.
- Planner now runs based on signal quality:
  - immediate run on step 0
  - immediate run on loop detection, navigator done, or failure pressure
  - dynamic interval expands when progress is strong and tightens when progress is weak
- Tracks `lastPlanningStep` to keep cadence stable.

Expected impact:
- Lower planner overhead when execution is flowing
- Faster recovery when execution quality degrades
- Better balance between strategy and action speed

### 6. Step Accounting Cleanup
File:
- `chrome-extension/src/background/agent/strategies/navigator.ts`

Changes:
- Removed internal `context.nSteps++` from navigator strategy.
- Executor loop is now the single source of truth for step indexing.

Expected impact:
- More predictable planner cadence
- Cleaner step telemetry and debugging

### 7. Reliable Loop Detection Based on Parsed Actions
File:
- `chrome-extension/src/background/agent/loopDetector.ts`

Changes:
- Rebuilt loop detector to parse stringified `modelOutput` safely.
- Detects low-diversity repetitive signatures and same URL + action repeats.

Expected impact:
- Fewer silent infinite loops
- Earlier planner intervention on repetitive behavior

### 8. In-Step Duplicate Action Suppression
File:
- `chrome-extension/src/background/agent/agents/navigator.ts`

Changes:
- Removes consecutive duplicate actions in the same multi-action step before execution.

Expected impact:
- Less redundant clicking/typing
- Faster step completion and lower token/tool waste
