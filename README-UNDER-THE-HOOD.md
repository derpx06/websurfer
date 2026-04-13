<h1 align="center">
    <img src="chrome-extension/public/websurfer_banner.png" width="800" alt="WebSurfer Banner" /><br>
</h1>

# WebSurfer Under-the-Hood (Complete Technical Walkthrough)

This document explains how this repository works internally, from build orchestration to runtime behavior in Chrome, including the multi-agent loop, browser automation stack, security controls, storage schema, UI flows, and package-by-package responsibilities.

It is written directly from the current source tree in this repo (not from marketing docs).

## Scope and Reading Notes

- Scope: `chrome-extension/`, `pages/*`, `packages/*`, root build/config files.
- This covers the real runtime path used by Chrome/Edge Manifest V3 builds.
- Generated outputs (`dist/**`, `build/**`, generated i18n artifacts) are intentionally not treated as authoring sources.

---

## 1) Repository Architecture

### 1.1 Monorepo model

The project is a pnpm workspace monorepo with Turbo as the task orchestrator.

Workspace groups:

- Core extension runtime: `chrome-extension/`
- Extension pages: `pages/side-panel`, `pages/options`, `pages/content`
- Shared libraries: `packages/*`

Root workspace declaration:

- `pnpm-workspace.yaml`: includes `chrome-extension`, `pages/*`, `packages/*`

### 1.2 Build/task orchestration

Root `package.json` scripts delegate into Turbo pipelines:

- `pnpm dev`: runs `turbo watch dev` with `__DEV__=true`
- `pnpm build`: cleans bundle outputs, runs `turbo ready` then `turbo build`
- `pnpm zip`: builds then packages the extension zip
- `pnpm e2e`: build + zip + e2e tasks
- `pnpm type-check`, `pnpm lint`, `pnpm prettier`: turbo fan-out across workspaces

`turbo.json` task graph:

- `ready`: dependency-prep step across workspaces
- `dev`: persistent watcher step, non-cached
- `build`: depends on parent builds, non-cached
- checks/lint/prettier tasks are configured non-cached

### 1.3 Output model

Primary production output directory:

- `dist/`

Notable outputs:

- Background service worker bundle from `chrome-extension` to `dist/background.iife.js`
- Side panel page bundle to `dist/side-panel/*`
- Options page bundle to `dist/options/*`
- Content script bundle to `dist/content/index.iife.js`
- Manifest generated into `dist/manifest.json`
- i18n locale files copied to `dist/_locales/*`

Zip packaging output:

- `dist-zip/extension-YYYYMMDD-HHmmss.zip`

---

## 2) Runtime Component Topology

At runtime, the extension is composed of:

- Background service worker (`chrome-extension/src/background/index.ts`)
- Side panel React app (`pages/side-panel`)
- Options React app (`pages/options`)
- Content script (`pages/content/src/index.ts`, currently minimal)
- Injected DOM extraction script (`chrome-extension/public/buildDomTree.js`)

High-level flow:

1. User sends task in side panel.
2. Side panel opens a long-lived `chrome.runtime.connect` port.
3. Background validates port origin and builds an `Executor`.
4. Executor runs Planner/Navigator loop.
5. Navigator converts browser state into prompt context, gets model actions, executes actions via browser/page APIs.
6. Events stream back to side panel over the same port.
7. Chat and optional replay history persist into storage.

### 2.1 Complete runtime walkthrough (how everything works together)

This subsection is the full system story in execution order, including the side panel, background worker, browser automation, multi-agent loop, storage, and replay.

#### A) Extension startup and background readiness

When the extension service worker starts:

1. It enables "open side panel on extension icon click".
2. It registers `tabs.onUpdated` to inject `buildDomTree.js` into loaded HTTP(S) tabs.
3. It registers cleanup hooks for debugger detachment and closed tabs.
4. It initializes analytics and subscribes to analytics settings changes.

Result: by the time a user sends a task, DOM extraction and command routing are already wired.

#### B) Side panel startup and connection lifecycle

When the side panel UI mounts:

1. It checks model configuration and general settings (including replay toggle).
2. It does not immediately start task execution; it lazily opens a runtime port when needed.
3. On connect, it attaches:
   - `onMessage` handler for execution events/errors/STT replies/heartbeat acks.
   - `onDisconnect` handler to restore UI state and clear intervals.
4. It starts heartbeat pings every 25 seconds (`heartbeat` -> `heartbeat_ack`) to keep the connection healthy.

Result: UI and service worker maintain a resilient long-lived channel rather than one-off messages.

#### C) User sends a new task

From `SidePanel.handleSendMessage(...)`:

1. Input is normalized (`trim`) and slash commands are handled first (`/state`, `/nohighlight`, `/replay ...`).
2. For a fresh task, it creates a chat session in storage and keeps that session id as `taskId`.
3. It appends the user message to in-memory UI state and persists it to chat history.
4. It sends `new_task` over the runtime port with:
   - `task`
   - `taskId`
   - `tabId` (current active tab)

Result: chat session identity and executor task identity are aligned around the same id.

#### D) Background receives command and builds execution context

From `background/index.ts`:

1. It accepts only authorized side panel ports:
   - port name must be `side-panel-connection`
   - sender id must match this extension id
   - sender URL must equal side panel URL
2. On `new_task`:
   - validates `task` and `tabId`
   - calls `setupExecutor(taskId, task, browserContext)`
3. `setupExecutor(...)`:
   - loads provider API configs
   - validates configured agent model/provider compatibility
   - creates navigator/planner chat models
   - loads and applies firewall allow/deny lists into `BrowserContext`
   - loads and applies general settings (max steps/failures/actions, wait timings, highlights, vision, planning interval)
   - constructs `Executor`
4. It subscribes to executor events and forwards each event to the connected side panel port.

Result: every task executes with current persisted settings and strict connection validation.

#### E) Executor orchestration loop (Planner + Navigator)

`Executor.execute()` coordinates the task:

1. Emits `TASK_START`.
2. Tracks analytics "task started".
3. Resets step counter and enters a bounded loop (`maxSteps`).
4. Each iteration:
   - checks `shouldStop()` (cancel/pause/failure limits)
   - runs Planner periodically or after Navigator indicates possible completion
   - evaluates planner `done` + `final_answer`
   - runs Navigator for concrete browser actions
5. On terminal state:
   - emits `TASK_OK`, `TASK_FAIL`, `TASK_CANCEL`, or `TASK_PAUSE`
   - tracks analytics completion/failure/cancellation
6. In `finally`:
   - if replay storage is enabled, serializes and persists `AgentStepHistory`

Result: planning and acting are decoupled but coordinated inside one controlled loop.

#### F) Navigator action execution path

For each navigation step:

1. Navigator collects current browser/page state and adds it to message memory.
2. Prompt context includes:
   - current tab + open tabs
   - clickable DOM tree with stable indices
   - scroll state
   - prior action outcomes/errors
   - optional screenshot (vision mode)
3. LLM returns structured actions.
4. Actions are normalized (`fixActions`) and executed via action registry (`ActionBuilder`).
5. Action results are recorded and emitted as events.
6. If page changes invalidate a multi-action chain (new clickable elements), execution can stop early to force replanning.

Result: each step is state-aware, schema-validated, and execution-constrained.

#### G) Browser automation stack under Navigator

Action execution runs through:

1. `BrowserContext` for tab/page lifecycle (switch/open/close/navigate/firewall enforcement).
2. `Page` for Puppeteer-backed interactions (click/input/scroll/keys/dropdowns/screenshots/waits).
3. DOM service + injected `buildDomTree.js` for interactive element extraction across frames.
4. Typed DOM tree (`DOMElementNode`/`DOMTextNode`) formatting into LLM-readable clickable-element text.

Result: model output translates into concrete Chrome tab operations with DOM-aware targeting.

#### H) Event streaming back to UI and chat timeline behavior

Executor events stream through background port forwarding and are rendered by `SidePanel.handleTaskState(...)`:

1. Actor/state events (`SYSTEM`, `PLANNER`, `NAVIGATOR`) update UI control state:
   - input enabled/disabled
   - stop button visibility
   - follow-up mode entry
2. Progress placeholder messages are shown for running steps.
3. Failure/cancellation/system messages are appended and persisted.
4. On terminal states, the background performs executor/browser cleanup.

Result: user sees near-real-time execution with persistent conversational history.

#### I) Follow-up task path

When user sends another prompt after completion:

1. Side panel sends `follow_up_task` with same session/task id.
2. Background reuses existing executor (if still available).
3. `Executor.addFollowUpTask(...)` appends new task text to memory and resets non-memory action results.
4. `execute()` runs again with prior conversation context retained.

