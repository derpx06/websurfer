import 'webextension-polyfill';
import { type KeyInput } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import type { ElementHandle } from 'puppeteer-core/lib/esm/puppeteer/api/ElementHandle.js';
import {
  getClickableElements as _getClickableElements,
  removeHighlights as _removeHighlights,
  getScrollInfo as _getScrollInfo,
} from './dom/service';
import { DOMElementNode, type DOMState } from './dom/views';
import { type BrowserContextConfig, DEFAULT_BROWSER_CONTEXT_CONFIG, type PageState, URLNotAllowedError } from './views';
import { createLogger } from '@src/background/log';
import { ClickableElementProcessor } from './dom/clickable/service';
import { isUrlAllowed } from './util';
import { LifecycleManager } from './page/lifecycle';
import { InteractionManager } from './page/interaction';

const logger = createLogger('Page');

export function build_initial_state(tabId?: number, url?: string, title?: string): PageState {
  return {
    elementTree: new DOMElementNode({
      tagName: 'root',
      isVisible: true,
      parent: null,
      xpath: '',
      attributes: {},
      children: [],
    }),
    selectorMap: new Map(),
    tabId: tabId || 0,
    url: url || '',
    title: title || '',
    screenshot: null,
    scrollY: 0,
    scrollHeight: 0,
    visualViewportHeight: 0,
  };
}

/**
 * Cached clickable elements hashes for the last state
 */
export class CachedStateClickableElementsHashes {
  url: string;
  hashes: Set<string>;

  constructor(url: string, hashes: Set<string>) {
    this.url = url;
    this.hashes = hashes;
  }
}

export default class Page {
  private _tabId: number;
  private _lifecycle: LifecycleManager;
  private _interaction: InteractionManager;
  private _config: BrowserContextConfig;
  private _state: PageState;
  private _validWebPage = false;
  private _cachedState: PageState | null = null;
  private _cachedStateClickableElementsHashes: CachedStateClickableElementsHashes | null = null;
  private _lastStateUpdateTime = 0;
  private readonly STATE_CACHE_TTL = 1000; // 1 second cache for DOM snapshots

  constructor(tabId: number, url: string, title: string, config: Partial<BrowserContextConfig> = {}) {
    this._tabId = tabId;
    this._config = { ...DEFAULT_BROWSER_CONTEXT_CONFIG, ...config };
    this._lifecycle = new LifecycleManager(tabId, this._config);
    this._interaction = new InteractionManager(this._config);
    this._state = build_initial_state(tabId, url, title);
    // chrome://newtab/, chrome://newtab/extensions, https://chromewebstore.google.com/ are not valid web pages, can't be attached
    const lowerCaseUrl = url.trim().toLowerCase();
    this._validWebPage =
      (tabId &&
        lowerCaseUrl &&
        lowerCaseUrl.startsWith('http') &&
        !lowerCaseUrl.startsWith('https://chromewebstore.google.com')) ||
      false;
  }

  get tabId(): number {
    return this._tabId;
  }

  get validWebPage(): boolean {
    return this._validWebPage;
  }

  get attached(): boolean {
    return this._validWebPage && this._lifecycle.puppeteerPage !== null;
  }

  public getLastStateUpdateTime(): number {
    return this._lastStateUpdateTime;
  }

  async attachPuppeteer(): Promise<boolean> {
    if (!this._validWebPage) return false;
    if (this._lifecycle.puppeteerPage) return true;

    const attached = await this._lifecycle.attach();
    return attached;
  }

  async detachPuppeteer(): Promise<void> {
    await this._lifecycle.detach();
    this._state = build_initial_state(this._tabId);
  }

  async removeHighlight(): Promise<void> {
    if (this._config.displayHighlights && this._validWebPage) {
      await _removeHighlights(this._tabId);
    }
  }

  async getClickableElements(showHighlightElements: boolean, focusElement: number): Promise<DOMState | null> {
    if (!this._validWebPage) {
      return null;
    }
    return _getClickableElements(
      this._tabId,
      this.url(),
      showHighlightElements,
      focusElement,
      this._config.viewportExpansion,
    );
  }

