import type { Request, Response } from 'express'
import { scrapperService } from '../services/scrapper.service.js'
import { logger } from '../logger.js'

export async function startScraping(req: Request, res: Response): Promise<void> {
    const query = req.body?.query

    if (!query) {
        res.status(400).json({ error: 'Query is required' })
        return
    }

    if (query.length < 5) {
        res.status(400).json({ error: 'Query must be at least 5 characters' })
        return
    }

    if (query.length > 255) {
        res.status(400).json({ error: 'Query must be at most 255 characters' })
        return
    }

    try {
        await scrapperService.scrape(query)
        res.sendStatus(200)
    } catch (error) {
        logger.error('Error starting scraping', error)
        res.status(500).json({ error: 'Failed to start scraping' })
        return
    }
}
