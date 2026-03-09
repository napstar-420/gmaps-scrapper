import type { Request, Response } from 'express'
import { logger } from '../logger.js'
import { normalizeQuery } from '../utils/index.js'
import { inngest } from '../inngest/index.js'
import { INNGEST_EVENTS } from '../constants/index.js'

export async function startScraping(req: Request, res: Response): Promise<void> {
    const query = normalizeQuery(req.body?.query)

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
        await inngest.send({
            name: INNGEST_EVENTS.SCRAPE_START,
            data: { query },
        })
        res.status(200).json({ message: 'Scraping started' })
        return
    } catch (error) {
        logger.error('Error starting scraping', error)
        res.status(500).json({ error: 'Failed to start scraping' })
        return
    }
}
