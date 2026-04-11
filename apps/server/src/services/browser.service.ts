import puppeteer, { Browser, Page } from 'puppeteer'
import { logger } from '../logger.js'

export type { Browser, Page } from 'puppeteer'

/**
 * Owns the Puppeteer browser lifecycle. Other services should use this module
 * instead of importing `puppeteer` directly.
 */
class BrowserService {
    private browser: Browser | null = null

    /**
     * Returns a connected browser instance, launching one if needed.
     */
    public async getBrowser(): Promise<Browser> {
        logger.debug('Getting browser')
        if (this.browser?.connected) {
            logger.debug('Reusing existing browser instance')
            return this.browser
        }

        if (this.browser && !this.browser.connected) {
            logger.debug('Replacing disconnected browser instance')
            try {
                await this.browser.close()
            } catch (error) {
                logger.warn('Error closing disconnected browser', error)
            }
            this.browser = null
        }

        const headless = process.env.NODE_ENV !== 'development'
        logger.info('Creating new browser instance', { headless })
        try {
            this.browser = await puppeteer.launch({
                headless,
                args: ['--no-sandbox'],
                defaultViewport: { width: 1920, height: 1080 },
                waitForInitialPage: true,
            })
            return this.browser
        } catch (error) {
            logger.error('Error launching browser', error)
            throw error
        }
    }

    /**
     * Opens a new tab attached to the shared browser.
     */
    public async newPage(): Promise<Page> {
        const browser = await this.getBrowser()
        return browser.newPage()
    }

    /**
     * Closes the shared browser if it exists. Safe to call when already closed.
     */
    public async closeBrowser(): Promise<void> {
        if (!this.browser) return
        const b = this.browser
        this.browser = null
        try {
            await b.close()
            logger.info('Browser instance closed (puppeteer)')
        } catch (error) {
            logger.error('Error closing browser', error)
        }
    }

    /** Whether the singleton browser exists and is connected. */
    public isConnected(): boolean {
        return Boolean(this.browser?.connected)
    }
}

export const browserService = new BrowserService()
