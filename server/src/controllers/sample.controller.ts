import type { Request, Response } from 'express'
import { getSampleItems } from '../services/sample.service.js'

export async function getSample(_req: Request, res: Response): Promise<void> {
  const items = await getSampleItems()
  res.status(200).json({ items })
}
