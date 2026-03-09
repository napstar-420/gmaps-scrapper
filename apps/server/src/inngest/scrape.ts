import { inngest } from './inngest.js'
import { scrapperService } from '../services/scrapper.service.js'
import { INNGEST_EVENTS, INNGEST_FUNCTIONS } from '../constants/index.js'
import { createManyPlaces, createQuery, createQueryPlaceMappings, updateQuery } from '../repositories/index.js'

export const scrape = inngest.createFunction(
    { id: INNGEST_FUNCTIONS.SCRAPE },
    { event: INNGEST_EVENTS.SCRAPE_START },
    async ({ event, step }) => {
        const query = event.data.query as string

        const queryResult = await step.run('create-query', async () => {
            return await createQuery({
                query,
                startedAt: new Date(),
                status: 'in_progress',
                endedAt: null,
            })
        })

        if (queryResult.id == null) {
            throw new Error('Failed to create query: missing id')
        }

        const queryId = queryResult.id

        const scrapedPlaces = await step.run('scrape-places', async () => {
            try {
                return await scrapperService.scrape(query)
            } catch (err) {
                await updateQuery(queryId, {
                    status: 'failed',
                    endedAt: new Date(),
                })
                throw err
            }
        })

        const places = await step.run('create-places', async () => {
            return await createManyPlaces(scrapedPlaces)
        })

        const placeIds = places.map(place => {
            if (place.id == null) {
                throw new Error('Failed to create place: missing id')
            }
            return place.id
        })

        await step.run('create-query-place-mappings', async () => {
            return await createQueryPlaceMappings(queryId, placeIds)
        })

        await step.run('update-query', async () => {
            return await updateQuery(queryId, {
                status: 'completed',
                endedAt: new Date(),
            })
        })

        return {
            status: 'completed',
            timestamp: new Date(),
            queryId,
            placesCount: places.length,
        }
    },
)
