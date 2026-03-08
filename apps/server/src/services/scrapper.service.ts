import puppeteer, { Browser, Page } from 'puppeteer'
import { logger } from '../logger.js'
import { sleep } from '../utils/index.js'

/** Delay after initial page load before starting to scroll (ms). */
const INITIAL_LOAD_DELAY_MS: number = 3000
/** Delay between each scroll to avoid rate limits and allow content to load (ms). */
const SCROLL_DELAY_MS: number = 2000
/** Extra wait after scroll before measuring height (ms). */
const AFTER_SCROLL_WAIT_MS: number = 1500
/** Max scroll attempts; stop even if more results might exist. */
const MAX_SCROLL_ATTEMPTS: number | null = null
/** No new content after this many consecutive same-height scrolls = end of results. */
const SAME_HEIGHT_LIMIT: number = 3

/** Selectors for the scrollable results list panel (Google Maps may change these). */
const SCROLLABLE_SELECTORS = [
    '[role="feed"]', // results list (ARIA)
    '.m6QErb.DxyBCb.kA9KIf.dS8AEf', // main results list
    '.m6QErb[aria-label*="Results"]',
    '.m6QErb.xYexj',
    '.m6QErb',
]

export class ScrapperService {
    private browserInstance: Browser | null = null

    // Returns browser if it's already launched
    // Else creates a new browser and returns it
    private async getBrowser(): Promise<Browser> {
        logger.debug('Getting browser')
        if (this.browserInstance && this.browserInstance.connected) {
            logger.debug('Reusing exisiting browser instance')
            return this.browserInstance
        }

        if (this.browserInstance && !this.browserInstance.connected) {
            logger.debug('Killing existing browser instance')
            await this.browserInstance.close()
            this.browserInstance = null
        }

        logger.info('Creating new browser instance')
        try {
            this.browserInstance = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox'],
                defaultViewport: { width: 1920, height: 1080 },
                waitForInitialPage: true,
            })
            return this.browserInstance
        } catch (error) {
            logger.error('Error launching browser', error)
            throw error
        }
    }

    /**
     * Finds the scrollable results panel and scrolls it to the bottom.
     * Returns the scroll height after scrolling, or -1 if no scrollable panel found.
     */
    private async scrollResultsPanel(page: Page): Promise<number> {
        return page.evaluate((selectors: string[]) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel)
                if (el && el.scrollHeight > el.clientHeight) {
                    el.scrollTop = el.scrollHeight
                    return el.scrollHeight
                }
            }
            return -1
        }, SCROLLABLE_SELECTORS)
    }

    /**
     * Returns the current scroll height of the results panel, or -1 if not found.
     */
    private async getResultsPanelScrollHeight(page: Page): Promise<number> {
        return page.evaluate((selectors: string[]) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel)
                if (el) return el.scrollHeight
            }
            return -1
        }, SCROLLABLE_SELECTORS)
    }

    /**
     * Scrolls the results list until no new content loads or max attempts reached.
     * Uses delays to avoid rate limits and waits for loading to settle.
     */
    private async scrollUntilEndOfResults(page: Page): Promise<void> {
        let sameHeightCount = 0
        let lastHeight = 0
        let attempts = 0

        const condition = MAX_SCROLL_ATTEMPTS ? attempts < MAX_SCROLL_ATTEMPTS : true
        while (condition) {
            await sleep(SCROLL_DELAY_MS)

            const heightAfterScroll = await this.scrollResultsPanel(page)
            if (heightAfterScroll < 0) {
                logger.warn('Scrollable results panel not found; stopping scroll')
                break
            }

            await sleep(AFTER_SCROLL_WAIT_MS)
            const currentHeight = await this.getResultsPanelScrollHeight(page)

            if (currentHeight === lastHeight) {
                sameHeightCount += 1
                if (sameHeightCount >= SAME_HEIGHT_LIMIT) {
                    logger.debug('Reached end of results (no new content after scrolls)')
                    break
                }
            } else {
                sameHeightCount = 0
            }

            lastHeight = currentHeight
            attempts += 1
            logger.debug(`Scroll attempt ${attempts}, panel height: ${currentHeight}`)
        }

        if (MAX_SCROLL_ATTEMPTS && attempts >= MAX_SCROLL_ATTEMPTS) {
            logger.info(`Stopped after ${MAX_SCROLL_ATTEMPTS} scroll attempts`)
        }
    }

    public async scrape(query: string): Promise<void> {
        try {
            const browser = await this.getBrowser()
            const page = await browser.newPage()

            await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}?gl=us`, {
                waitUntil: 'domcontentloaded',
            })

            await sleep(INITIAL_LOAD_DELAY_MS)

            const listSelector = '[role="feed"], .m6QErb, [aria-label*="Results"]'
            try {
                await page.waitForSelector(listSelector, { timeout: 15000 })
            } catch {
                logger.warn('Results list selector did not appear within timeout; continuing')
            }

            await this.scrollUntilEndOfResults(page)

            await page.close()
        } catch (error) {
            logger.error('Error scraping', error)
            throw error
        }
    }
}

export const scrapperService = new ScrapperService()
