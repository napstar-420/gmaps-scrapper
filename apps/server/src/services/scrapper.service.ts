import puppeteer, { Browser } from 'puppeteer'
import { logger } from '../logger.js'
import { sleep } from '../utils/index.js'

export class ScrapperService {
    private browserInstance: Browser | null = null

    // Returns browser if it's already launched
    // Else creates a new browser and returns it
    private async getBrowser(): Promise<Browser> {
        logger.debug('Getting browser')
        if (this.browserInstance) {
            logger.debug('Reusing exisiting browser instance')
            return this.browserInstance
        }

        logger.info('Creating new browser instance')
        try {
            this.browserInstance = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] })
            return this.browserInstance
        } catch (error) {
            logger.error('Error launching browser', error)
            throw error
        }
    }

    public async scrape(query: string): Promise<void> {
        const browser = await this.getBrowser()
        const page = await browser.newPage()
        await page.goto(`https://www.google.com/search?q=${query}`)
        await sleep(100000)
        await page.close()
    }
}

export const scrapperService = new ScrapperService()
