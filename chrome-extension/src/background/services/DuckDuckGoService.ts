import { createLogger } from '@src/background/log';

const logger = createLogger('DuckDuckGoService');

export interface SearchResult {
    title: string;
    url: string;
    description: string;
}

/**
 * Service to fetch and parse search results from DuckDuckGo.
 * Uses the "Lite" version of DuckDuckGo for easier parsing without JavaScript.
 */
export class DuckDuckGoService {
    /**
     * Performs a web search and returns the top results.
     * 
     * @param query The search query.
     * @returns A list of structured search results.
     */
    static async search(query: string): Promise<SearchResult[]> {
        logger.info('Performing DuckDuckGo search', { query });

        try {
            const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch from DuckDuckGo: ${response.statusText}`);
            }

            const html = await response.text();
            return this.parseResults(html);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('DuckDuckGo search failed', { query, error: errorMessage });
            throw error;
        }
    }

    /**
     * Parses the HTML from DuckDuckGo Lite into structured results.
     * 
     * @param html The HTML source of the search results page.
     * @returns An array of results.
     */
    private static parseResults(html: string): SearchResult[] {
        const results: SearchResult[] = [];

        // DuckDuckGo Lite uses tables for results.
        // We look for the main results block.
        // Each result starts with a td with a class link or similar.
        // Pattern: <a rel="nofollow" href="(.*?)" class="result-link">(.*?)</a>
        // Followed by <span class="result-snippet">(.*?)</span>

        const resultRegex = /<a rel="nofollow" href="(.*?)" class="result-link">([\s\S]*?)<\/a>[\s\S]*?<span class="result-snippet">([\s\S]*?)<\/span>/g;
        let match;

        while ((match = resultRegex.exec(html)) !== null && results.length < 8) {
            const [, url, title, snippet] = match;

            // Basic clean up of HTML entities and tags
            results.push({
                url: this.decodeHtmlEntities(url),
                title: this.stripTags(this.decodeHtmlEntities(title)),
                description: this.stripTags(this.decodeHtmlEntities(snippet)).trim()
            });
        }

        logger.info('Parsed DuckDuckGo results', { count: results.length });
        return results;
    }

    private static decodeHtmlEntities(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }

    private static stripTags(text: string): string {
        return text.replace(/<[^>]*>/g, '');
    }
}
