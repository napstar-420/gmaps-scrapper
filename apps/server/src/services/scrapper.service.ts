import puppeteer, { Browser, Page } from 'puppeteer'
import { logger } from '../logger.js'
import { sanitizeText, sleep } from '../utils/index.js'
import type { Place } from 'src/db/schema.js'

type ScrapedPlace = Omit<Place, 'id' | 'createdAt' | 'updatedAt'>

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
/** Short delay after clicking a place so the panel starts opening (ms). */
const DETAIL_PANEL_CLICK_SETTLE_MS: number = 500
/** Max time to wait for detail panel content to appear before giving up (ms). */
const DETAIL_PANEL_LOAD_TIMEOUT_MS: number = 20000
/** Delay between opening each place's detail to avoid rate limits (ms). */
const BETWEEN_PLACES_DELAY_MS: number = 1500

/** Selectors that indicate the place detail panel has loaded (any one is enough). */
const DETAIL_PANEL_READY_SELECTORS =
    '.DUwDvf, button[data-item-id="address"], a[href^="tel:"], button[data-tooltip="Copy phone number"], [data-item-id="phone:tel"], .RcCsl'

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
     * Extracts only place links from the feed (no card data).
     * Used after scrolling so we know which panels to open. Deduplicates by place URL.
     */
    private async extractPlaceLinksFromFeed(page: Page): Promise<string[]> {
        return page.evaluate(() => {
            const feed = document.querySelector('[role="feed"]') ?? document.querySelector('.m6QErb')
            if (!feed) return []

            const links = feed.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]')
            const seen = new Set<string>()
            const urls: string[] = []

            for (const a of links) {
                const href = a.getAttribute('href') ?? ''
                const placeUrl = href.split('/@')[0] ?? href
                if (!placeUrl || seen.has(placeUrl)) continue
                seen.add(placeUrl)
                const fullUrl = placeUrl.startsWith('http')
                    ? placeUrl
                    : `https://www.google.com${placeUrl.startsWith('/') ? placeUrl : `/${placeUrl}`}`
                urls.push(fullUrl)
            }
            return urls
        })
    }

    /**
     * Extracts all place details from the currently open side panel (single source of truth).
     * Call with the place link we opened so it can be included in the result.
     */
    private async extractPlaceFromPanel(page: Page, placeLink: string): Promise<ScrapedPlace> {
        const partial = await page.evaluate(() => {
            const trim = (s: string | null | undefined) => s?.trim() || null

            let name: string = 'Unknown'
            const titleEl = document.querySelector('.DUwDvf')
            if (titleEl) name = trim(titleEl.textContent) ?? name

            let rating: string | null = null
            let reviewCount: number | null = null
            const ratingBlock = document.querySelector('.F7nice')
            if (ratingBlock) {
                const text = ratingBlock.textContent ?? ''
                const ratingMatch = text.match(/(\d+[.,]\d+)/)
                if (ratingMatch) rating = ratingMatch[1].replace(',', '.')
                const countMatch = text.match(/\(([\d,]+)/)
                if (countMatch) reviewCount = parseInt(countMatch[1].replace(/,/g, ''), 10)
            }

            let address: string | null = null
            const addressBtn = document.querySelector('button[data-item-id="address"], [data-item-id="address"]')
            address = trim(addressBtn?.textContent)

            let phone: string | null = null
            const telLink = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]')
            if (telLink) {
                phone = trim(telLink.getAttribute('href')?.replace(/^tel:/i, '')) ?? trim(telLink.textContent)
            }
            if (!phone) {
                const copyPhone = document.querySelector(
                    'button[data-tooltip="Copy phone number"], button[data-item-id="phone:tel"], [data-item-id="phone:tel"]',
                )
                phone = trim(copyPhone?.textContent)
            }

            let email: string | null = null
            const mailLink = document.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')
            if (mailLink) {
                email = trim(mailLink.getAttribute('href')?.replace(/^mailto:/i, '')) ?? trim(mailLink.textContent)
            }
            if (!email) {
                const copyEmail = document.querySelector(
                    'button[data-tooltip="Copy email"], button[data-item-id="email"], [data-item-id="email"]',
                )
                email = trim(copyEmail?.textContent)
            }

            let zipCode: string | null = null
            if (address) {
                const usZip = address.match(/\b(\d{5}(?:-\d{4})?)\b/)
                const ukPostcode = address.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)
                if (usZip) zipCode = usZip[1]
                else if (ukPostcode) zipCode = ukPostcode[1].trim()
            }

            return {
                name,
                address,
                rating,
                reviewCount,
                phone,
                email,
                zipCode,
            }
        })

        const cleaned = {
            name: sanitizeText(partial.name) ?? partial.name,
            address: sanitizeText(partial.address) ?? partial.address,
            rating: partial.rating,
            reviewCount: partial.reviewCount,
            phone: sanitizeText(partial.phone) ?? partial.phone,
            email: sanitizeText(partial.email) ?? partial.email,
            zipCode: sanitizeText(partial.zipCode) ?? partial.zipCode,
            link: placeLink,
        }
        logger.debug('Place (cleaned): %j', cleaned)

        return cleaned
    }

    /**
     * Waits for the place detail panel to finish loading (content visible).
     * Uses content selectors and a timeout so it adapts to connection speed.
     * Returns true if panel content appeared within the timeout, false otherwise.
     */
    private async waitForDetailPanelLoaded(page: Page): Promise<boolean> {
        await sleep(DETAIL_PANEL_CLICK_SETTLE_MS)
        try {
            await page.waitForSelector(DETAIL_PANEL_READY_SELECTORS, {
                timeout: DETAIL_PANEL_LOAD_TIMEOUT_MS,
                visible: true,
            })
            return true
        } catch {
            return false
        }
    }

    /**
     * Clicks the place link in the feed that matches the given place URL to open its detail panel.
     * Returns true if a matching link was found and clicked.
     */
    private async openPlaceDetailPanel(page: Page, placeLink: string): Promise<boolean> {
        const placePath = placeLink.replace(/^https?:\/\/www\.google\.com/i, '')
        return page.evaluate((path: string) => {
            const feed = document.querySelector('[role="feed"]') ?? document.querySelector('.m6QErb')
            if (!feed) return false
            const links = feed.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]')
            for (const a of links) {
                const href = a.getAttribute('href') ?? ''
                const normalized = href.split('/@')[0] ?? href
                if (
                    normalized.includes(path) ||
                    path.includes(normalized) ||
                    (path.startsWith('/') && normalized === path)
                ) {
                    a.scrollIntoView({ block: 'center' })
                    a.click()
                    return true
                }
            }
            return false
        }, placePath)
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

    /**
     * Opens each place's side panel and extracts all details from the panel (not from the card).
     * Returns one ScrapedPlace per link; skips places whose panel fails to open or load.
     */
    private async scrapePlacesFromPanels(page: Page, placeLinks: string[]): Promise<ScrapedPlace[]> {
        const places: ScrapedPlace[] = []
        for (let i = 0; i < placeLinks.length; i++) {
            const link = placeLinks[i]
            try {
                const opened = await this.openPlaceDetailPanel(page, link)
                if (!opened) {
                    logger.debug(`Could not open detail panel for place ${i + 1}: ${link}`)
                    await sleep(BETWEEN_PLACES_DELAY_MS)
                    continue
                }
                const panelLoaded = await this.waitForDetailPanelLoaded(page)
                if (!panelLoaded) {
                    logger.debug(`Detail panel did not load in time for place ${i + 1}: ${link}`)
                    await sleep(BETWEEN_PLACES_DELAY_MS)
                    continue
                }
                const place = await this.extractPlaceFromPanel(page, link)
                places.push(place)
            } catch (err) {
                logger.warn(`Error scraping place ${i + 1} from panel:`, err)
            }
            await sleep(BETWEEN_PLACES_DELAY_MS)
        }
        return places
    }

    public async scrape(query: string): Promise<ScrapedPlace[]> {
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

            const placeLinks = await this.extractPlaceLinksFromFeed(page)
            logger.info(`Found ${placeLinks.length} places for query: ${query}; scraping details from side panels…`)

            const places = await this.scrapePlacesFromPanels(page, placeLinks)

            logger.info(`Scraped ${places.length} places for query: ${query}`)
            await page.close()
            return places
        } catch (error) {
            logger.error('Error scraping', error)
            throw error
        }
    }
}

export const scrapperService = new ScrapperService()
