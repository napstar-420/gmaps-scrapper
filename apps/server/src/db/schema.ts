import { integer, pgTable, serial, text, timestamp, uniqueIndex, pgEnum, decimal } from 'drizzle-orm/pg-core'
import { sql, type InferSelectModel, InferInsertModel } from 'drizzle-orm'

const QueryStatus = pgEnum('query_status', ['pending', 'in_progress', 'completed', 'failed'])

export const place = pgTable('place', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    rating: decimal('rating', { precision: 2, scale: 1 }),
    reviewCount: integer('review_count'),
    phone: text('phone'),
    email: text('email'),
    link: text('link').notNull(),
    zipCode: text('zip_code'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => sql`CURRENT_TIMESTAMP`),
})

export const query = pgTable('query', {
    id: serial('id').primaryKey(),
    query: text('query').notNull(),
    status: QueryStatus('status').notNull().default('pending'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('completed_at'),
})

export const queryPlacesMappings = pgTable(
    'query_places_mappings',
    {
        id: serial('id').primaryKey(),
        queryId: integer('query_id').references(() => query.id),
        placeId: integer('place_id').references(() => place.id),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    table => [uniqueIndex('query_places_map_query_id_place_id_unique').on(table.queryId, table.placeId)],
)

export type Place = InferSelectModel<typeof place>
export type PlaceInsert = InferInsertModel<typeof place>

export type Query = InferSelectModel<typeof query>
export type QueryInsert = InferInsertModel<typeof query>
export type QueryStatus = (typeof QueryStatus.enumValues)[number]

export type QueryPlacesMappings = InferSelectModel<typeof queryPlacesMappings>