Result: multi-turn tasking happens in a single logical execution history.

#### J) Replay path (historical action playback)

Replay can be triggered via `/replay <historySessionId>` or UI replay controls:

1. Side panel validates replay setting and history availability.
2. It creates a new chat session for replay output.
3. It sends `replay` command to background with:
   - current tab id
   - new task/session id
   - source history session id
4. Background sets up executor and calls `Executor.replayHistory(...)`.
5. Replay loads stored `AgentStepHistory` and replays step-by-step via navigator replay logic.
6. Replay emits normal lifecycle events (`TASK_START`, `TASK_OK`, `TASK_FAIL`, `TASK_CANCEL`).

Result: historical action traces can be re-executed with retry/skip-failure behavior.

#### K) Safety and trust boundaries across the whole flow

Safety is layered; no single mechanism is trusted alone:

1. Port-origin validation blocks unauthorized senders.
2. URL safety checks block dangerous schemes and restricted destinations.
3. Optional firewall allow/deny lists enforce user policy.
4. Untrusted content is sanitized with guardrails and tagged with explicit trust-boundary wrappers (`<nano_untrusted_content>` etc.).
5. Prompt templates include explicit security rules to resist instruction hijacking.
6. File attachments are restricted to safe text-like formats and size limits before model ingestion.

Result: the system combines transport-level, navigation-level, and prompt-level defenses.

#### L) Practical mental model

WebSurfer behaves like a stateful orchestrator with three parallel concerns:

- **Control plane**: side panel <-> background command/event channel.
- **Execution plane**: planner+navigator loop over live browser state.
- **Persistence plane**: settings, chat logs, and optional replay history in extension storage.

A task succeeds when these three planes stay consistent:

1. control plane remains connected,
2. execution plane keeps making validated progress,
3. persistence plane accurately records context/history for follow-up and replay.

### 2.2 Architecture diagram (component + runtime data flow)

```mermaid
flowchart TB
    U[User]

    subgraph CE[Chrome Extension Runtime]
      direction TB

      subgraph UI[Side Panel UI]
        direction TB
        SP[SidePanel.tsx]
        CI[ChatInput / MessageList]
        HB[Port + Heartbeat Manager]
        SP --> CI
        SP --> HB
      end

      subgraph BG[Background Service Worker]
        direction TB
        BR[Command Router<br/>onConnect/onMessage]
        SE[setupExecutor(...)]
        EV[Event Forwarder]
        STT[Speech-to-Text Service]
        BR --> SE
        BR --> EV
        BR --> STT
      end

      subgraph AG[Agent Runtime]
        direction TB
        EX[Executor]
        PL[Planner Agent]
        NV[Navigator Agent]
        AR[Action Registry / ActionBuilder]
        MM[MessageManager + Prompts]
        EX --> PL
        EX --> NV
        NV --> AR
        EX --> MM
      end

      subgraph BA[Browser Automation]
        direction TB
        BC[BrowserContext]
        PG[Page]
        DS[DOM Service]
        BT[buildDomTree.js]
        TAB[Live Tab DOM + Frames]
        NV --> BC
        BC --> PG
        PG --> DS
        DS --> BT
        BT --> TAB
        TAB --> DS
      end

      subgraph SD[Storage]
        direction TB
        CFG[Settings Stores<br/>providers, models, firewall, general]
        CH[Chat History Store]
        RH[Agent Step History]
      end

      subgraph SEC[Security + Guardrails]
        direction TB
        PV[Port Origin Validation]
        UF[URL Allow/Deny + Dangerous Scheme Block]
        GS[Content Sanitizer + Trust Tags]
        PR[Prompt Security Rules]
      end

      AN[Analytics Service]
    end

    subgraph EXT[External Services]
      direction TB
      LLM[LLM Providers<br/>OpenAI/Anthropic/Gemini/Ollama...]
    end

    U -->|task input| SP
    SP -->|runtime.connect + new_task/follow_up_task/replay| BR
    BR -->|load runtime config| CFG
    SE -->|construct configured executor| EX

    PL <-->|plan JSON| LLM
    NV <-->|action JSON| LLM
    STT <-->|audio transcription| LLM

    EV -->|execution events| SP
    SP -->|persist messages/sessions| CH
    EX -->|persist replay history (optional)| RH
    BR -->|task lifecycle metrics| AN

    BR -.->|enforce| PV
    BC -.->|enforce| UF
    MM -.->|sanitize/tag| GS
    MM -.->|template rules| PR
```

---

## 3) Manifest and Packaging Pipeline

### 3.1 Manifest source of truth

- `chrome-extension/manifest.js` is the authoring manifest module.
- It reads root `package.json` version dynamically.
- It conditionally augments manifest for side panel and Opera sidebar support.

Core permissions include:

- `storage`, `scripting`, `tabs`, `activeTab`, `debugger`, `unlimitedStorage`, `webNavigation`, plus `sidePanel` for Chrome side panel support.

### 3.2 Manifest generation

- `chrome-extension/utils/plugins/make-manifest-plugin.ts` imports `manifest.js` and writes `dist/manifest.json`.
- In dev mode it also injects `refresh.js` content script for HMR refresh behavior.
- Uses `@extension/dev-utils` manifest parser for browser-specific formatting.

### 3.3 HMR architecture

HMR is implemented by the `@extension/hmr` package:

- A local WebSocket server (`ws://localhost:8081`) is started in dev.
- Build completion messages trigger refresh/reload events in connected extension contexts.
- Vite plugins inject refresh/reload snippets into bundles.

---

## 4) Background Service Worker Internals

Primary file:

- `chrome-extension/src/background/index.ts`

### 4.1 Startup responsibilities

- Initializes side panel behavior (`openPanelOnActionClick`)
- Injects DOM tree scripts on tab update completion
- Handles debugger detach and tab-close cleanup
- Initializes analytics service and listens for analytics settings changes

### 4.2 Side panel connection security

Port handling enforces:

- Port name must be `side-panel-connection`
- Sender extension id must equal current extension id
- Sender URL must match exact side-panel page URL

Invalid ports are disconnected.

### 4.3 Command protocol handled by background

Supported message `type` values from side panel:

- `heartbeat` -> `heartbeat_ack`
- `new_task`
- `follow_up_task`
- `cancel_task`
- `resume_task`
- `pause_task`
- `screenshot`
- `state`
- `nohighlight`
- `speech_to_text`
- `replay`

### 4.4 Executor setup path

`setupExecutor(taskId, task, browserContext)` does:

1. Loads all provider configs from `llmProviderStore`.
2. Validates provider presence and agent model compatibility.
3. Builds navigator/planner chat models via `createChatModel(...)`.
4. Applies firewall allow/deny config into `BrowserContext`.
5. Applies general settings (wait timing, highlights, step limits, etc).
6. Constructs `Executor` with configured options.

---

## 5) Agent System (Planner + Navigator) — Complete Code Walkthrough

This section traces every line of code that executes from the moment the user submits a task through to an action being taken in the browser.

---

### 5.0 Core source files

| File | Role |
|------|------|
| `background/index.ts` | Service worker entry point — wires up port listener → TaskManager |
| `background/task/manager.ts` | Manages single Executor instance, handles task/stop/pause messages |
| `agent/executor.ts` | Main agent loop — orchestrates Planner + Navigator |
| `agent/agents/base.ts` | `BaseAgent<TSchema, TResult>` — LLM invocation + schema validation |
| `agent/agents/planner.ts` | `PlannerAgent` — produces observation/next_steps/done judgment |
| `agent/agents/navigator.ts` | `NavigatorAgent` — decides and executes individual browser actions |
| `agent/actions/builder.ts` | `ActionBuilder` — registers all default browser actions |
| `agent/actions/schemas.ts` | Zod schemas for all action parameter types |
| `agent/messages/service.ts` | `MessageManager` — LLM conversation history, token counting |
| `agent/messages/views.ts` | `MessageHistory`, `MessageMetadata` — history data structures |
| `agent/messages/utils.ts` | `filterExternalContent`, trust-tag wrappers |
| `agent/prompts/base.ts` | `BasePrompt.buildBrowserStateUserMessage` — DOM state → LLM message |
| `agent/prompts/navigator.ts` | `NavigatorPrompt` — system message + action protocol |
| `agent/prompts/planner.ts` | `PlannerPrompt` — system message + completion policy |
| `agent/types.ts` | `AgentContext`, `ActionResult`, `AgentOutput` |
| `agent/event/types.ts` | `Actors`, `ExecutionState` — event bus enums |
| `agent/history.ts` | `AgentStepRecord` — per-step history for replay |

