#!/usr/bin/env node

import 'dotenv/config'
import express, { Request, Response } from 'express'
import { createServer } from 'http'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { sampleRouter } from './routes/sample.routes.js'
import { logger } from './logger.js'

const nodePath = resolve(process.argv[1])
const modulePath = resolve(fileURLToPath(import.meta.url))
const isCLI = nodePath === modulePath

export default function main(port: number = config.port) {
    const app = express()

    app.get('/', (_request: Request, response: Response) => {
        response.type('text/plain;charset=utf8')
        response.status(200).send('Olá, Hola, Hello!')
    })

    app.use('/api', sampleRouter)

    const server = createServer(app)

    if (isCLI) {
        server.listen(port)
        logger.info('Listening on port %d', port)
    }

    return server
}

if (isCLI) {
    main()
}
