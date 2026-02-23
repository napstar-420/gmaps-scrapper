import { db, sampleItems } from '../db/index.js'
import type { SampleItem } from '../db/schema.js'

export async function getSampleItems(): Promise<SampleItem[]> {
    return await db.select().from(sampleItems)
}