---

### 5.1 How a task starts — the wire-up chain

**`background/index.ts`** is the service worker. On load it creates one `BrowserContext` and one `TaskManager`.

When the user sends a task from the side panel, the frame looks like:

```
SidePanel.sendMessage({ type: 'new_task', task, ... })
  ↓ chrome.runtime port
background/index.ts: port.onMessage → taskManager.handleMessage(message)
  ↓
TaskManager.handleNewTask(task, taskId, options)
  → reads llmProviderStore.getAllProviders()    // storage read
  → reads generalSettingsStore.getSettings()   // storage read
  → reads firewallSettingsStore                // storage read
  → builds chatLLM instances via createChatModel(provider, modelName, apiKey)
  → creates NavigatorActionRegistry with all actions from ActionBuilder
  → creates Executor(browserContext, navigatorLLM, plannerLLM, options)
  → executor.execute() ← starts the loop
```

---

### 5.2 The Executor loop — `executor.ts`

`Executor.execute()` is the main control loop. All code below refers to `agent/executor.ts`.

```typescript
// executor.ts:113 — simplified loop
async execute(): Promise<void> {
  this.context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, task);

  for (let step = 0; step < maxSteps; step++) {
    // 1. Check abort/pause
    if (this.context.stopped || this.context.paused) break;

    // 2. Decide whether to run Planner this step
    const shouldPlan = (step % planningInterval === 0) 
                    || this.context.forcePlanning;

    if (shouldPlan) {
      // 3. Get current browser state for planner
      await this.planningStrategy.addStateMessageToMemory();  // DOM snapshot

      // 4. Execute Planner LLM call
      const plannerOutput = await this.planningStrategy.execute(context);
      // plannerOutput: { observation, done, next_steps, challenges, final_answer, reasoning, web_task }

      if (plannerOutput.result?.done) break; // task complete per planner

      // 5. Store planner's next_steps as an AI plan message
      context.messageManager.addPlan(plannerOutput.result?.next_steps);
    }

    // 6. Execute Navigator LLM call + browser actions
    const navOutput = await this.navigationStrategy.execute(context);

    // 7. Check if Navigator declared done
    if (navOutput.result?.done) break;

    // 8. Detect and handle failures
    if (navOutput.error) {
      this.context.consecutiveFailures++;
      if (this.context.consecutiveFailures > maxFailures) throw ...;
    } else {
      this.context.consecutiveFailures = 0;
    }
  }
  // emit task.ok / task.fail / task.cancel
}
```

**Key executor facts**:
- `planningInterval` (default: 3) — planner runs every 3rd step and any time the navigator says done.
- `maxSteps` (default: 100) — hard cap on total navigator steps.
- `maxFailures` (default: 3) — consecutive error tolerance before aborting.
- `forcePlanning` — the navigator can set this flag to request immediate replanning (e.g., after detecting unexpected DOM changes).
- Each step sequence: **Planner (maybe) → Navigator (always)**.

---

### 5.3 Planner Agent — `agent/agents/planner.ts`

**Purpose**: high-level supervisor. Reads the full conversation history and current browser state and produces a strategic plan.

**Schema** (`plannerOutputSchema`):
```typescript
{
  observation: string,   // what the planner sees
  challenges: string,    // what might go wrong
  done: boolean,         // is the task complete?
  next_steps: string,    // what the navigator should do next
  final_answer: string,  // the answer if done === true
  reasoning: string,     // why the planner thinks this
  web_task: boolean,     // is this task web-based?
}
```

**`PlannerAgent.execute()` steps**:
1. `emitEvent(PLANNER, STEP_START, 'Planning...')`
2. `getMessages()` — pulls full conversation history from `MessageManager`
3. Slice to `[systemMsg, ...history.slice(1)]` — always includes system message
4. If `useVision=true` but `useVisionForPlanner=false`, strips images from last message
5. Calls `this.invoke(plannerMessages)` → LLM API call with Zod schema validation
6. Sanitizes output via `filterExternalContent()` (removes prompt-injection tags)
7. Emits `PLANNER, STEP_OK, next_steps` (or `final_answer` if done)

**Important**: The planner uses the **same** conversation history as the navigator, so it always has full context. Its output (`next_steps`) is injected into history as an AI message `<plan>...</plan>` so the navigator reads it next.

---

### 5.4 Navigator Agent — `agent/agents/navigator.ts`

This is the core working agent. Every navigator step:

#### 5.4.1 State ingestion

```typescript
// navigator.ts:178
await this.addStateMessageToMemory();
```

→ calls `prompt.getUserMessage(context)` → calls `buildBrowserStateUserMessage(context)`:

```typescript
// prompts/base.ts:30
const browserState = await context.browserContext.getState(useVision);
// browserState: { elementTree, selectorMap, scrollY, scrollHeight, 
//                  screenshot?, tabId, url, title, tabs }
```

The **full DOM snapshot** is fetched here. `getState()` has a 1-second TTL cache. Under normal conditions this hits the network (CDP round-trips for `chrome.scripting.executeScript`).

The state message looks like:
```
[Task history memory ends]
[Current state starts here]
Current tab: {id: 123, url: https://..., title: ...}
Other available tabs: ...
Interactive elements from top layer of the current page inside the viewport:
[Scroll info] window.scrollY: 0, ...
[Start of page]
<nano_untrusted_content>
[0] <button>Search</button>
[1] <input type="text" placeholder="Query">
...
</nano_untrusted_content>
[End of page]
Current step: 1/100  Current date and time: 2026-04-13 12:30
```

#### 5.4.2 LLM invocation

```typescript
// navigator.ts:192
const modelOutput = await this.invoke(inputMessages);
```

`invoke()` (from `BaseAgent`) calls:
```typescript
// with structured output (most modern models):
const structuredLlm = this.chatLLM.withStructuredOutput(this.jsonSchema, ...);
response = await structuredLlm.invoke(inputMessages, { signal: abortController.signal });
```

The JSON schema is `NavigatorAgentOutput`:
```typescript
{
  current_state: {
    evaluation_previous_goal: string,
    memory: string,
    next_goal: string,
  },
  action: [
    { action_name: { ...args } },  // one or more actions
  ]
}
```

If structured output parsing fails (e.g., model returns Markdown-wrapped JSON), `manuallyParseResponse()` tries JSON extraction via regex, then `repairJsonString()`.

#### 5.4.3 Action execution — `doMultiAction()`

```typescript
// navigator.ts:375
private async doMultiAction(actions: Record<string, unknown>[]): Promise<ActionResult[]> {
  const browserState = await browserContext.getState(useVision);  // another snapshot
  const cachedPathHashes = await calcBranchPathHashSet(browserState);

  await browserContext.removeHighlight();  // clear visual highlights

  for (const [i, action] of actions.entries()) {
    const actionName = Object.keys(action)[0];  // e.g., "click_element"
    const actionArgs = action[actionName];

    // If this is not the first action and it requires an index arg:
    // Check if the DOM has changed (new elements appeared)
    if (i > 0 && actionInstance.getIndexArg(actionArgs) !== null) {
      const newState = await browserContext.getState(useVision);
      const newPathHashes = await calcBranchPathHashSet(newState);
      if (!newPathHashes.isSubsetOf(cachedPathHashes)) {
        // DOM changed — stop multi-action and request replanning
        break;
      }
    }

    const result = await actionInstance.call(actionArgs);
    results.push(result);

    // ⚠️ HARDCODED 1-second sleep after every action
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return results;
}
```

#### 5.4.4 Memory management after actions

After `doMultiAction`:
1. `removeLastStateMessageFromMemory()` — pops the state message added in 5.4.1
2. `addModelOutputToMemory(modelOutput)` — adds the navigator's decision as tool-call AI message
3. Action results with `includeInMemory=true` are prepended to the next state message

This ensures the LLM sees: `...[previous actions][previous result][current state]`.

---

### 5.5 Browser Actions — `agent/actions/builder.ts`

`ActionBuilder.buildDefaultActions()` creates `Action` instances for all 19 registered actions. Each `Action` wraps:
- A Zod schema (validation)
- A handler function `(input) => Promise<ActionResult>`
- Whether the action uses an element index

**Full action list with internal implementation**:

| Action | Handler Implementation |
|--------|----------------------|
| `done` | Emits ACT_OK, returns `isDone: true` |
| `search_google` | `browserContext.navigateTo('google.com/search?q=...')` |
| `go_to_url` | `browserContext.navigateTo(url)` |
| `go_back` | `page.goBack()` → Puppeteer `page.goBack()` |
| `wait` | `setTimeout(seconds * 1000)` |
| `click_element` | `page.getState()` → `page.clickElementNode(index)` → check for new tab |
| `input_text` | `page.getState()` → `page.inputTextElementNode(index, text)` |
| `switch_tab` | `browserContext.switchTab(tabId)` → Chrome tab API |
| `open_tab` | `browserContext.openTab(url)` → Chrome tab API |
| `close_tab` | `browserContext.closeTab(tabId)` → Chrome tab API |
| `cache_content` | Tags content via `wrapUntrustedContent()`, adds to memory |
| `scroll_to_percent` | `page.scrollToPercent(yPercent, elementNode?)` |
| `scroll_to_top` | `page.scrollToPercent(0)` |
| `scroll_to_bottom` | `page.scrollToPercent(100)` |
| `previous_page` | `page.scrollToPreviousPage()` |
| `next_page` | `page.scrollToNextPage()` |
| `scroll_to_text` | `page.scrollToText(text, nth)` |
| `send_keys` | `page.sendKeys(keys)` → Puppeteer keyboard |
| `get_dropdown_options` | `page.getDropdownOptions(index)` |
| `select_dropdown_option` | `page.selectDropdownOption(index, optionText)` |

**Inside `clickElementNode` and `inputTextElementNode`** (`page.ts`):
1. `locateElement(elementNode)` — CSS selector → XPath fallback → shadow DOM walk
2. `scrollIntoViewIfNeeded(element)` — polling loop up to 1s
3. **300 ms cursor animation delay**
4. Puppeteer `element.click({ delay: 50 })` or `element.type(text, { delay: 20 })`
5. `clearStateCache()` — invalidates DOM snapshot cache
6. (for navigating actions) `waitForPageAndFramesLoad()` — **up to 8 seconds**

---

### 5.6 Message Manager — `agent/messages/service.ts`

`MessageManager` maintains the full LLM conversation history with rough token counting.

**Settings**:
```typescript
maxInputTokens = 128000
estimatedCharactersPerToken = 3   // rough estimate, no real tokenizer
imageTokens = 800
```

**Message types in history**:
| Type | Role |
|------|------|
| `SystemMessage` | Agent persona + security rules (set once at task start) |
| `HumanMessage` (init) | Task description, example output, `[history starts here]` marker |
| `AIMessage` | Plan `<plan>...</plan>` or navigator tool-call |
| `ToolMessage` | Tool call response placeholder |
| `HumanMessage` (state) | Browser state snapshot — added/removed each step |

**Token overflow handling** (`cutMessages()`):
- If total tokens > `maxInputTokens`, strips images from the last message first
- If still over, truncates the last message body proportionally
- If `proportionToRemove > 99%`, throws — the prompt is too large

**`addNewTask()`**: Appends a new goal to history for follow-up tasks without resetting conversation.

---

### 5.7 Replay subsystem

When `replayHistoricalTasks=true`, completed tasks save `AgentStepRecord[]` to storage.

Replay flow (`navigator.ts:564`):
1. Load step record from storage
2. `parseHistoryModelOutput()` — extracts goal and action list
3. For each action with an element index:  
   a. Look up stored `DOMHistoryElement` (xpath, tag, text, attributes)  
   b. `HistoryTreeProcessor.findHistoryElementInTree()` — fuzzy-match against current DOM  
   c. Update element index if element moved in DOM
4. `doMultiAction(updatedActions)` — execute with corrected indices
5. Retry up to `maxRetries` (default: 3) per step if element not found

---

## 6) Prompting, Memory, and Message Safety

### 6.1 Prompt architecture

Both agents extend `BaseAgent<TSchema, TResult>` which holds:
- `chatLLM: BaseChatModel` — the LangChain model client
- `prompt: BasePrompt` — system + user message builders
- `context: AgentContext` — shared mutable state
- `modelOutputSchema: TSchema` — Zod schema for response validation
- `withStructuredOutput: boolean` — whether to use LangChain structured output API

**NavigatorPrompt** (system message) contains:
- The agent's identity and operational rules
- The complete action schema (dynamically generated from registered actions)
- Format requirements for the `current_state` + `action` JSON
- Security rules (`commonSecurityRules`)

**PlannerPrompt** (system message) contains:
- The supervisor identity and meta-task rules
- Output schema (`observation`, `done`, `next_steps`, etc.)
- Instructions for detecting task completion
- Security rules

### 6.2 Browser state → LLM message

`BasePrompt.buildBrowserStateUserMessage()` (`prompts/base.ts:29–96`):

```
1. browserContext.getState(useVision)        ← full DOM snapshot
2. elementTree.clickableElementsToString()  ← serializes DOM to LLM text
   → "[0] <button>..." format
   → respects includeAttributes config
3. scroll info text
4. step counter + current date/time
5. prior action results/errors (if includeInMemory)
6. if useVision: embedds base64 screenshot as image_url content block
```

The resulting message is `wrapUntrustedContent(rawElementsText)` — the DOM is explicitly tagged as untrusted to prevent prompt injection from malicious page content.

### 6.3 Trust boundaries and message sanitization

`messages/utils.ts` defines explicit trust zones:

```
<nano_user_request>...</nano_user_request>   — actual user intent (trusted)
<nano_untrusted_content>...</nano_untrusted_content> — DOM content (untrusted)
<nano_attached_files>
  <nano_file_content>...</nano_file_content>
</nano_attached_files>                       — file uploads (untrusted)
```

`filterExternalContent(text)` strips these trust tags from planner output before storing/emitting it, preventing the model from leaking tag structure or embedding injection vectors in its own output.

### 6.4 Sensitive data masking

If `sensitiveData` is provided:
```typescript
// Messages are scanned and values replaced:
"my-api-key-abc123" → "<secret>apiKey</secret>"
```

The model is instructed to use `<secret>placeholder_name</secret>` in actions that need the secret value, which gets resolved at execution time.

---

Core files:

- `agent/executor.ts`
- `agent/agents/base.ts`
- `agent/agents/planner.ts`
- `agent/agents/navigator.ts`
- `agent/actions/*`
- `agent/messages/*`
- `agent/prompts/*`

### 5.1 Core abstractions

- `AgentContext`: shared mutable execution state (abort controller, steps, failures, action results, history, final answer).
- `EventManager`: pub/sub event bus used to stream execution events.
- `MessageManager`: maintains LLM conversation memory with token estimation and sanitization.
- `BaseAgent<TSchema, TResult>`: common invocation/validation logic for model calls.

### 5.2 Executor loop

`Executor.execute()`:

- Emits `task.start`
- Tracks analytics task start
- Iterates up to `maxSteps`
- Runs Planner periodically (`planningInterval`) or when Navigator claims done
- Runs Navigator each step
- Stops on completion, cancellation, pause, or limits reached
- Emits final task state (`task.ok`, `task.fail`, `task.cancel`, `task.pause`)
- Optionally persists step history for replay (`replayHistoricalTasks`)

### 5.3 Planner behavior

Planner returns structured JSON with fields:

- `observation`, `done`, `challenges`, `next_steps`, `final_answer`, `reasoning`, `web_task`

Planner:

- Reads conversation history + latest state context
- Cleans output via guardrails sanitization
- Emits step events
- Converts known API errors into typed errors (`ChatModelAuthError`, etc.)

### 5.4 Navigator behavior

Navigator:

1. Adds browser state message to memory.
2. Invokes model for structured action output.
3. Normalizes/fixes action payload (`fixActions`).
4. Executes actions sequentially via action registry.
5. Collects `ActionResult[]` and appends step record to history.

Important runtime protection:

- If page changes and introduces new clickable elements during a multi-action chain, execution can halt and request replanning.

### 5.5 Action registry and default actions

Defined in `agent/actions/schemas.ts` and built in `agent/actions/builder.ts`.

Available actions:

- `done`
- `search_google`
- `go_to_url`
- `go_back`
- `wait`
- `click_element`
- `input_text`
- `switch_tab`
- `open_tab`
- `close_tab`
- `cache_content`
- `scroll_to_percent`
- `scroll_to_top`
- `scroll_to_bottom`
- `previous_page`
- `next_page`
- `scroll_to_text`
- `send_keys`
- `get_dropdown_options`
- `select_dropdown_option`

### 5.6 Replay subsystem

Replay uses saved `AgentStepHistory` from storage:

- Parses historical navigator model output
- Re-maps element indices by comparing stored interacted-element signatures against current DOM
- Retries failed step replay up to configured attempts
- Emits task lifecycle events during replay

---

## 6) Prompting, Memory, and Message Safety

### 6.1 Prompt stack

- `NavigatorPrompt`: detailed action protocol and strict response format
- `PlannerPrompt`: completion/planning/validation policy
- Shared `commonSecurityRules` inserted into prompts

### 6.2 Browser state injection into LLM context

`BasePrompt.buildBrowserStateUserMessage(...)` injects:

- Current tab metadata and other tabs
- Formatted clickable-element tree with indices
- Scroll metrics
- Step counters
- Prior action result/error snippets
- Optional screenshot payload when vision is enabled

### 6.3 Message sanitization model

`messages/utils.ts` provides:

- `filterExternalContent(...)` for sanitizing untrusted content via guardrails
- Tagged wrappers for trust boundaries:
  - `<nano_user_request>`
  - `<nano_untrusted_content>`
  - `<nano_attached_files>` / `<nano_file_content>`
- JSON extraction fallback for non-structured model outputs
- Special message conversion for models with weaker function-calling support

---

## 7) Browser Automation Stack

Core files:

- `browser/context.ts`
- `browser/page.ts`
- `browser/dom/service.ts`
- `public/buildDomTree.js`

### 7.1 BrowserContext responsibilities

- Tracks current tab and attached `Page` objects
- Attaches/detaches Puppeteer transport per tab
- Switches/open/closes/navigates tabs
- Applies firewall checks before navigation/openTab
- Returns browser state snapshots for prompts

### 7.2 Page responsibilities

`Page` wraps Puppeteer page-level behavior:

- Attach via `ExtensionTransport.connectTab(tabId)`
- Anti-detection scripts on new documents
- State refresh: clickable DOM tree + optional screenshot + scroll info
- Input/click/scroll/keyboard operations
- Dropdown options + selection support
- Element location across iframe boundaries
- Network-stability wait loop before/after navigation actions
- URL allow/deny enforcement with safe redirection

### 7.3 DOM extraction pipeline

`browser/dom/service.ts` + `public/buildDomTree.js`:

- Injects `buildDomTree.js` into main and subframes as needed
- Executes `window.buildDomTree(...)` in page context
- Handles problematic iframe loading by separately processing subframes and stitching trees
- Converts raw tree into typed `DOMElementNode` graph + `selectorMap`

### 7.4 DOM node model

`browser/dom/views.ts` defines:

- `DOMElementNode` / `DOMTextNode`
- Tree serialization and clickable-element text formatting for LLMs
- Selector construction from XPath + stable attributes
- Hash support for replay/new-element detection

---

## 8) Security Model

Security is layered across URL control, content sanitization, and prompt boundaries.

### 8.1 URL-level guardrails

`browser/util.ts::isUrlAllowed(...)` blocks dangerous schemes/domains regardless of firewall state:

- `chrome://`, `chrome-extension://`, `javascript:`, `data:`, `file:`, `ws:`, `wss:`, Chrome Web Store URL, etc.

When firewall is enabled:

- exact URL and domain allow/deny checks are applied
- deny wins when matched

### 8.2 Untrusted content sanitization

`services/guardrails/*` provides pattern-based mitigation:

- Task override attempts
- Prompt injection references
- Sensitive pattern redaction (SSN/credit card/basic credentials)
- Strict mode adds additional patterns

### 8.3 Trust-boundary tagging

Message wrapping ensures models can distinguish:

- user instructions (`<nano_user_request>`) from
- untrusted page/file content (`<nano_untrusted_content>`)

### 8.4 UI input safety

Side panel file attachments:

- only text-like extensions are accepted
- file size limited (1MB)
- file contents wrapped as tagged content for downstream sanitization

---

## 9) Storage System and Data Schema

Storage foundation:

- `packages/storage/lib/base/base.ts::createStorage(...)`

Supports:

- local/sync/session storage enum selection
- serialization hooks
- live update subscriptions via storage change listeners

### 9.1 Storage keys in use

- `llm-api-keys` -> provider configs
- `agent-models` -> per-agent model assignment
- `general-settings` -> execution behavior settings
- `firewall-settings` -> allow/deny URL policy
- `speech-to-text-model` -> selected STT model
- `analytics-settings` -> analytics opt-in + anonymous ID
- `user-profile` -> userId
- `favorites` -> bookmarked prompts
- `chat_sessions_meta` -> chat session metadata
- `chat_messages_<sessionId>` -> session messages
- `chat_agent_step_<sessionId>` -> replay step history

### 9.2 Notable store behaviors

- `agentModelStore` merges default parameters by provider.
- `llmProviderStore` applies backward compatibility transforms and Azure-specific validation.
- `generalSettingsStore` enforces `displayHighlights=true` when `useVision=true`.
- `firewallStore` normalizes URLs and removes duplicates across opposite lists.
- `chatHistoryStore` optimizes listing by returning metadata without loading all messages.

---

## 10) Side Panel UI (Task Console)

Main file:

- `pages/side-panel/src/SidePanel.tsx`

### 10.1 Responsibilities

- Establishes and maintains background port connection with heartbeat
- Sends task commands (`new_task`, `follow_up_task`, `cancel_task`, `replay`, etc.)
- Renders streamed agent/system events into chat timeline
- Persists chat messages to history storage
- Supports command shortcuts:
  - `/state`
  - `/nohighlight`
  - `/replay <historySessionId>`
- Manages favorites/bookmarks
- Handles microphone recording and STT request routing

### 10.2 Chat input component behavior

`ChatInput.tsx` supports:

- multiline text
- attachment ingestion and tagging
- send/stop/replay button mode switching
- microphone interaction states

### 10.3 History and bookmark components

- `ChatHistoryList.tsx`: list/select/delete/bookmark past sessions
- `BookmarkList.tsx`: select/edit/delete/reorder saved prompts
- `MessageList.tsx`: grouped actor-aware message rendering + progress bar entry

---

## 11) Options UI (Configuration Console)

Main files:

- `pages/options/src/Options.tsx`
- `pages/options/src/components/*`

### 11.1 Tabs and responsibilities

- General: execution limits/toggles (`GeneralSettings.tsx`)
- Models: providers, model assignments, params (`ModelSettings.tsx`)
- Firewall: allow/deny list controls (`FirewallSettings.tsx`)
- Analytics: opt-in control and data disclosure (`AnalyticsSettings.tsx`)
- Help: links to external docs

### 11.2 ModelSettings internals

`ModelSettings.tsx` is the largest UI module and handles:

- loading/saving provider configs from storage
- adding/removing built-in and custom providers
- multi-instance Azure provider support with deployment list + API version
- model list mutation per provider
- agent model assignment (`Planner`, `Navigator`) with provider>model format
- parameter editing (`temperature`, `topP`, reasoning effort)
- separate speech-to-text model selection (Gemini-filtered)

---

## 12) Speech-to-Text Path

- UI captures microphone audio via `MediaRecorder`
- Audio is sent to background as base64 (`speech_to_text` message)
- `SpeechToTextService` creates a Gemini chat model from configured STT provider/model
- Background returns transcribed text to side panel

---

## 13) Analytics Path

`services/analytics.ts`:

- Initializes PostHog (Manifest V3-safe settings, no session recording)
- Tracks task lifecycle events:
  - started/completed/failed/cancelled
- Tracks visited domain names only (not full URLs)
- Categorizes errors by type/message pattern
- Responds live to analytics settings changes

---

## 14) Shared Packages (What each one does)

- `@extension/storage`: typed storage abstraction + concrete stores
- `@extension/i18n`: key-safe translation layer for dev/prod
- `@extension/shared`: React HOCs and `useStorage` hook
- `@extension/ui`: shared UI primitives (`Button`, utilities, Tailwind helper)
- `@extension/vite-config`: common Vite page config + env helpers
- `@extension/hmr`: extension-specific local HMR plumbing
- `@extension/dev-utils`: manifest parser + terminal logger helpers
- `@extension/schema-utils`: schema conversion helpers and examples
- `@extension/zipper`: distribution zip builder

---

## 15) End-to-End Execution Trace (Concrete)

Example task path:

1. User enters task in side panel.
2. `SidePanel.handleSendMessage(...)` creates/uses session and sends `new_task`.
3. Background receives `new_task`, validates config, constructs `Executor`.
4. Executor emits `task.start` and begins loop.
5. Navigator gathers DOM state from `BrowserContext -> Page -> DOMService -> buildDomTree.js`.
6. Navigator model emits action list, ActionBuilder executes each action.
7. Action events stream back to side panel in near-real time.
8. Planner periodically validates progress and decides `done`/next steps.
9. On completion, background emits `task.ok` with final answer.
10. Side panel re-enables input and keeps session for follow-up.

