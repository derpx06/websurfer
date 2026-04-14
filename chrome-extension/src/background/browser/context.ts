import 'webextension-polyfill';
import {
  type BrowserContextConfig,
  type BrowserState,
  DEFAULT_BROWSER_CONTEXT_CONFIG,
  type TabInfo,
  URLNotAllowedError,
} from './views';
import Page, { build_initial_state } from './page';
import { createLogger } from '@src/background/log';
import { isUrlAllowed, safeGetTab } from './util';
import { analytics } from '../services/analytics';

const logger = createLogger('BrowserContext');
/**
 * BrowserContext is the primary interface between the Agent's execution logic 
 * and the actual browser environment (tabs, pages, and Playwright instances).
 * 
 * It manages a set of "attached" pages, where each page is a wrapper around a 
 * Chrome tab with an active Puppeteer/Playwright connection for interaction.
 */
export default class BrowserContext {
  private _config: BrowserContextConfig;
  private _currentTabId: number | null = null;
  private _attachedPages: Map<number, Page> = new Map();

  public get currentTabId(): number | null {
    return this._currentTabId;
  }
  // Cache for tab list queries — refreshed at most every 2 seconds
  private _tabInfoCache: TabInfo[] | null = null;
  private _tabInfoCacheTime = 0;
  private readonly TAB_INFO_CACHE_TTL = 2000; // ms

  constructor(config: Partial<BrowserContextConfig>) {
    this._config = { ...DEFAULT_BROWSER_CONTEXT_CONFIG, ...config };
  }

  public getConfig(): BrowserContextConfig {
    return this._config;
  }

  public updateConfig(config: Partial<BrowserContextConfig>): void {
    this._config = { ...this._config, ...config };
  }

  public updateCurrentTabId(tabId: number): void {
    // only update tab id, but don't attach it.
    this._currentTabId = tabId;
  }

  private async _getOrCreatePage(tab: chrome.tabs.Tab, forceUpdate = false): Promise<Page> {
    if (!tab.id) {
      throw new Error('Tab ID is not available');
    }

    const existingPage = this._attachedPages.get(tab.id);
    if (existingPage) {
      logger.info('getOrCreatePage', tab.id, 'already attached');
      if (!forceUpdate) {
        return existingPage;
      }
      // detach the page and remove it from the attached pages if forceUpdate is true
      await existingPage.detachPuppeteer();
      this._attachedPages.delete(tab.id);
    }
    if (!tab) {
      throw new Error('Tab is undefined in getOrCreatePage');
    }
    logger.info('getOrCreatePage', tab.id, 'creating new page');
    return new Page(tab.id, tab.url || '', tab.title || '', this._config);
  }

  public async cleanup(): Promise<void> {
    const currentPage = await this.getCurrentPage();
    currentPage?.removeHighlight();
    // detach all pages
    for (const page of this._attachedPages.values()) {
      await page.detachPuppeteer();
    }
    this._attachedPages.clear();
    this._currentTabId = null;
  }

  public async attachPage(page: Page): Promise<boolean> {
    // check if page is already attached
    if (this._attachedPages.has(page.tabId)) {
      logger.info('attachPage', page.tabId, 'already attached');
      return true;
    }

    if (await page.attachPuppeteer()) {
      logger.info('attachPage', page.tabId, 'attached');
      // add page to managed pages
      this._attachedPages.set(page.tabId, page);
      return true;
    }
    return false;
  }

  public async detachPage(tabId: number): Promise<void> {
    // detach page
    const page = this._attachedPages.get(tabId);
    if (page) {
      await page.detachPuppeteer();
      // remove page from managed pages
      this._attachedPages.delete(tabId);
    }
  }

  /**
   * Retrieves the current active Page instance.
   * If no tab is currently tracked, it queries the active Chrome tab.
   * If the tab is not yet attached to Puppeteer, it initiates the attachment.
   * 
   * @returns {Promise<Page>} The active Page wrapper.
   */
  public async getCurrentPage(): Promise<Page> {
    // Stage 1: If no tab ID is tracked, discover the active tab in the current window
    if (!this._currentTabId) {
      let activeTab: chrome.tabs.Tab;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        // Fallback: Open a new blank tab if no active tab is found
        const newTab = await chrome.tabs.create({ url: this._config.homePageUrl });
        if (!newTab.id) {
          throw new Error('No tab ID available');
        }
        activeTab = newTab;
      } else {
        activeTab = tab;
      }
      logger.info('active tab', activeTab.id, activeTab.url, activeTab.title);
      const page = await this._getOrCreatePage(activeTab);
      await this.attachPage(page);
      this._currentTabId = activeTab.id || null;
      return page;
    }

