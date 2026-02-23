import winston from 'winston'
import { env } from './config.js'

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
}

export const logger = winston.createLogger({
    level: env.isProduction ? 'warn' : 'debug',
    levels,
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamps
        winston.format.json(), // Structured JSON logging
    ),
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Colorize log levels for console readability
                winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
            ),
            handleExceptions: true, // Log uncaught exceptions
            handleRejections: true, // Log unhandled promise rejections
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            level: 'info',
        }),
        new winston.transports.File({
            filename: 'logs/errors.log',
            level: 'error',
        }),
    ],
    exitOnError: false, // Do not exit on handled exceptions
})
