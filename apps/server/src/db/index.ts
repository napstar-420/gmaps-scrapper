import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { place, query, queryPlacesMappings } from './schema.js'
import { config } from '../config.js'

const client = postgres(config.dbUrl, {
    max: 1,
    prepare: false,
})

export const db = drizzle(client)
export { place, query, queryPlacesMappings }
