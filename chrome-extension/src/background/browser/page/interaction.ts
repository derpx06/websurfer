import type { Page as PuppeteerPage } from 'puppeteer-core/lib/esm/puppeteer/api/Page.js';
import type { ElementHandle } from 'puppeteer-core/lib/esm/puppeteer/api/ElementHandle.js';
import type { Frame } from 'puppeteer-core/lib/esm/puppeteer/api/Frame.js';
import { createLogger } from '@src/background/log';
import type { DOMElementNode } from '../dom/views';
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
        page: PuppeteerPage | Frame,
        element: DOMElementNode
    ): Promise<ElementHandle<Element> | null> {
        const tagName = element.tagName;
        const text = element.attributes.text || element.attributes.value || '';
        const attr = element.attributes || {};

        return await page.evaluateHandle((tag: string | null, textContent: string, attributes: Record<string, string>) => {
            function findInShadow(root: Node | ShadowRoot): Element | null {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node = walker.nextNode() as Element | null;

                while (node) {
                    const nodeTag = node.tagName.toLowerCase();
                    const tagMatch = (tag && nodeTag === tag.toLowerCase()) || tag === '*';

                    // 1. Check ID (Highest confidence)
                    if (attributes.id && node.id === attributes.id) return node;

                    // 2. Check Name/Role/Aria-Label (High confidence)
                    if (tagMatch) {
                        if (attributes.name && node.getAttribute('name') === attributes.name) return node;
                        if (attributes.role && node.getAttribute('role') === attributes.role) return node;
                        if (attributes['aria-label'] && node.getAttribute('aria-label') === attributes['aria-label']) return node;
                        if (attributes.placeholder && node.getAttribute('placeholder') === attributes.placeholder) return node;
                        if (attributes.type && node.getAttribute('type') === attributes.type) return node;
                    }

                    // 3. Text content match for actionable elements
                    if (tagMatch && textContent) {
                        const directText = node.textContent?.trim() || '';
                        if (directText.includes(textContent.trim())) {
                            // If it's a perfect match or a high-confidence tag, return it
                            if (nodeTag === 'button' || nodeTag === 'a' || nodeTag === 'span') {
                                return node;
                            }
                        }
                    }

                    // Recursive search in shadow DOM
                    if (node.shadowRoot) {
                        const found = findInShadow(node.shadowRoot);
                        if (found) return found;
                    }
                    node = walker.nextNode() as Element | null;
                }
                return null;
            }
            return findInShadow(document.body);
        }, tagName, text, attr) as ElementHandle<Element> | null;
    }

    async scrollIntoViewIfNeeded(element: ElementHandle<Element>): Promise<void> {
        try {
            const result = await element.evaluate((el: Element) => {
                const rect = el.getBoundingClientRect();
                const inViewport =
                    rect.width > 0 &&
                    rect.height > 0 &&
                    rect.top >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

                if (!inViewport) {
                    el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
                }

                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.opacity === '0' || style.display === 'none') return 'hidden';

                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const elementAtPoint = document.elementFromPoint(centerX, centerY);
                const isCovered = elementAtPoint && !el.contains(elementAtPoint) && !elementAtPoint.contains(el);

                return isCovered ? 'covered' : 'ok';
            });

            if (result === 'covered') {
                logger.warning('Element appears covered; attempting overlay dismissal.');
                await this.dismissPotentialOverlays(element);
            } else if (result === 'hidden') {
                logger.warning('Element is hidden or has zero opacity.');
            }
        } catch {
            // If evaluate fails (detached frame, etc.) just proceed.
        }
    }

    private async dismissPotentialOverlays(element: ElementHandle<Element>): Promise<void> {
        try {
            await element.evaluate(() => {
                const closeButtonSelectors = [
                    '[aria-label*="close" i]',
                    '[aria-label*="dismiss" i]',
                    '[aria-label*="accept" i]',
                    '[aria-label*="agree" i]',
                    'button[id*="accept" i]',
                    'button[class*="accept" i]',
                    'button[id*="close" i]',
                    'button[class*="close" i]',
                    '[role="button"][id*="close" i]',
                    '[role="button"][class*="close" i]',
                ];

                const normalized = (value: string) => value.trim().toLowerCase();
                const textCandidates = ['accept', 'agree', 'ok', 'got it', 'continue', 'close', 'dismiss'];

                const tryClick = (candidate: Element | null): boolean => {
                    if (!candidate || !(candidate instanceof HTMLElement)) return false;
                    const rect = candidate.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    candidate.click();
                    return true;
                };

                for (const selector of closeButtonSelectors) {
                    const nodeList = Array.from(document.querySelectorAll(selector));
                    for (const node of nodeList) {
                        if (tryClick(node)) return;
                    }
                }

                const clickableNodes = Array.from(
                    document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]'),
                );
                for (const node of clickableNodes) {
                    const text = normalized((node.textContent || (node as HTMLInputElement).value || '').slice(0, 80));
                    if (textCandidates.some(candidate => text === candidate || text.startsWith(`${candidate} `))) {
                        if (tryClick(node)) return;
                    }
                }

                const modalLike = Array.from(
                    document.querySelectorAll(
                        '[role="dialog"], [aria-modal="true"], .modal, .popup, .overlay, [id*="cookie" i], [class*="cookie" i]',
                    ),
                );
                for (const node of modalLike) {
                    if (node instanceof HTMLElement) {
                        node.style.display = 'none';
                        node.setAttribute('aria-hidden', 'true');
                    }
                }

                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            });
        } catch (error) {
            logger.debug('Overlay dismissal attempt failed', error);
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
