# WebSurfer Agent — Performance Optimization Guide

This document maps every latency source in the agent's execution path to exact source files and line numbers, provides concrete code-level fixes, and estimates the speedup each fix delivers. Fixes are ordered from most impactful to least.

---

## How the Agent Works (Complete Trace)

Understanding why it is slow starts with understanding every step it takes.

### Step 0 — User sends a task

`SidePanel.handleSendMessage()` → creates chat session → sends `new_task` over the runtime port.

### Step 1 — Background sets up the executor

`background/index.ts` → `TaskManager.handleMessage()` → `setupExecutor(taskId, task, browserContext)`:

1. Reads all LLM provider configs from storage (`llmProviderStore.getAllProviders()`).
2. Validates provider/model compatibility.
3. Constructs navigator and planner `ChatModel` instances via `agent/helper.ts`.
4. Loads general settings, firewall lists.
5. Builds `Executor`, `NavigatorAgent`, `PlannerAgent`, `ActionBuilder`.

### Step 2 — Executor loop starts (`executor.ts:125`)

```
for step in range(maxSteps):
    if shouldStop(): break
    if planningInterval step OR navigator said done:
        planner.execute()          ← LLM call #1
        if planner.done: break
    navigator.execute()            ← LLM call #2 + browser actions
```

### Step 3 — Every Navigator step (`navigator.ts:162`)

```
1. addStateMessageToMemory()
   → buildBrowserStateUserMessage()    ← DOM snapshot (getState)
   → getTabInfos()                     ← chrome.tabs.query
2. LLM call (invoke)                   ← network round-trip
3. fixActions(modelOutput)
4. doMultiAction(actions)
   → for each action:
       a. getState() again             ← second DOM snapshot
       b. actionInstance.call()        ← browser operation + waits
       c. sleep(1000ms)                ← HARDCODED
```

### Step 4 — Every `action.call()` for click or input (`builder.ts`:244, 300)

```
page.getState()                    ← THIRD DOM snapshot in same step
page.clickElementNode() or inputTextElementNode()
  → locateElement()                ← CSS/XPath resolution
  → scrollIntoViewIfNeeded()       ← polling loop, up to 1000ms
  → cursor animation delay         ← sleep(300ms) HARDCODED
  → puppeteer.click()              ← CDP round-trip
  → waitForPageAndFramesLoad()     ← waitForNavigation (up to 8s)
                                       + waitForStableNetwork (up to 15s)
```

### Step 5 — Every DOM snapshot (`page.ts:183`, `dom/service.ts:134`)

```
waitForPageAndFramesLoad()         ← navigation wait
ensurePageAccessible()             ← evaluate('1') CDP call
removeHighlights()                 ← executeScript allFrames
getClickableElements()
  → injectBuildDomTreeScripts()    ← executeScript to check injection
  → executeScript: buildDomTree()  ← main DOM scan
  → if iframe failures:
      getAllFrames()                ← per-frame executeScript
getScrollInfo()                    ← separate executeScript
```

---

## Bottleneck Catalogue

### 🔴 P0 — Critical (fix these first)

---

#### B1: Hardcoded 1-second sleep after every action

**File**: `chrome-extension/src/background/agent/agents/navigator.ts:444`

```typescript
// TODO: wait for 1 second for now, need to optimize this to avoid unnecessary waiting
await new Promise(resolve => setTimeout(resolve, 1000));
```

**Impact**: +1000 ms per action, unconditionally. For a 20-action task = **+20 seconds**.

**Fix**: Replace blind sleep with an event-driven DOM stability check.

```typescript
// Replace the hardcoded sleep with smart stabilization
const MAX_WAIT = 1000;           // cap at 1s worst case
const POLL_INTERVAL = 50;        // check every 50ms
const STABLE_DURATION = 150;     // wait 150ms of no DOM changes

async function waitForDomStability(context: AgentContext, maxWait = MAX_WAIT): Promise<void> {
  const page = await context.browserContext.getCurrentPage();
  if (!page.attached) {
    await new Promise(r => setTimeout(r, 150)); // fallback for non-attached pages
    return;
  }

  const start = Date.now();
  let lastDomHash = '';
  let stableSince = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    const currentHash = await page['_lifecycle'].puppeteerPage?.evaluate(
      () => String(document.querySelectorAll('*').length)
    );
    if (currentHash === lastDomHash) {
      if (Date.now() - stableSince >= STABLE_DURATION) break;
    } else {
      lastDomHash = currentHash ?? '';
      stableSince = Date.now();
    }
  }
}

// Then in doMultiAction, replace line 444:
// await new Promise(resolve => setTimeout(resolve, 1000));
await waitForDomStability(this.context);
```

