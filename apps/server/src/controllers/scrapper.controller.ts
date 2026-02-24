import type { Request, Response } from 'express'

export async function startScraping(_req: Request, res: Response): Promise<void> {
    res.sendStatus(200)
}
