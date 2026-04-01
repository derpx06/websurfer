import {
    connect,
    ExtensionTransport,
    type ProtocolType,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import type { Browser } from 'puppeteer-core/lib/esm/puppeteer/api/Browser.js';
import type { Page as PuppeteerPage } from 'puppeteer-core/lib/esm/puppeteer/api/Page.js';
import { createLogger } from '@src/background/log';
import { isUrlAllowed } from '../util';
import { type BrowserContextConfig, URLNotAllowedError } from '../views';

const logger = createLogger('LifecycleManager');

export class LifecycleManager {
    private _browser: Browser | null = null;
    private _puppeteerPage: PuppeteerPage | null = null;

    constructor(private readonly tabId: number, private readonly config: BrowserContextConfig) { }

    get browser() {
        return this._browser;
    }
    get puppeteerPage() {
        return this._puppeteerPage;
    }

    async attach(): Promise<boolean> {
        if (this._puppeteerPage) return true;

        logger.info('attaching puppeteer', this.tabId);
        try {
            const browser = await connect({
                transport: await ExtensionTransport.connectTab(this.tabId),
                defaultViewport: null,
                protocol: 'cdp' as ProtocolType,
            });
            this._browser = browser;

            const [page] = await browser.pages();
            this._puppeteerPage = page;
            await this.addAntiDetectionScripts();
            return true;
        } catch (error) {
            logger.error('Failed to attach puppeteer:', error);
            return false;
        }
    }

    async detach(): Promise<void> {
        if (this._browser) {
            await this._browser.disconnect();
            this._browser = null;
            this._puppeteerPage = null;
        }
    }

    async ensurePageAccessible(): Promise<void> {
        if (!this._puppeteerPage) return;

        try {
            // Simple test to see if page is still responsive
            await this._puppeteerPage.evaluate('1');
        } catch (error) {
            logger.warning('Page is not accessible, attempting to recover...', error);
            if (this._browser) {
                const pages = await this._browser.pages();
                if (pages.length > 0) {
                    this._puppeteerPage = pages[0];
                    logger.info('Recovered page handle');
                } else {
                    throw new Error('Browser closed: no valid pages available');
                }
            }
        }
    }

    private async addAntiDetectionScripts(): Promise<void> {
        if (!this._puppeteerPage) return;
        await this._puppeteerPage.evaluateOnNewDocument(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      (function () {
        const originalAttachShadow = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function attachShadow(options) {
          return originalAttachShadow.call(this, { ...options, mode: "open" });
        };
      })();
    `);
    }

    async navigateTo(url: string, waitForLoad: () => Promise<void>): Promise<void> {
        if (!this._puppeteerPage) return;
        logger.info('navigateTo', url);

        if (!isUrlAllowed(url, this.config.allowedUrls, this.config.deniedUrls)) {
            throw new URLNotAllowedError(`URL: ${url} is not allowed`);
        }

        try {
            await Promise.all([waitForLoad(), this._puppeteerPage.goto(url)]);
        } catch (error) {
            if (error instanceof URLNotAllowedError) throw error;
            if (error instanceof Error && error.message.includes('timeout')) {
                logger.warning('Navigation timeout, but page might still be usable');
                return;
            }
            logger.error('Navigation failed:', error);
            throw error;
        }
    }
}