**Estimated speedup**: **~1 s per action** → 100 ms–300 ms on average (3–10× faster per action).

---

#### B2: `waitForNavigation` blocks 8 seconds on non-navigation actions

**File**: `chrome-extension/src/background/browser/page.ts:956–959`

```typescript
async waitForPageLoadState(timeout?: number) {
  const timeoutValue = timeout || 8000;
  await this._lifecycle.puppeteerPage?.waitForNavigation({ timeout: timeoutValue });
}
```

**Impact**: If a click does NOT trigger a classic navigation (most SPA interactions), `waitForNavigation` never fires and blocks for the full **8 seconds** timeout before continuing.

**Fix**: Use `Promise.race` against a short timeout. If no navigation happens within 500 ms, assume the page is stable.

```typescript
async waitForPageLoadState(timeout?: number) {
  const navigationTimeout = timeout || 3000; // reduce to 3s max
  try {
    await Promise.race([
      this._lifecycle.puppeteerPage?.waitForNavigation({
        timeout: navigationTimeout,
        waitUntil: 'domcontentloaded', // less strict than 'load'
      }),
      new Promise<void>(r => setTimeout(r, 500)), // don't wait more than 500ms if no nav
    ]);
  } catch (error) {
    // Navigation timeout is expected for SPA clicks - just continue
    if (this._isTimeoutError(error)) return;
    throw error;
  }
}
```

**Estimated speedup**: Eliminates 0–8 seconds per action that causes no navigation. On SPA-heavy sites, **saves 5–8 seconds per click**.

---

#### B3: Redundant DOM snapshots — `getState()` called 2–3× per step

**File**: `chrome-extension/src/background/agent/actions/builder.ts:250, 306, 610, 676`

Every `clickElement`, `inputText`, `getDropdownOptions`, `selectDropdownOption` handler calls `page.getState()` internally:

```typescript
// builder.ts:250
const state = await page.getState();          // ← REDUNDANT
const elementNode = state?.selectorMap.get(input.index);
```

The navigator already called `getState()` at the top of the step (`navigator.ts:178`, `base.ts:30`). The 1-second TTL cache rarely helps because actions take several seconds each.

**Fix**: Pass the current `BrowserState` into action handlers as a parameter.

```typescript
// In ActionBuilder, change action signatures to accept state:
type ActionHandler<T> = (input: T, state: BrowserState) => Promise<ActionResult>;

// clickElement becomes:
const clickElement = new Action(
  async (input, state) => {
    const elementNode = state?.selectorMap.get(input.index);  // no getState() call
    // ...
  },
  clickElementActionSchema,
  true,
);

// In doMultiAction (navigator.ts:382), pass state:
const browserState = await browserContext.getState(...); // single call
for (const action of actions) {
  await actionInstance.call(actionArgs, browserState);   // pass state down
}
```

**Estimated speedup**: Eliminates 1–2 extra DOM snapshots per step. **Saves 100–500 ms per step**.

---

### 🟠 P1 — High Impact

---

#### B4: 300 ms cursor animation delay before every click and input

**File**: `chrome-extension/src/background/browser/page.ts:822, 914`

```typescript
// line 822 (inputTextElementNode) and 914 (clickElementNode)
await new Promise(resolve => setTimeout(resolve, 300));
```

This fires unconditionally before every click and text input — even when `displayHighlights` is `false`.

**Fix**: Gate the delay on the `displayHighlights` config flag.

```typescript
// In clickElementNode and inputTextElementNode:
if (this._config.displayHighlights) {
  await new Promise(resolve => setTimeout(resolve, 300));
}
```

**Estimated speedup**: **Saves 300 ms per click/input** when highlights are disabled. For 20 clicks, saves **6 seconds total**.

---

#### B5: `_waitForStableNetwork` polling loop — up to 15 s

**File**: `chrome-extension/src/background/browser/page.ts:964–1012`

```typescript
const maxWaitTime = 15000; // 15s absolute maximum
while (Date.now() - startTime < maxWaitTime) {
  await new Promise(resolve => setTimeout(resolve, 100));
  if (activeRequests === 0 && timeSinceLastActivity >= networkIdleTime * 1000) break;
}
```

This runs on every `navigateTo`, `goBack`, `sendKeys`. On pages with long-polling or streaming connections (SSE, WebSocket trickle), it can block the full 15 seconds.

**Fix**: Reduce the `maxWaitTime` and make `networkIdleTime` smaller by default.

```typescript
const maxWaitTime = 5000; // Reduce from 15s to 5s
```

And in `generalSettings.ts`, change the default:

