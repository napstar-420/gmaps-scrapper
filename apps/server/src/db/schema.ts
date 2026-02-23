import { pgTable, serial, text } from 'drizzle-orm/pg-core'
import type { InferSelectModel } from 'drizzle-orm'

export const sampleItems = pgTable('sample_items', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
})

export type SampleItem = InferSelectModel<typeof sampleItems>