---

## 16) File-by-File Map (Source of Truth)

This section maps each major source file to its runtime purpose.

### 16.1 Root and build orchestration

- `package.json`: root scripts, toolchain versions, turbo entrypoints.
- `pnpm-workspace.yaml`: workspace boundaries.
- `turbo.json`: task graph and caching policy.
- `.nvmrc`: required Node major/minor.
- `.npmrc`: engine-strict and pnpm behavior.
- `.eslintrc`: shared lint policy.
- `.prettierrc`: code formatting policy.
- `update_version.sh`: bulk package version sync utility.

### 16.2 Extension core (`chrome-extension`)

- `chrome-extension/manifest.js`: Manifest V3 authoring module.
- `chrome-extension/vite.config.mts`: background build, aliases, manifest plugin.
- `chrome-extension/utils/plugins/make-manifest-plugin.ts`: manifest writer plugin.
- `chrome-extension/utils/refresh.js`: dev auto-refresh content script.
- `chrome-extension/public/buildDomTree.js`: injected DOM scanner/highlighter engine.
- `chrome-extension/public/permission/index.html`: microphone permission popup UI.
- `chrome-extension/public/permission/permission.js`: permission request logic.
- `chrome-extension/src/background/index.ts`: service worker command router and executor lifecycle.
- `chrome-extension/src/background/log.ts`: namespaced logger.
- `chrome-extension/src/background/utils.ts`: JSON repair + schema conversion helpers.
- `chrome-extension/src/background/task/manager.ts`: currently empty placeholder.

Agent system:

- `agent/types.ts`: shared agent context/options/results/types.
- `agent/history.ts`: step history records.
- `agent/executor.ts`: planner+navigator orchestration loop.
- `agent/helper.ts`: provider-specific chat model factory.
- `agent/event/types.ts`: event actor/state enums and payload type.
- `agent/event/manager.ts`: event pub/sub implementation.
- `agent/agents/base.ts`: base invocation and schema validation.
- `agent/agents/planner.ts`: planner execution logic.
- `agent/agents/navigator.ts`: navigator execution + replay logic.
- `agent/agents/errors.ts`: typed error taxonomy and detectors.
- `agent/actions/schemas.ts`: declarative action input schemas.
- `agent/actions/builder.ts`: concrete action handlers.
- `agent/messages/views.ts`: managed message structures.
- `agent/messages/service.ts`: memory building/token budgeting.
- `agent/messages/utils.ts`: trust-boundary wrapping + JSON extraction + sanitization.
- `agent/prompts/base.ts`: browser-state prompt composition.
- `agent/prompts/navigator.ts`: navigator system prompt wrapper.
- `agent/prompts/planner.ts`: planner system prompt wrapper.
- `agent/prompts/templates/common.ts`: shared security prompt rules.
- `agent/prompts/templates/navigator.ts`: navigator instruction template.
- `agent/prompts/templates/planner.ts`: planner instruction template.

Browser system:

- `browser/views.ts`: browser/page state/config interfaces and errors.
- `browser/util.ts`: URL allow/deny evaluator and helpers.
- `browser/context.ts`: tab/page lifecycle manager.
- `browser/page.ts`: Puppeteer-backed page operations.
- `browser/dom/raw_types.ts`: raw injected-script result types.
- `browser/dom/service.ts`: script injection and DOM tree construction.
- `browser/dom/views.ts`: typed DOM node classes and formatting.
- `browser/dom/clickable/service.ts`: clickable-element hashing utilities.
- `browser/dom/history/view.ts`: replay DOM history element model.
- `browser/dom/history/service.ts`: replay DOM matching/hashing.

Services:

- `services/analytics.ts`: telemetry service and error categorization.
- `services/speechToText.ts`: Gemini-based STT service.
- `services/guardrails/types.ts`: threat/sanitization types.
- `services/guardrails/patterns.ts`: sanitizer regex patterns.
- `services/guardrails/sanitizer.ts`: content sanitization engine.
- `services/guardrails/index.ts`: guardrails facade.
- `services/guardrails/__tests__/guardrails.test.ts`: sanitizer integration tests.

### 16.3 Pages (`pages/*`)

Content page:

- `pages/content/src/index.ts`: content script entrypoint (minimal log).
- `pages/content/vite.config.mts`: content bundle config.

Options page:

- `pages/options/index.html`: options mount html.
- `pages/options/vite.config.mts`: options bundle config.
- `pages/options/src/index.tsx`: React mount entry.
- `pages/options/src/Options.tsx`: tab shell and page composition.
- `pages/options/src/components/GeneralSettings.tsx`: execution tuning settings UI.
- `pages/options/src/components/ModelSettings.tsx`: provider/model config UI.
- `pages/options/src/components/FirewallSettings.tsx`: firewall list UI.
- `pages/options/src/components/AnalyticsSettings.tsx`: analytics settings UI.
- `pages/options/src/index.css`, `Options.css`, `tailwind.config.ts`: styling.

Side panel:

- `pages/side-panel/index.html`: side panel mount html.
- `pages/side-panel/vite.config.mts`: side panel bundle config.
- `pages/side-panel/src/index.tsx`: React mount entry.
- `pages/side-panel/src/SidePanel.tsx`: primary task UI/controller.
- `pages/side-panel/src/components/ChatInput.tsx`: task entry/attachments/mic UI.
- `pages/side-panel/src/components/MessageList.tsx`: message timeline renderer.
- `pages/side-panel/src/components/ChatHistoryList.tsx`: historical session list.
- `pages/side-panel/src/components/BookmarkList.tsx`: favorite prompts manager.
- `pages/side-panel/src/types/event.ts`: event protocol mirror for UI.
- `pages/side-panel/src/types/message.ts`: actor profile metadata.
- `pages/side-panel/src/utils.ts`: small local helpers.
- `pages/side-panel/src/index.css`, `SidePanel.css`, `tailwind.config.ts`: styling and animation config.
- `pages/side-panel/public/icons/*.svg`: actor icons.

### 16.4 Shared packages (`packages/*`)

Storage:

- `packages/storage/lib/base/*`: generic storage abstraction and enums.
- `packages/storage/lib/settings/types.ts`: provider/agent enums and defaults.
- `packages/storage/lib/settings/llmProviders.ts`: provider CRUD and validation.
- `packages/storage/lib/settings/agentModels.ts`: agent model assignments.
- `packages/storage/lib/settings/generalSettings.ts`: global execution flags.
- `packages/storage/lib/settings/firewall.ts`: URL allow/deny storage logic.
- `packages/storage/lib/settings/speechToText.ts`: STT model storage.
- `packages/storage/lib/settings/analyticsSettings.ts`: analytics preferences storage.
- `packages/storage/lib/chat/types.ts`: chat/history interfaces.
- `packages/storage/lib/chat/history.ts`: session/message/history persistence.
- `packages/storage/lib/prompt/favorites.ts`: favorites CRUD and reorder logic.
- `packages/storage/lib/profile/user.ts`: simple user profile storage.

I18n:

- `packages/i18n/genenrate-i18n.mjs`: generates locale-derived TS helper files.
- `packages/i18n/build*.mjs`: dev/prod i18n bundle selection.
- `packages/i18n/lib/i18n-dev.ts`: development translation lookup.
- `packages/i18n/lib/i18n-prod.ts`: production chrome.i18n proxy.
- `packages/i18n/lib/getMessageFromLocale.ts`, `lib/type.ts`: generated locale map and key types.
- `packages/i18n/locales/*/messages.json`: locale source catalogs.

Shared React helpers:

- `packages/shared/lib/hooks/useStorage.tsx`: suspense-compatible storage hook.
- `packages/shared/lib/hoc/withErrorBoundary.tsx`: error boundary HOC.
- `packages/shared/lib/hoc/withSuspense.tsx`: suspense HOC.
- `packages/shared/lib/utils/shared-types.ts`: utility types.

UI:

- `packages/ui/lib/components/Button.tsx`: shared button primitive.
- `packages/ui/lib/utils.ts`: class merging helper (`cn`).
- `packages/ui/lib/withUI.ts`: Tailwind content merge helper.
- `packages/ui/lib/global.css`: shared Tailwind base layers.

Vite config:

- `packages/vite-config/lib/env.mjs`: dev/prod flags.
- `packages/vite-config/lib/withPageConfig.mjs`: shared page build config.

HMR:

