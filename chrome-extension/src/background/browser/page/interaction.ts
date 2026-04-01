import type { Page as PuppeteerPage } from 'puppeteer-core/lib/esm/puppeteer/api/Page.js';
import type { ElementHandle } from 'puppeteer-core/lib/esm/puppeteer/api/ElementHandle.js';
import type { Frame } from 'puppeteer-core/lib/esm/puppeteer/api/Frame.js';
import { createLogger } from '@src/background/log';
import { DOMElementNode } from '../dom/views';
import { type BrowserContextConfig } from '../views';

const logger = createLogger('InteractionManager');

export class InteractionManager {
    constructor(private readonly config: BrowserContextConfig) { }

    async locateElement(
        page: PuppeteerPage,
        element: DOMElementNode,
        includeDynamicAttributes: boolean
    ): Promise<ElementHandle<Element> | null> {
        let currentFrame: PuppeteerPage | Frame = page;
        const parents: DOMElementNode[] = [];
        let current: DOMElementNode | null = element;

        while (current?.parent) {
            parents.push(current.parent);
            current = current.parent;
        }

        const iframes = parents.reverse().filter(item => item.tagName === 'iframe');
        for (const parent of iframes) {
            const cssSelector = parent.enhancedCssSelectorForElement(includeDynamicAttributes);
            const frameElement: ElementHandle<Element> | null = await currentFrame.$(cssSelector);
            if (!frameElement) return null;
            const frame: Frame | null = await frameElement.contentFrame();
            if (!frame) return null;
            currentFrame = frame;
        }

        const cssSelector = element.enhancedCssSelectorForElement(includeDynamicAttributes);
        try {
            // 1. Try CSS Selector
            let elementHandle = await currentFrame.$(cssSelector);

            // 2. Try XPath fallback
            if (!elementHandle && element.xpath) {
                const fullXpath = element.xpath.startsWith('/') ? element.xpath : `/${element.xpath}`;
                elementHandle = await currentFrame.$(`::-p-xpath(${fullXpath})`);
            }

            // 3. Robust fallback: Search by tag and text content + fallback to shadow DOM
            if (!elementHandle) {
                elementHandle = await this.robustLocate(currentFrame, element);
            }

            if (elementHandle) {
                // @ts-ignore - Puppeteer types can be tricky
                if (!(await elementHandle.isHidden())) {
                    await this.scrollIntoViewIfNeeded(elementHandle as ElementHandle<Element>);
                }
            }
            return elementHandle as ElementHandle<Element> | null;
        } catch (error) {
            logger.error('Failed to locate element:', error);
            return null;
        }
    }

    /**
     * Attempts to locate an element using more robust methods if selectors fail.
     */
    private async robustLocate(
        frame: PuppeteerPage | Frame,
        element: DOMElementNode
    ): Promise<ElementHandle<Element> | null> {
        const tagName = element.tagName?.toLowerCase() || '*';
        const text = element.attributes?.text || element.attributes?.value || '';

        return await frame.evaluateHandle((tag: string, textContent: string, attr: any) => {
            function findInShadow(root: Node | ShadowRoot): Element | null {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node = walker.nextNode() as Element | null;

                while (node) {
                    if (node.tagName.toLowerCase() === tag) {
                        // Check text content or attribute match
                        if (textContent && node.textContent?.trim().includes(textContent.trim())) {
                            return node;
                        }
                        // Check specific attributes if provided
                        if (attr.id && node.id === attr.id) return node;
                        if (attr.name && (node as any).name === attr.name) return node;
                    }

                    if (node.shadowRoot) {
                        const found = findInShadow(node.shadowRoot);
                        if (found) return found;
                    }
                    node = walker.nextNode() as Element | null;
                }
                return null;
            }
            return findInShadow(document.body);
        }, tagName, text, element.attributes) as ElementHandle<Element> | null;
    }

    async scrollIntoViewIfNeeded(element: ElementHandle<Element>, timeout = 1000): Promise<void> {
        const startTime = Date.now();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const isVisible = await element.evaluate((el: Element) => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;
                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;

                const inViewport =
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth);

                if (!inViewport) {
                    el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
                    return false;
                }
                return true;
            });

            if (isVisible || Date.now() - startTime > timeout) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async findNearestScrollableElement(element: ElementHandle<Element>): Promise<ElementHandle<Element> | null> {
        const isScrollable = await element.evaluate((el: Element) => {
            if (!(el instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(el);
            const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
            const canScrollVertically =
                ['scroll', 'auto'].includes(style.overflowY) || ['scroll', 'auto'].includes(style.overflow);
            return hasVerticalScrollbar && canScrollVertically;
        });

        if (isScrollable) {
            return element;
        }

        let currentElement: ElementHandle<Element> | null = element;
        try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const parentHandle = (await currentElement.evaluateHandle(
                    (el: Element) => el.parentElement,
                )) as ElementHandle<Element> | null;

                const parentElement = parentHandle ? await parentHandle.asElement() : null;

                if (!parentElement) {
                    break;
                }

                const parentIsScrollable = await parentElement.evaluate((el: Element): boolean => {
                    if (!(el instanceof HTMLElement)) return false;
                    const style = window.getComputedStyle(el);
                    const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
                    const canScrollVertically =
                        ['scroll', 'auto'].includes(style.overflowY) || ['scroll', 'auto'].includes(style.overflow);
                    return hasVerticalScrollbar && canScrollVertically;
                });

                if (parentIsScrollable) {
                    return parentElement as ElementHandle<Element>;
                }

                if (currentElement !== element) {
                    await currentElement.dispose().catch(() => { });
                }
                currentElement = parentElement as ElementHandle<Element>;
            }
        } catch (error) {
            logger.error('Error finding scrollable parent:', error);
        }
        return null;
    }

    async isFileUploader(element: ElementHandle<Element>): Promise<boolean> {
        return await element.evaluate((el: Element) => {
            return el instanceof HTMLInputElement && el.type === 'file';
        });
    }

    async getDropdownOptions(element: ElementHandle<Element>): Promise<{ index: number; text: string }[]> {
        return await element.evaluate((el: Element) => {
            if (!(el instanceof HTMLSelectElement)) {
                throw new Error('Element is not a SELECT element');
            }
            return Array.from(el.options).map((opt, i) => ({
                index: i,
                text: opt.text.trim(),
            }));
        });
    }

    async selectDropdownOption(element: ElementHandle<Element>, optionText: string): Promise<string> {
        return await element.evaluate((el: Element, text: string) => {
            if (!(el instanceof HTMLSelectElement)) {
                throw new Error('Element is not a SELECT element');
            }
            const options = Array.from(el.options);
            const option = options.find(opt => opt.text.trim() === text);
            if (!option) {
                throw new Error(`Option "${text}" not found`);
            }
            el.value = option.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return option.text.trim();
        }, optionText);
    }
}