```typescript
minWaitPageLoad: 100, // Reduce from 250ms; the 250ms is the networkIdleTime threshold
```

**Estimated speedup**: Up to **10 seconds** on pages with long-lived network connections.

---

#### B6: Per-character typing with 20 ms delay per character

**File**: `chrome-extension/src/background/browser/page.ts:861, 874`

```typescript
await element.type(text, { delay: 20 });
```

For a 50-character input, this is **1000 ms** of typing time.

**Fix**: Set value directly via JavaScript for most inputs (already attempted for `input` tags); use minimal delay for Puppeteer type only as a fallback.

```typescript
// Fast path: set value via JS for standard inputs
const set = await element.evaluate((el: Element, text: string) => {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}, text);

// Only fall back to character-by-character typing if JS set failed
if (!set) {
  await element.type(text, { delay: 0 }); // delay: 0 instead of 20
}
```

**Estimated speedup**: **Saves 20 ms × text length**. For an average input of 30–60 chars, saves **600–1200 ms**.

---

### 🟡 P2 — Medium Impact

---

#### B7: `getState()` called inside `buildBrowserStateUserMessage` — another full DOM snapshot

**File**: `chrome-extension/src/background/agent/prompts/base.ts:30`

```typescript
async buildBrowserStateUserMessage(context: AgentContext): Promise<HumanMessage> {
  const browserState = await context.browserContext.getState(context.options.useVision); // ← full snapshot
```

This is the start-of-step snapshot. It's unavoidable to get state _once_, but combined with B3, the same DOM can be scanned 2–3 times per step. Fixing B3 (passing state as parameter) cascades to reduce this duplication.

**Fix**: Ensure `getState()` is called once per step and the result is threaded through all consumers. The 1-second TTL cache at `page.ts:73` can help here if the step progresses quickly enough.

---

#### B8: `injectBuildDomTreeScripts` runs `executeScript` on all frames every DOM scan

**File**: `chrome-extension/src/background/browser/dom/service.ts:617–647`

```typescript
export async function injectBuildDomTreeScripts(tabId: number) {
  const injectedFrames = await scriptInjectedFrames(tabId); // executeScript ALL frames
  // ...
}
```

Even with the `INJECTION_CACHE`, `scriptInjectedFrames` always runs an `executeScript` call to verify injection status on all frames because the cache is invalidated on every navigation.

**Fix**: Use a short-lived in-memory TTL for the injection check (e.g., don't re-check within 500 ms of last successful injection on the same tab):

```typescript
const INJECTION_CHECK_TTL = 500; // ms
const lastInjectionCheckTime = new Map<number, number>(); // tabId → timestamp

export async function injectBuildDomTreeScripts(tabId: number) {
  const now = Date.now();
  const lastCheck = lastInjectionCheckTime.get(tabId) ?? 0;

  if (now - lastCheck < INJECTION_CHECK_TTL) {
    // Skip re-checking injection status, assume still injected
    return;
  }
  lastInjectionCheckTime.set(tabId, now);
  // ... existing injection logic
}
```

**Estimated speedup**: **Saves 10–50 ms per DOM scan** on complex pages with many frames.

---

#### B9: `scrollIntoViewIfNeeded` polling loop — up to 1000 ms per element interaction

**File**: `chrome-extension/src/background/browser/page/interaction.ts:104–130`

```typescript
async scrollIntoViewIfNeeded(element: ElementHandle<Element>, timeout = 1000): Promise<void> {
  while (true) {
    const isVisible = await element.evaluate(...);  // CDP round-trip per poll
    if (isVisible || Date.now() - startTime > timeout) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

**Fix**: Use Puppeteer's built-in `element.scrollIntoView()` directly instead of this manual loop:

```typescript
async scrollIntoViewIfNeeded(element: ElementHandle<Element>): Promise<void> {
  try {
    await element.evaluate(el => {
      el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    });
  } catch (e) {
    // If scrollIntoView fails, just proceed
  }
}
```

**Estimated speedup**: **Saves 100–500 ms per click/input** by replacing the polling loop with a single synchronous call.

---

#### B10: `removeHighlights` runs `executeScript` across all frames before every DOM scan

**File**: `chrome-extension/src/background/browser/page.ts:116–120`

```typescript
async removeHighlight(): Promise<void> {
  if (this._config.displayHighlights && this._validWebPage) {
    await _removeHighlights(this._tabId);  // executeScript({ allFrames: true })
  }
}
```

**Fix**: Track whether highlights were actually applied last time. Only remove if previously applied:

```typescript
private _highlightsApplied = false;

async removeHighlight(): Promise<void> {
  if (this._config.displayHighlights && this._validWebPage && this._highlightsApplied) {
    await _removeHighlights(this._tabId);
    this._highlightsApplied = false;
  }
}

// Set _highlightsApplied = true after getClickableElements when showHighlightElements=true
```

**Estimated speedup**: **Saves 5–30 ms per step** when highlights aren't applied.

---

#### B11: `getTabInfos()` queries ALL tabs on every navigator step

**File**: `chrome-extension/src/background/browser/context.ts:310–324`
Called from `context.getState()` → `buildBrowserStateUserMessage` on every step.

```typescript
public async getTabInfos(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});  // queries EVERY open tab
```

**Fix**: Cache tab info with a short TTL.

```typescript
private _tabInfoCache: TabInfo[] | null = null;
private _tabInfoCacheTime = 0;
private readonly TAB_INFO_TTL = 2000; // 2 seconds