  // Get scroll position information for the current page.
  async getScrollInfo(): Promise<[number, number, number]> {
    if (!this._validWebPage) {
      return [0, 0, 0];
    }
    return _getScrollInfo(this._tabId);
  }

  // Get scroll position information for a specific element.
  async getElementScrollInfo(elementNode: DOMElementNode): Promise<[number, number, number]> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    const element = await this.locateElement(elementNode);
    if (!element) {
      throw new Error(`Element: ${elementNode} not found`);
    }

    // Find the nearest scrollable ancestor
    const scrollableElement = await this._interaction.findNearestScrollableElement(element);
    if (!scrollableElement) {
      // Fallback to page level scroll info if no scrollable ancestor found
      return await this.getScrollInfo();
    }

    const scrollInfo = await scrollableElement.evaluate((el: Element) => {
      return {
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      };
    });

    return [scrollInfo.scrollTop, scrollInfo.clientHeight, scrollInfo.scrollHeight];
  }

  async getContent(): Promise<string> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }
    return await this._lifecycle.puppeteerPage.content();
  }

  getCachedState(): PageState | null {
    return this._cachedState;
  }

  async getState(useVision = false, cacheClickableElementsHashes = false): Promise<PageState> {
    if (!this._validWebPage) {
      return build_initial_state(this._tabId);
    }

    // Check cache
    const now = Date.now();
    if (this._cachedState && now - this._lastStateUpdateTime < this.STATE_CACHE_TTL) {
      logger.debug('Returning cached state');
      return this._cachedState;
    }

    await this.waitForPageAndFramesLoad();
    const updatedState = await this._updateState(useVision);
    this._lastStateUpdateTime = now;

    // Find out which elements are new
    if (cacheClickableElementsHashes) {
      if (
        this._cachedStateClickableElementsHashes &&
        this._cachedStateClickableElementsHashes.url === updatedState.url
      ) {
        const updatedStateClickableElements = ClickableElementProcessor.getClickableElements(updatedState.elementTree);
        for (const domElement of updatedStateClickableElements) {
          const hash = await ClickableElementProcessor.hashDomElement(domElement);
          domElement.isNew = !this._cachedStateClickableElementsHashes.hashes.has(hash);
        }
      }
      const newHashes = await ClickableElementProcessor.getClickableElementsHashes(updatedState.elementTree);
      this._cachedStateClickableElementsHashes = new CachedStateClickableElementsHashes(updatedState.url, newHashes);
    }

    this._cachedState = updatedState;
    return updatedState;
  }

  async _updateState(useVision = false, focusElement = -1): Promise<PageState> {
    try {
      await this._lifecycle.ensurePageAccessible();
    } catch (error) {
      logger.warning('Current page is no longer accessible:', error);
    }

    try {
      await this.removeHighlight();

      // showHighlightElements is true if either useVision or displayHighlights is true
      const displayHighlights = this._config.displayHighlights || useVision;
      const content = await this.getClickableElements(displayHighlights, focusElement);
      if (!content) {
        logger.warning('Failed to get clickable elements');
        // Return last known good state if available
        return this._state;
      }

      // Take screenshot if needed
      const screenshot = useVision ? await this.takeScreenshot() : null;
      const [scrollY, visualViewportHeight, scrollHeight] = await this.getScrollInfo();

      // update the state
      this._state.elementTree = content.elementTree;
      this._state.selectorMap = content.selectorMap;
      this._state.url = this._lifecycle.puppeteerPage?.url() || '';
      this._state.title = (await this._lifecycle.puppeteerPage?.title()) || '';
      this._state.screenshot = screenshot;
      this._state.scrollY = scrollY;
      this._state.visualViewportHeight = visualViewportHeight;
      this._state.scrollHeight = scrollHeight;
      return this._state;
    } catch (error) {
      logger.error('Failed to update state:', error);
      // Return last known good state if available
      return this._state;
    }
  }

  async takeScreenshot(fullPage = false): Promise<string | null> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }

    try {
      // First disable animations/transitions
      await this._lifecycle.puppeteerPage.evaluate(() => {
        const styleId = 'puppeteer-disable-animations';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            *, *::before, *::after {
              animation: none !important;
              transition: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      });

      // Take the screenshot using JPEG format with 80% quality
      const screenshot = await this._lifecycle.puppeteerPage.screenshot({
        fullPage: fullPage,
        encoding: 'base64',
        type: 'jpeg',
        quality: 80, // Good balance between quality and file size
      });

      // Clean up the style element
      await this._lifecycle.puppeteerPage.evaluate(() => {
        const style = document.getElementById('puppeteer-disable-animations');
        if (style) {
          style.remove();
        }
      });

      return screenshot as string;
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  url(): string {
    if (this._lifecycle.puppeteerPage) {
      return this._lifecycle.puppeteerPage.url();
    }
    return this._state.url;
  }

  async title(): Promise<string> {
    if (this._lifecycle.puppeteerPage) {
      return await this._lifecycle.puppeteerPage.title();
    }
    return this._state.title;
  }

  async navigateTo(url: string): Promise<void> {
    await this._lifecycle.ensurePageAccessible();
    if (!this._lifecycle.puppeteerPage) {
      return;
    }
    logger.info('navigateTo', url);

    // Check if URL is allowed
    if (!isUrlAllowed(url, this._config.allowedUrls, this._config.deniedUrls)) {
      throw new URLNotAllowedError(`URL: ${url} is not allowed`);
    }

    try {
      await this._lifecycle.navigateTo(url, () => this.waitForPageAndFramesLoad());
      logger.info('navigateTo complete');
    } catch (error) {
      if (error instanceof URLNotAllowedError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning('Navigation timeout, but page might still be usable:', error);
        return;
      }

      logger.error('Navigation failed:', error);
      throw error;
    }
  }

  async refreshPage(): Promise<void> {
    if (!this._lifecycle.puppeteerPage) return;

    try {
      await Promise.all([this.waitForPageAndFramesLoad(), this._lifecycle.puppeteerPage.reload()]);
      logger.info('Page refresh complete');
    } catch (error) {
      if (error instanceof URLNotAllowedError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning('Refresh timeout, but page might still be usable:', error);
        return;
      }

      logger.error('Page refresh failed:', error);
      throw error;
    }
  }

  async goBack(): Promise<void> {
    if (!this._lifecycle.puppeteerPage) return;

    try {
      await Promise.all([this.waitForPageAndFramesLoad(), this._lifecycle.puppeteerPage.goBack()]);
      logger.info('Navigation back completed');
    } catch (error) {
      if (error instanceof URLNotAllowedError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning('Back navigation timeout, but page might still be usable:', error);
        return;
      }

      logger.error('Could not navigate back:', error);
      throw error;
    }
  }

  async goForward(): Promise<void> {
    if (!this._lifecycle.puppeteerPage) return;

    try {
      await Promise.all([this.waitForPageAndFramesLoad(), this._lifecycle.puppeteerPage.goForward()]);
      logger.info('Navigation forward completed');
    } catch (error) {
      if (error instanceof URLNotAllowedError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warning('Forward navigation timeout, but page might still be usable:', error);
        return;
      }

      logger.error('Could not navigate forward:', error);
      throw error;
    }
  }

  // scroll to a percentage of the page or element
  // if yPercent is 0, scroll to the top of the page, if 100, scroll to the bottom of the page
  // if elementNode is provided, scroll to a percentage of the element
  // if elementNode is not provided, scroll to a percentage of the page
  async scrollToPercent(yPercent: number, elementNode?: DOMElementNode): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }
    if (!elementNode) {
      await this._lifecycle.puppeteerPage.evaluate((yPercent: number) => {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const scrollTop = (scrollHeight - viewportHeight) * (yPercent / 100);
        window.scrollTo({
          top: scrollTop,
          left: window.scrollX,
          behavior: 'smooth',
        });
      }, yPercent);
    } else {
      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Find the nearest scrollable ancestor
      const scrollableElement = await this._interaction.findNearestScrollableElement(element);
      if (!scrollableElement) {
        throw new Error(`No scrollable ancestor found for element: ${elementNode}`);
      }

      await scrollableElement.evaluate((el: Element, yPercent: number) => {
        if (!(el instanceof HTMLElement)) return;
        const scrollHeight = el.scrollHeight;
        const viewportHeight = el.clientHeight;
        const scrollTop = (scrollHeight - viewportHeight) * (yPercent / 100);
        el.scrollTo({
          top: scrollTop,
          left: el.scrollLeft,
          behavior: 'smooth',
        });
      }, yPercent);
    }
  }

  async scrollBy(y: number, elementNode?: DOMElementNode): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }
    if (!elementNode) {
      await this._lifecycle.puppeteerPage.evaluate((y: number) => {
        window.scrollBy({
          top: y,
          left: 0,
          behavior: 'smooth',
        });
      }, y);
    } else {
      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Find the nearest scrollable ancestor
      const scrollableElement = await this._interaction.findNearestScrollableElement(element);
      if (!scrollableElement) {
        throw new Error(`No scrollable ancestor found for element: ${elementNode}`);
      }
      await scrollableElement.evaluate((el: Element, y: number) => {
        el.scrollBy({
          top: y,
          left: 0,
          behavior: 'smooth',
        });
      }, y);
    }
  }

  async scrollToPreviousPage(elementNode?: DOMElementNode): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    if (!elementNode) {
      // Scroll the whole page up by viewport height
      await this._lifecycle.puppeteerPage.evaluate('window.scrollBy(0, -(window.visualViewport?.height || window.innerHeight));');
    } else {
      // Scroll the specific element up by its client height
      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Find the nearest scrollable ancestor
      const scrollableElement = await this._interaction.findNearestScrollableElement(element);
      if (!scrollableElement) {
        // Fallback to whole page
        await this.scrollToPreviousPage();
        return;
      }
      await scrollableElement.evaluate((el: Element) => {
        el.scrollBy(0, -el.clientHeight);
      });
    }
  }

  async scrollToNextPage(elementNode?: DOMElementNode): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    if (!elementNode) {
      // Scroll the whole page down by viewport height
      await this._lifecycle.puppeteerPage.evaluate('window.scrollBy(0, (window.visualViewport?.height || window.innerHeight));');
    } else {
      // Scroll the specific element down by its client height
      const element = await this.locateElement(elementNode);
      if (!element) {
        throw new Error(`Element: ${elementNode} not found`);
      }

      // Find the nearest scrollable ancestor
      const scrollableElement = await this._interaction.findNearestScrollableElement(element);
      if (!scrollableElement) {
        // Fallback to whole page
        await this.scrollToNextPage();
        return;
      }
      await scrollableElement.evaluate((el: Element) => {
        el.scrollBy(0, el.clientHeight);
      });
    }
  }

  async sendKeys(keys: string): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }

    logger.info('sendKeys', keys);

    const modifiers: KeyInput[] = [];
    let mainKey: KeyInput | string = '';

    // Parse keys (e.g., "Control+c", "Enter", "a")
    const parts = keys.split('+');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (i === parts.length - 1) {
        mainKey = part;
      } else {
        modifiers.push(part as KeyInput);
      }
    }

    try {
      // Press all modifier keys (e.g., Control, Shift, etc.)
      for (const modifier of modifiers) {
        await this._lifecycle.puppeteerPage.keyboard.down(this._convertKey(modifier));
      }
      // Press the main key
      // also wait for stable state
      await Promise.all([
        this._lifecycle.puppeteerPage.keyboard.press(this._convertKey(mainKey as KeyInput)),
        this.waitForPageAndFramesLoad(),
      ]);
      logger.info('sendKeys complete', keys);
    } catch (error) {
      logger.error('Failed to send keys:', error);
      throw new Error(`Failed to send keys: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Release all modifier keys in reverse order regardless of any errors in key press.
      for (const modifier of [...modifiers].reverse()) {
        try {
          await this._lifecycle.puppeteerPage.keyboard.up(this._convertKey(modifier));
        } catch (releaseError) {
          logger.error('Failed to release modifier:', modifier, releaseError);
        }
      }
    }
  }

  async scrollToText(text: string, nth: number = 1): Promise<boolean> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    // Try multiple selector strategies
    const selectors = [
      `::-p-xpath(//*[contains(text(), "${text}")])`,
      `::-p-xpath(//*[contains(@aria-label, "${text}")])`,
      `::-p-xpath(//*[contains(@placeholder, "${text}")])`,
    ];

    for (const selector of selectors) {
      try {
        // Use $$ to get all matching elements
        const elements = await this._lifecycle.puppeteerPage.$$(selector);

        if (elements.length > 0) {
          // Find visible elements and select the nth occurrence
          const visibleElements = [];

          for (const element of elements) {
            const isVisible = await element.evaluate((el: Element) => {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0' &&
                rect.width > 0 &&
                rect.height > 0
              );
            });

            if (isVisible) {
              visibleElements.push(element);
            } else {
              await element.dispose();
            }
          }

          if (visibleElements.length >= nth) {
            const targetElement = visibleElements[nth - 1];
            await this._interaction.scrollIntoViewIfNeeded(targetElement);

            // Dispose other elements
            for (let i = 0; i < visibleElements.length; i++) {
              if (i !== nth - 1) {
                await visibleElements[i].dispose();
              }
            }

            return true;
          }

          // Dispose visible elements if not enough found
          for (const element of visibleElements) {
            await element.dispose();
          }
        }
      } catch (error) {
        logger.debug(`Failed to scroll to text with selector ${selector}:`, error);
      }
    }

    return false;
  }

  getSelectorMap(): Map<number, DOMElementNode> {
    return this._state.selectorMap;
  }

  async selectOption(index: number, optionText: string): Promise<void> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap?.get(index);
    const page = this._lifecycle.puppeteerPage;

    if (!element || !page) {
      throw new Error('Element not found or puppeteer is not connected');
    }

    const elementHandle = await this.locateElement(element);
    if (!elementHandle) {
      throw new Error(`Element with index ${index} not found in DOM`);
    }

    try {
      // Verify dropdown and select option in one call
      const result = await elementHandle.evaluate(
        (select: Element, optionText: string, elementIndex: number) => {
          if (!(select instanceof HTMLSelectElement)) {
            return {
              found: false,
              message: `Element with index ${elementIndex} is not a SELECT`,
            };
          }

          const options = Array.from(select.options);
          const option = options.find(opt => opt.text.trim() === optionText);

          if (!option) {
            return {
              found: false,
              message: `Option "${optionText}" not found in dropdown`,
            };
          }

          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));

          return { found: true };
        },
        optionText,
        index,
      );

      if (!result.found) {
        throw new Error(result.message);
      }

      logger.info(`Selected option "${optionText}" for element ${index}`);
    } finally {
      await elementHandle.dispose();
    }
  }

  async clickElement(index: number): Promise<void> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap?.get(index);
    const page = this._lifecycle.puppeteerPage;

    if (!element || !page) {
      throw new Error('Element not found or puppeteer is not connected');
    }

    await this.clickElementNode(this._config.useVision, element);
  }

  public clearStateCache(): void {
    this._cachedState = null;
    this._lastStateUpdateTime = 0;
  }

  async inputText(index: number, text: string): Promise<void> {
    const selectorMap = this.getSelectorMap();
    const element = selectorMap?.get(index);
    const page = this._lifecycle.puppeteerPage;

    if (!element || !page) {
      throw new Error('Element not found or puppeteer is not connected');
    }

    await this.inputTextElementNode(this._config.useVision, element, text);
  }

  async isFileUploader(element: DOMElementNode): Promise<boolean> {
    const handle = await this.locateElement(element);
    if (!handle) return false;
    try {
      return await this._interaction.isFileUploader(handle);
    } finally {
      await handle.dispose().catch(() => { });
    }
  }

  async getDropdownOptions(index: number): Promise<{ index: number; text: string }[]> {
    const element = this.getSelectorMap().get(index);
    if (!element) throw new Error(`Element ${index} not found`);
    const handle = await this.locateElement(element);
    if (!handle) throw new Error(`Element ${index} handle not found`);
    try {
      return await this._interaction.getDropdownOptions(handle);
    } finally {
      await handle.dispose().catch(() => { });
    }
  }

  async selectDropdownOption(index: number, optionText: string): Promise<string> {
    const element = this.getSelectorMap().get(index);
    if (!element) throw new Error(`Element ${index} not found`);
    const handle = await this.locateElement(element);
    if (!handle) throw new Error(`Element ${index} handle not found`);
    try {
      const res = await this._interaction.selectDropdownOption(handle, optionText);
      this.clearStateCache();
      return res;
    } finally {
      await handle.dispose().catch(() => { });
    }
  }

  async locateElement(element: DOMElementNode): Promise<ElementHandle<Element> | null> {
    if (!this._lifecycle.puppeteerPage) {
      logger.warning('Puppeteer is not connected');
      return null;
    }
    return this._interaction.locateElement(
      this._lifecycle.puppeteerPage,
      element,
      this._config.includeDynamicAttributes
    );
  }

  async inputTextElementNode(useVision: boolean, elementNode: DOMElementNode, text: string): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    const element = await this.locateElement(elementNode);
    if (!element) {
      throw new Error(`Element: ${elementNode} not found`);
    }

    try {
      // Scroll element into view if needed
      await this._interaction.scrollIntoViewIfNeeded(element);

      // Trigger visual cursor feedback
      await element.evaluate((el: Element) => {
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        // @ts-expect-error injected at runtime by extension page helpers
        if (window._websurferCursor) {
          // @ts-expect-error injected at runtime by extension page helpers
          window._websurferCursor.move(x, y);
        }
      });
      // Only animate cursor delay when highlights are visible (purely cosmetic)
      if (this._config.displayHighlights) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Get element properties to determine input method
      const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
      const isContentEditable = await element.evaluate((el: Element) => {
        if (el instanceof HTMLElement) {
          return el.isContentEditable;
        }
        return false;
      });
      const isReadOnly = await element.evaluate((el: Element) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          return el.readOnly;
        }
        return false;
      });
      const isDisabled = await element.evaluate((el: Element) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          return el.disabled;
        }
        return false;
      });

      // Choose appropriate input method based on element properties
      if ((isContentEditable || tagName === 'input') && !isReadOnly && !isDisabled) {
        // Clear content and set value directly
        await element.evaluate((el: Element) => {
          if (el instanceof HTMLElement) {
            el.textContent = '';
          }
          if ('value' in el) {
            (el as HTMLInputElement).value = '';
          }
          // Dispatch events
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Type the text (no per-character delay — JS events fire synchronously)
        await element.type(text, { delay: 0 });
      } else {
        // Fallback for other elements (e.g., textarea, div with contenteditable)
        // Focus first
        await element.focus();

        // Clear existing content if possible
        await this._lifecycle.puppeteerPage.keyboard.down('Control');
        await this._lifecycle.puppeteerPage.keyboard.press('a');
        await this._lifecycle.puppeteerPage.keyboard.up('Control');
        await this._lifecycle.puppeteerPage.keyboard.press('Backspace');

        // Type directly
        await element.type(text, { delay: 0 });
      }

      // Final events to ensure state is updated
      await element.evaluate((el: Element) => {
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });

      logger.info(`Successfully input text into element: ${elementNode}`);
      this.clearStateCache();
    } finally {
      await element.dispose();
    }
  }

  async clickElementNode(useVision: boolean, elementNode: DOMElementNode): Promise<void> {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer is not connected');
    }

    const element = await this.locateElement(elementNode);
    if (!element) {
      throw new Error(`Element: ${elementNode} not found`);
    }

    try {
      // Scroll element into view if needed
      await this._interaction.scrollIntoViewIfNeeded(element);

      // Trigger visual cursor feedback
      await element.evaluate((el: Element) => {
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        // @ts-expect-error injected at runtime by extension page helpers
        if (window._websurferCursor) {
          // @ts-expect-error injected at runtime by extension page helpers
          window._websurferCursor.click(x, y);
        }
      });
      // Only animate cursor delay when highlights are visible (purely cosmetic)
      if (this._config.displayHighlights) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Use vision or standard click
      try {
        await element.click({ delay: 50 });
      } catch (error) {
        // Second attempt: Use evaluate to perform a direct click
        logger.info('Failed to click element, trying again', error);
        try {
          await element.evaluate((el: Element) => (el as HTMLElement).click());
        } catch (secondError) {
          // if URLNotAllowedError, throw it
          if (secondError instanceof URLNotAllowedError) {
            throw secondError;
          }
          logger.error('Both click attempts failed:', secondError);
          throw new Error('Failed to click element after two attempts');
        }
      }

      logger.info(`Successfully clicked element: ${elementNode}`);
      this.clearStateCache();
    } finally {
      await element.dispose();
    }
  }

  async waitForPageAndFramesLoad() {
    if (this._config.waitForNetworkIdlePageLoadTime > 0) {
      await this._waitForStableNetwork();
    }
    try {
      await this.waitForPageLoadState();
    } catch (error) {
      if (this._isTimeoutError(error)) {
        logger.warning('Page load wait timed out, continuing with current DOM state:', error);
        return;
      }
      throw error;
    }
  }

  async waitForPageLoadState(timeout?: number) {
    // Use domcontentloaded (faster than 'load') and 3s timeout
    // For SPA clicks that don't trigger navigation, this times out quickly rather than blocking 8s
    const timeoutValue = timeout || 3000;
    await this._lifecycle.puppeteerPage?.waitForNavigation({
      timeout: timeoutValue,
      waitUntil: 'domcontentloaded',
    });
  }

  private _isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.message.toLowerCase().includes('timeout');
  }

  private async _waitForStableNetwork() {
    if (!this._lifecycle.puppeteerPage) {
      throw new Error('Puppeteer page is not connected');
    }

    const networkIdleTime = this._config.waitForNetworkIdlePageLoadTime;
    if (networkIdleTime <= 0) return;

    logger.debug(`Waiting for network to stabilize (${networkIdleTime}s)...`);

    let lastRequestTime = Date.now();
    let activeRequests = 0;

    const onRequest = () => {
      activeRequests++;
      lastRequestTime = Date.now();
    };

    const onResponse = () => {
      activeRequests--;
      lastRequestTime = Date.now();
    };

    // Add event listeners
    this._lifecycle.puppeteerPage.on('request', onRequest);
    this._lifecycle.puppeteerPage.on('response', onResponse);

    try {
      const startTime = Date.now();
      const maxWaitTime = 5000; // 5s absolute maximum (down from 15s)

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));

        const timeSinceLastActivity = Date.now() - lastRequestTime;

        // If no active requests and no activity for specified time, we're done
        if (activeRequests === 0 && timeSinceLastActivity >= networkIdleTime * 1000) {
          break;
        }
      }
    } finally {
      // Clean up event listeners
      this._lifecycle.puppeteerPage.off('request', onRequest);
      this._lifecycle.puppeteerPage.off('response', onResponse);
    }
    console.debug(`Network stabilized for ${this._config.waitForNetworkIdlePageLoadTime} seconds`);
  }

  private async _checkAndHandleNavigation() {
    try {
      // Some operations might trigger navigation to restricted URLs
      await this._waitForStableNetwork();

      // Check if the loaded URL is allowed
      if (this._lifecycle.puppeteerPage) {
        await this._checkAndHandleNavigationAction();
      }
    } catch (error) {
      logger.error('Error during navigation check:', error);
    }
  }

  private async _checkAndHandleNavigationAction() {
    if (this._lifecycle.puppeteerPage) {
      const currentUrl = this._lifecycle.puppeteerPage.url();
      const safeUrl = isUrlAllowed(currentUrl, this._config.allowedUrls, this._config.deniedUrls)
        ? currentUrl
        : 'about:blank';

      if (safeUrl !== currentUrl) {
        logger.warning(`Redirecting to ${safeUrl} because ${currentUrl} is not allowed`);
        await this._lifecycle.puppeteerPage.goto(safeUrl);
      }
    }
  }

  private _convertKey(key: string): KeyInput {
    // Basic mapping for Puppeteer KeyInput
    // In a real implementation, this would handle more complex mappings
    return key as KeyInput;
  }
}
