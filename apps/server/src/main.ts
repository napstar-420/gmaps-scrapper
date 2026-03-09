#!/usr/bin/env node

import 'dotenv/config'
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import morgan from 'morgan'
import { serve } from 'inngest/express'
import { config } from './config.js'
import { inngest, functions } from './inngest/index.js'
import { apiRouter } from './routes/api.routes.js'
import { logger } from './logger.js'

const nodePath = resolve(process.argv[1])
const modulePath = resolve(fileURLToPath(import.meta.url))
const isCLI = nodePath === modulePath

export default function main(port: number = config.port) {
    const app = express()

    app.use(morgan('dev'))
    app.use(express.json())

    app.get('/', (_request: Request, response: Response) => {
        response.type('text/plain;charset=utf8')
        response.status(200).send('Olá, Hola, Hello!')
    })

    app.use('/api/inngest', serve({ client: inngest, functions }))
    app.use('/api', apiRouter)

    const server = createServer(app)

    if (isCLI) {
        server.listen(port)
        logger.info('Listening on http://localhost:%d', port)
    }

    return server
}

if (isCLI) {
    main()
}
