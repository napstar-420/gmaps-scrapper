import type { Router as ExpressRouter } from 'express'
import { Router } from 'express'
import { startScraping } from '../controllers/scrapper.controller.js'

export const apiRouter: ExpressRouter = Router()

apiRouter.post('/start', startScraping)
