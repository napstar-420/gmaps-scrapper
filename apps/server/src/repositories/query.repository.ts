import { eq } from 'drizzle-orm'
import { query as queryTable, db } from '../db/index.js'
import type { QueryInsert } from '../db/schema.js'

export const createQuery = async (query: QueryInsert) => {
    const [queryResult] = await db.insert(queryTable).values(query).returning()
    return queryResult
}

export const updateQuery = async (id: number, query: Partial<QueryInsert>) => {
    await db.update(queryTable).set(query).where(eq(queryTable.id, id))
}
