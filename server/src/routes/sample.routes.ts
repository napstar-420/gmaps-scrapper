import type { Router as ExpressRouter } from 'express'
import { Router } from 'express'
import { getSample } from '../controllers/sample.controller.js'

export const sampleRouter: ExpressRouter = Router()

sampleRouter.get('/sample', getSample)