    // Stage 2: If we have a tab ID but no attached Page, verify tab existence and attach
    const existingPage = this._attachedPages.get(this._currentTabId);
    if (!existingPage) {
      const tab = await safeGetTab(this._currentTabId);
      if (!tab) {
        logger.warning(`Tab ${this._currentTabId} not found, resetting current tab id`);
        this._currentTabId = null;
        return this.getCurrentPage(); // Retry discovery
      }
      const page = await this._getOrCreatePage(tab);
      await this.attachPage(page);
      return page;
    }

    // Stage 3: Return the already managed Page instance
    return existingPage;
  }

  /**
   * Get all tab IDs from the browser and the current window.
   * @returns A set of tab IDs.
   */
  public async getAllTabIds(): Promise<Set<number>> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return new Set(tabs.map(tab => tab.id).filter(id => id !== undefined));
  }

  /**
   * Wait for tab events to occur after a tab is created or updated.
   * @param tabId - The ID of the tab to wait for events on.
   * @param options - An object containing options for the wait.
   * @returns A promise that resolves when the tab events occur.
   */
  private async waitForTabEvents(
    tabId: number,
    options: {
      waitForUpdate?: boolean;
      waitForActivation?: boolean;
      timeoutMs?: number;
    } = {},
  ): Promise<void> {
    const { waitForUpdate = true, waitForActivation = true, timeoutMs = 12000 } = options;

    const promises: Promise<void>[] = [];

    if (waitForUpdate) {
      const updatePromise = new Promise<void>(resolve => {
        let isComplete = false;

        const onUpdatedHandler = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (updatedTabId !== tabId) return;

          if (changeInfo.status === 'complete') isComplete = true;

          // Some pages may never emit title changes; completion is enough.
          if (isComplete) {
            chrome.tabs.onUpdated.removeListener(onUpdatedHandler);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(onUpdatedHandler);

        // Check current state
        chrome.tabs.get(tabId).then(tab => {
          if (tab.status === 'complete') isComplete = true;

          if (isComplete) {
            chrome.tabs.onUpdated.removeListener(onUpdatedHandler);
            resolve();
          }
        }).catch(() => {
          chrome.tabs.onUpdated.removeListener(onUpdatedHandler);
          resolve();
        });
      });
      promises.push(updatePromise);
    }

    if (waitForActivation) {
      const activatedPromise = new Promise<void>(resolve => {
        const onActivatedHandler = (activeInfo: chrome.tabs.TabActiveInfo) => {
          if (activeInfo.tabId === tabId) {
            chrome.tabs.onActivated.removeListener(onActivatedHandler);
            resolve();
          }
        };
        chrome.tabs.onActivated.addListener(onActivatedHandler);

        // Check current state
        chrome.tabs.get(tabId).then(tab => {
          if (tab.active) {
            chrome.tabs.onActivated.removeListener(onActivatedHandler);
            resolve();
          }
        }).catch(() => {
          chrome.tabs.onActivated.removeListener(onActivatedHandler);
          resolve();
        });
      });
      promises.push(activatedPromise);
    }

    const timeoutPromise = new Promise<void>(resolve =>
      setTimeout(() => {
        logger.warning(`Tab operation timed out after ${timeoutMs} ms; continuing with best effort`, { tabId });
        resolve();
      }, timeoutMs),
    );

    await Promise.race([Promise.all(promises), timeoutPromise]);
  }

  public async switchTab(tabId: number): Promise<Page> {
    logger.info('switchTab', tabId);
    this._invalidateTabInfoCache();
    await chrome.tabs.update(tabId, { active: true });

    const tab = await safeGetTab(tabId);
    if (!tab) {
      throw new Error(`Cannot switch to tab ${tabId} because it no longer exists`);
    }
    const page = await this._getOrCreatePage(tab);
    await this.attachPage(page);
    this._currentTabId = tabId;
    return page;
  }

  /**
   * Navigates the current tab to a specified URL.
   * Includes security checks to verify the URL is allowed by current configuration.
   * 
   * @param url The destination address.
   */
  public async navigateTo(url: string): Promise<void> {
    // Security check against blacklist/whitelist
    if (!isUrlAllowed(url, this._config.allowedUrls, this._config.deniedUrls)) {
      throw new URLNotAllowedError(`URL: ${url} is not allowed`);
    }

    // Track domain visit for analytics metrics
    void analytics.trackDomainVisit(url);
    this._invalidateTabInfoCache();

    const page = await this.getCurrentPage();
    if (!page) {
      await this.openTab(url);
      return;
    }

    // Optimized path: If page is already attached to Puppeteer, use it for direct navigation
    if (page.attached) {
      await page.navigateTo(url);
      return;
    }

    // Fallback path: Use standard Chrome API if no active attachment exists
    const tabId = page.tabId;
    await chrome.tabs.update(tabId, { url, active: true });
    await this.waitForTabEvents(tabId);

    // Reattach the page to regain control after navigation completes
    const tab = await safeGetTab(tabId);
    if (!tab) return;
    const updatedPage = await this._getOrCreatePage(tab, true);
    await this.attachPage(updatedPage);
    this._currentTabId = tabId;
  }

  public async openTab(url: string): Promise<Page> {
    if (!isUrlAllowed(url, this._config.allowedUrls, this._config.deniedUrls)) {
      throw new URLNotAllowedError(`Open tab failed. URL: ${url} is not allowed`);
    }

    // Create the new tab
    const tab = await chrome.tabs.create({ url, active: true });
    if (!tab.id) {
      throw new Error('No tab ID available');
    }
    this._invalidateTabInfoCache();
    // Wait for tab events
    await this.waitForTabEvents(tab.id);

    // Get updated tab information
    const updatedTab = await chrome.tabs.get(tab.id);
    // Create and attach the page after tab is fully loaded and activated
    const page = await this._getOrCreatePage(updatedTab);
    await this.attachPage(page);
    this._currentTabId = tab.id;

    return page;
  }

  public async closeTab(tabId: number): Promise<void> {
    await this.detachPage(tabId);
    await chrome.tabs.remove(tabId);
    this._invalidateTabInfoCache();
    // update current tab id if needed
    if (this._currentTabId === tabId) {
      this._currentTabId = null;
    }
  }

  /**
   * Remove a tab from the attached pages map. This will not run detachPuppeteer.
   * @param tabId - The ID of the tab to remove.
   */
  public removeAttachedPage(tabId: number): void {
    this._attachedPages.delete(tabId);
    // update current tab id if needed
    if (this._currentTabId === tabId) {
      this._currentTabId = null;
    }
  }

  public async getTabInfos(): Promise<TabInfo[]> {
    const now = Date.now();
    if (this._tabInfoCache && now - this._tabInfoCacheTime < this.TAB_INFO_CACHE_TTL) {
      return this._tabInfoCache;
    }
    const tabs = await chrome.tabs.query({});
    const tabInfos: TabInfo[] = [];
    for (const tab of tabs) {
      if (tab.id && tab.url && tab.title) {
        tabInfos.push({ id: tab.id, url: tab.url || '', title: tab.title || '' });
      }
    }
    this._tabInfoCache = tabInfos;
    this._tabInfoCacheTime = now;
    return tabInfos;
  }

  private _invalidateTabInfoCache(): void {
    this._tabInfoCache = null;
  }

  public async getCachedState(useVision = false, cacheClickableElementsHashes = false): Promise<BrowserState> {
    const currentPage = await this.getCurrentPage();

    let pageState = !currentPage ? build_initial_state() : currentPage.getCachedState();
    if (!pageState) {
      pageState = await currentPage.getState(useVision, cacheClickableElementsHashes);
    }

    const tabInfos = await this.getTabInfos();
    const browserState: BrowserState = {
      ...pageState,
      tabs: tabInfos,
    };
    return browserState;
  }

  /**
   * Captures the full state of the current page and browser session.
   * This includes the interactive element tree, screenshots, and tab list.
   * 
   * @param useVision Whether to capture visual screenshots for multi-modal models.
   * @param cacheClickableElementsHashes Whether to compute and store element hashes for loop detection.
   * @returns {Promise<BrowserState>} The unified browser state description.
   */
  public async getState(useVision = false, cacheClickableElementsHashes = false): Promise<BrowserState> {
    const currentPage = await this.getCurrentPage();

    // Extract page-specific state (DOM, accessibility tree, etc.)
    const pageState = !currentPage
      ? build_initial_state()
      : await currentPage.getState(useVision, cacheClickableElementsHashes);

    // Combine with global browser metadata
    const tabInfos = await this.getTabInfos();
    const browserState: BrowserState = {
      ...pageState,
      tabs: tabInfos,
    };
    return browserState;
  }

  public async removeHighlight(): Promise<void> {
    const page = await this.getCurrentPage();
    if (page) {
      await page.removeHighlight();
    }
  }
}