- `packages/hmr/lib/initializers/*`: client/server websocket init.
- `packages/hmr/lib/plugins/*`: Vite plugin set for extension HMR.
- `packages/hmr/lib/injections/*`: injected refresh/reload snippets.
- `packages/hmr/lib/interpreter/index.ts`: ws message serializer.

Dev utils:

- `packages/dev-utils/lib/manifest-parser/*`: manifest conversion helpers.
- `packages/dev-utils/lib/logger.ts`: colored logging.

Schema utils:

- `packages/schema-utils/lib/json_schema.ts`: navigator JSON schema source.
- `packages/schema-utils/lib/helper.ts`: schema dereference/conversion utilities.
- `packages/schema-utils/examples/*`: runnable conversion examples.

Zipper:

- `packages/zipper/index.ts`: archive naming entrypoint.
- `packages/zipper/lib/zip-bundle/index.ts`: zip assembly implementation.

---

## 17) Important Practical Notes

- Manifest V3 service worker lifecycle means state must be robust against worker restarts.
- `task/manager.ts` currently exists but is empty.
- DOM extraction relies heavily on injected page-context JS (`buildDomTree.js`) and frame stitching.
- Replay quality depends on stable element hashing/matching across page state changes.
- Security controls are intentionally layered (URL filtering + content sanitization + trust tags + prompt rules).

---

## 18) Quick Debugging Checklist

If task execution fails unexpectedly:

1. Verify provider configs and agent model assignments in options.
2. Check firewall allow/deny lists for blocked targets.
3. Inspect side panel event stream for planner/navigator step failures.
4. Check background logs for typed errors (auth, bad request, forbidden, URL blocked, max steps/failures).
5. Verify injected DOM script availability in target tab/frame.
6. If replay fails, confirm history exists and target page still contains matchable elements.

---

## 19) If You Want to Build a New Feature (Complete File Checklist)

If you want to review the full functionality before building anything, read these files in this order first.

### 19.1 Minimum end-to-end files (read first)

1. Side panel entry and command send path:
   - `pages/side-panel/src/SidePanel.tsx`
2. Background command router and executor setup:
   - `chrome-extension/src/background/index.ts`
3. Main execution loop:
   - `chrome-extension/src/background/agent/executor.ts`
4. Agent behavior:
   - `chrome-extension/src/background/agent/agents/navigator.ts`
   - `chrome-extension/src/background/agent/agents/planner.ts`
5. Action implementations:
   - `chrome-extension/src/background/agent/actions/builder.ts`
   - `chrome-extension/src/background/agent/actions/schemas.ts`
6. Browser automation internals:
   - `chrome-extension/src/background/browser/context.ts`
   - `chrome-extension/src/background/browser/page.ts`
   - `chrome-extension/src/background/browser/dom/service.ts`
   - `chrome-extension/public/buildDomTree.js`
7. Prompt + memory + sanitization path:
   - `chrome-extension/src/background/agent/messages/service.ts`
   - `chrome-extension/src/background/agent/messages/utils.ts`
   - `chrome-extension/src/background/agent/prompts/base.ts`
8. Storage and persistence:
   - `packages/storage/lib/chat/history.ts`
   - `packages/storage/lib/settings/generalSettings.ts`
   - `packages/storage/lib/settings/agentModels.ts`
   - `packages/storage/lib/settings/llmProviders.ts`
9. Options UI (where settings are edited):
   - `pages/options/src/Options.tsx`
   - `pages/options/src/components/GeneralSettings.tsx`
   - `pages/options/src/components/ModelSettings.tsx`
   - `pages/options/src/components/FirewallSettings.tsx`
10. Security and URL policy:
    - `chrome-extension/src/background/browser/util.ts`
    - `chrome-extension/src/background/services/guardrails/*`

If you understand the above files, you understand almost all runtime behavior.

### 19.2 Which files to edit by feature type

If you are adding a new side panel command:

- `pages/side-panel/src/SidePanel.tsx` (send command)
- `chrome-extension/src/background/index.ts` (handle command)
- optionally `chrome-extension/src/background/agent/executor.ts` (if it affects execution state)
- `packages/i18n/locales/en/messages.json` (new user-facing strings)

If you are adding a new browser action (click/input-like capability):

- `chrome-extension/src/background/agent/actions/schemas.ts` (action schema)
- `chrome-extension/src/background/agent/actions/builder.ts` (action implementation)
- `chrome-extension/src/background/browser/page.ts` (low-level browser operation)
- `packages/i18n/locales/en/messages.json` (action status/error messages)

If you are adding/changing planner or navigator behavior:

- `chrome-extension/src/background/agent/agents/planner.ts`
- `chrome-extension/src/background/agent/agents/navigator.ts`
- `chrome-extension/src/background/agent/executor.ts`
- `chrome-extension/src/background/agent/prompts/templates/planner.ts`
- `chrome-extension/src/background/agent/prompts/templates/navigator.ts`

If you are adding a new provider or model configuration behavior:

- `chrome-extension/src/background/agent/helper.ts` (chat model factory)
- `packages/storage/lib/settings/llmProviders.ts`
- `packages/storage/lib/settings/agentModels.ts`
- `pages/options/src/components/ModelSettings.tsx`

If you are adding/changing replay or history behavior:

- `chrome-extension/src/background/agent/executor.ts` (`replayHistory`)
- `chrome-extension/src/background/agent/agents/navigator.ts` (`executeHistoryStep`)
- `chrome-extension/src/background/agent/history.ts`
- `packages/storage/lib/chat/history.ts`
- `pages/side-panel/src/SidePanel.tsx` (`/replay` flow)

If you are changing security behavior:

- `chrome-extension/src/background/browser/util.ts` (`isUrlAllowed`)
- `chrome-extension/src/background/services/guardrails/sanitizer.ts`
- `chrome-extension/src/background/services/guardrails/patterns.ts`
- `chrome-extension/src/background/agent/messages/utils.ts` (trust-boundary wrappers)

### 19.3 Definition-of-done checks for most feature changes

1. Update i18n keys for new visible strings:
   - `packages/i18n/locales/en/messages.json`
2. Run workspace-scoped checks for changed areas:
   - `pnpm -F chrome-extension type-check`
   - `pnpm -F chrome-extension lint`
   - `pnpm -F pages/side-panel type-check` (if side panel changed)
- `pnpm -F pages/options type-check` (if options changed)
3. Verify end-to-end behavior manually in extension:
   - new task
   - follow-up task
   - cancel/resume path (if touched)
   - replay path (if touched)

---

## 20) Why Actions Take So Long: Complete Performance Analysis

This section documents **every** source of latency in the action execution path, from the moment the user submits a task to a single browser action being completed. All references are to exact source files and line numbers in the current codebase.

### 20.1 Summary Table

| # | Source | File | Line(s) | Fixed Cost | Notes |
|---|--------|------|---------|-----------|-------|
| 1 | **Hardcoded 1 s sleep after every action** | `agent/agents/navigator.ts` | 444 | **1000 ms** | Unconditional. Applies to every single action including simple scrolls and key presses. Has a TODO comment acknowledging it. |
| 2 | **300 ms cursor animation delay before every click** | `browser/page.ts` | 822, 914 | **300 ms × 2** | Awaited before both `clickElementNode` and `inputTextElementNode`. Visual cursor feedback; fires even when highlights are off. |
| 3 | **`waitForNavigation` timeout on every navigation action** | `browser/page.ts` | 956–959 | 0–8000 ms | `waitForPageLoadState` defaults to 8-second timeout. Called from `waitForPageAndFramesLoad` on every click/navigate/send keys. |
| 4 | **`_waitForStableNetwork` loop: up to 15 s** | `browser/page.ts` | 964–1012 | 0–15000 ms | Polls every 100 ms. Waits until `waitForNetworkIdlePageLoadTime` elapses with zero active requests. Maximum 15 s cap. Active on most navigation actions. |
| 5 | **Full DOM snapshot via `chrome.scripting.executeScript` every step** | `browser/dom/service.ts` | 160–176 | 50–300 ms | `buildDomTree.js` is executed on the tab's page context on every navigator step. Heavy on large/complex pages. |
| 6 | **Script injection check on every DOM snapshot** | `browser/dom/service.ts` | 603–647 | 10–50 ms | `scriptInjectedFrames` runs `executeScript` on all frames before each DOM build to check if `buildDomTree.js` is loaded. |
| 7 | **`removeHighlights` before each DOM snapshot** | `browser/page.ts` | 116–120 | 5–30 ms | Runs `executeScript` to remove all highlight elements across all frames before getting clickable elements. |
| 8 | **Sequential `getScrollInfo` after DOM snapshot** | `browser/page.ts` | 240 | 10–30 ms | Separate `executeScript` call for scroll position data, always runs after DOM build. |
| 9 | **`ensurePageAccessible` evaluate call on every `_updateState`** | `browser/page.ts` | 221 + `lifecycle.ts` 62 | 5–20 ms | Runs `page.evaluate('1')` to test page responsiveness before every state update. |
| 10 | **`scrollIntoViewIfNeeded` polling loop** | `browser/page/interaction.ts` | 104–130 | 0–1000 ms | Polls `getBoundingClientRect` every 100 ms for up to 1 second to confirm an element is in viewport. Runs before every click and input. |
| 11 | **`page.getState()` called redundantly in action handlers** | `agent/actions/builder.ts` | 250, 306, 610, 676 | 50–300 ms | `clickElement`, `inputText`, `getDropdownOptions`, and `selectDropdownOption` all call `page.getState()` inside the action handler even though the navigator already fetched state at the beginning of the step. |
| 12 | **`calcBranchPathHashSet` on every multi-action** | `agent/agents/navigator.ts` | 382–383, 406–407 | 5–20 ms | Hashes the entire clickable element tree before and potentially after each action in a multi-action sequence to detect DOM changes. |
| 13 | **Puppeteer `ExtensionTransport.connectTab` on first action** | `browser/page/lifecycle.ts` | 32–46 | 200–500 ms | CDP connection to the tab is established lazily on first attach. Not repeated per action, but adds latency to the first action of a task. |
| 14 | **Per-character input with `{ delay: 20 }` typing** | `browser/page.ts` | 861, 874 | 20 ms × text length | Puppeteer types each character with a 20 ms inter-key delay. A 30-character input adds ~600 ms. |