public async getTabInfos(): Promise<TabInfo[]> {
  const now = Date.now();
  if (this._tabInfoCache && now - this._tabInfoCacheTime < this.TAB_INFO_TTL) {
    return this._tabInfoCache;
  }
  const tabs = await chrome.tabs.query({});
  this._tabInfoCache = tabs.filter(t => t.id && t.url && t.title)
    .map(t => ({ id: t.id!, url: t.url!, title: t.title! }));
  this._tabInfoCacheTime = now;
  return this._tabInfoCache;
}
// Invalidate on tab switch, open, or close
```

**Estimated speedup**: **Saves 10–30 ms per step**.

---

### 🟢 P3 — Quick Configuration Wins (No Code Change Required)

---

#### C1: Expose post-action wait as a user setting

The hardcoded 1000 ms in `navigator.ts:444` cannot currently be controlled by users. Adding it to general settings would let power users reduce it immediately.

**Files to change**:
- `packages/storage/lib/settings/generalSettings.ts` — add `postActionWaitMs: 300`
- `pages/options/src/components/GeneralSettings.tsx` — add slider UI
- `chrome-extension/src/background/index.ts` — pass setting to executor options
- `agent/agents/navigator.ts:444` — use `this.context.options.postActionWaitMs`

---

#### C2: Disable highlights by default

`displayHighlights: true` by default means every DOM scan includes highlight injection + removal. Setting it to `false` saves:
- 300 ms cursor animation delay (B4)
- `removeHighlights` executeScript cost (B10)
- Highlight rendering time in `buildDomTree.js`

**File**: `packages/storage/lib/settings/generalSettings.ts:33`

```typescript
displayHighlights: false,  // change from true to false
```

---

#### C3: Reduce `planningInterval` evaluation frequency

**File**: `packages/storage/lib/settings/generalSettings.ts:31`

```typescript
planningInterval: 3,  // planner runs every 3 navigator steps
```

Increasing this to `5` cuts planner LLM calls by ~40%, saving one full LLM round-trip per additional 2 navigator steps.

---

## Combined Speedup Estimate

| Fix | Per-Action Saving | Per-Step Saving |
|-----|------------------|-----------------|
| B1: Remove hardcoded 1s sleep | **1000 ms → ~150 ms** | **850 ms** |
| B2: Fix waitForNavigation | 0–8000 ms → ~50 ms | up to **7950 ms** |
| B3: Eliminate redundant getState() | — | **100–500 ms** |
| B4: Gate cursor animation | **300 ms → 0 ms** | **300 ms** |
| B5: Cap network idle wait | 0–15000 ms → 0–5000 ms | up to **10000 ms** |
| B6: Fast JS-set for text input | 600–1200 ms → ~10 ms | **~1000 ms** |
| B7–B11: Smaller wins | — | 50–200 ms total |

**Conservative overall speedup**: **3–5× faster** on typical non-navigation steps.
**On navigation-heavy tasks** (e.g., search, navigate, click result, read page): **2–3× faster**.

---

## Priority Implementation Order

```
1. navigator.ts:444     — Remove hardcoded sleep          [1 line change]
2. page.ts:914,822      — Gate cursor delay on highlights  [2 line changes]
3. page.ts:956          — Fix waitForNavigation race       [~10 line change]
4. builder.ts           — Pass state to action handlers    [medium refactor]
5. page.ts:861,874      — Use JS-set for text input        [~20 line change]
6. generalSettings.ts   — Expose postActionWaitMs setting  [small feature]
7. interaction.ts:104   — Replace scrollIntoView polling   [~10 line change]
8. context.ts:310       — Cache getTabInfos()              [~15 line change]
9. page.ts:116          — Track highlightsApplied flag     [~10 line change]
```