### 20.2 Worst-Case Per-Step Timing Breakdown

For a single step that includes one `click_element` action followed by one `input_text` action (a common two-action step), the breakdown with default settings is:

```
DOM snapshot (buildDomTree)          ~200 ms
  - script injection check             ~30 ms
  - removeHighlights                   ~20 ms
  - getScrollInfo                      ~20 ms
  - ensurePageAccessible               ~10 ms

LLM call (network round-trip)       ~1000–5000 ms  (model/provider dependent)

Action 1: click_element
  - page.getState() inside action     ~200 ms
  - scrollIntoViewIfNeeded (poll)     ~100–1000 ms
  - cursor animation delay            ~300 ms
  - Puppeteer click                   ~50 ms
  - waitForPageAndFramesLoad          ~500–8000 ms  (navigation dependent)
  - waitForStableNetwork              ~0–15000 ms   (if enabled)
  - post-action sleep                 ~1000 ms      ← HARDCODED

Action 2: input_text
  - DOM change detection snapshot     ~200 ms
  - page.getState() inside action     ~200 ms
  - scrollIntoViewIfNeeded (poll)     ~100–1000 ms
  - cursor animation delay            ~300 ms
  - Puppeteer type (30 chars × 20ms)  ~600 ms
  - post-action sleep                 ~1000 ms      ← HARDCODED

Step total (optimistic, no nav)     ~5–8 seconds
Step total (with page navigation)   ~10–25 seconds
```

> **Root cause**: The system was clearly designed for reliability and observability over speed. Every action is fully serialized and surrounded by conservative wait periods to ensure the page is stable before and after interaction.

### 20.3 Key Bottleneck Deep Dives

#### 20.3.1 The 1000 ms Hardcoded Sleep (Most Impactful)

**File**: `chrome-extension/src/background/agent/agents/navigator.ts`, **line 444**

```typescript
// TODO: wait for 1 second for now, need to optimize this to avoid unnecessary waiting
await new Promise(resolve => setTimeout(resolve, 1000));
```

This sleep runs after **every single action**, unconditionally. For a task that takes 20 actions, this alone adds **20 seconds** to execution time. The code itself contains a TODO acknowledging it should be optimized.

#### 20.3.2 The 300 ms Cursor Animation Delay (Per Click/Input)

**File**: `chrome-extension/src/background/browser/page.ts`, **lines 822 and 914**

```typescript
await new Promise(resolve => setTimeout(resolve, 300));
```

This is a visual UX delay to animate a cursor on screen. It is awaited before every click and text input operation, even when visual highlights are disabled.

#### 20.3.3 `waitForPageAndFramesLoad` on Every Action

**File**: `chrome-extension/src/background/browser/page.ts`, **lines 941–953**

`waitForPageAndFramesLoad` calls:
1. `_waitForStableNetwork()` — polls every 100 ms, up to 15 seconds
2. `waitForPageLoadState()` — calls `page.waitForNavigation({ timeout: 8000 })` — can block the full 8 seconds if no navigation event fires

This is called in: `navigateTo`, `goBack`, `goForward`, `sendKeys`, and `refreshPage`. For non-navigating actions (like scroll), it's absent, but for any key press that might trigger navigation, it fires.

#### 20.3.4 Redundant DOM Snapshots

The navigator calls `addStateMessageToMemory()` at the start of every step (which calls `page.getState()`). Then individual action handlers like `clickElement` and `inputText` call `page.getState()` again inside their own bodies (`builder.ts` lines 250, 306). This means the DOM is fetched at minimum **twice per step**, each time running `buildDomTree.js` via `chrome.scripting.executeScript`.

The `getState()` method does have a 1-second TTL cache (`STATE_CACHE_TTL = 1000` in `page.ts` line 73), but since each step takes several seconds and the cache entries expire between the start-of-step call and the in-handler call, the cache rarely helps in practice.

#### 20.3.5 `waitForNavigation` Blocking Pattern

**File**: `chrome-extension/src/background/browser/page.ts`, **line 958**

```typescript
await this._lifecycle.puppeteerPage?.waitForNavigation({ timeout: timeoutValue });
```

`waitForNavigation` resolves when a navigation event fires, or times out after 8 seconds. If no navigation happens (e.g., a button click that dynamically updates the page via JavaScript without triggering a full navigation), this call will **always block for the full 8 seconds** before timing out and continuing.

### 20.4 Configurable Wait Settings

The `GeneralSettingsConfig` in `packages/storage/lib/settings/generalSettings.ts` exposes:

| Setting | Default | Effect |
|---------|---------|--------|
| `minWaitPageLoad` | `250` ms | Used in background `index.ts` as `minimumWaitPageLoadTime`, sets `waitForNetworkIdlePageLoadTime` on `BrowserContext`. Controls how long `_waitForStableNetwork` requires the network to be idle before declaring the page settled. |

> **Note**: Despite a `minWaitPageLoad` setting existing, the 1000 ms hardcoded sleep in `navigator.ts` is completely **independent** and cannot be adjusted through settings. Neither can the 300 ms cursor animation delays.

### 20.5 The Cumulative Effect

With default settings for a typical task (10–30 browser actions):

- **Hardcoded sleeps alone**: 10–30 seconds
- **DOM snapshots**: 5–15 seconds
- **Navigation waits** (if any navigations occur): 5–30 seconds
- **LLM calls** (network-dependent): 10–60 seconds
- **Scroll, visibility polling, cursor animation**: 3–10 seconds

**Total observable latency**: 30 seconds to several minutes for even modest tasks.

### 20.6 Files to Change to Improve Performance

In priority order:

1. **Reduce or remove the post-action sleep**:
   - `chrome-extension/src/background/agent/agents/navigator.ts` line 444
   - Use a smarter "wait for DOM stability" check instead of a blind 1000 ms wait.

2. **Reduce or conditionalize the cursor animation delay**:
   - `chrome-extension/src/background/browser/page.ts` lines 822 and 914
   - Only animate when `displayHighlights` is enabled.

3. **Fix `waitForNavigation` to not block on non-navigation actions**:
   - `chrome-extension/src/background/browser/page.ts` lines 941–953
   - Only call `waitForNavigation` when the action actually triggers a navigation (e.g., check URL change or listen for `framenavigated` events).

4. **Eliminate the redundant in-action `page.getState()` calls**:
   - `chrome-extension/src/background/agent/actions/builder.ts` lines 250, 306, 610, 676
   - The state is already available from the navigator's start-of-step snapshot. Pass it down into actions rather than re-fetching.

5. **Expose the 1000 ms sleep as a user-configurable setting**:
   - `packages/storage/lib/settings/generalSettings.ts`
   - `pages/options/src/components/GeneralSettings.tsx`
   - Like `minWaitPageLoad`, make post-action wait configurable.
