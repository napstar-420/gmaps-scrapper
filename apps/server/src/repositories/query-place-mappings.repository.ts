import { queryPlacesMappings as queryPlacesMappingsTable, db } from '../db/index.js'

export const createQueryPlaceMappings = async (queryId: number, placeIds: number[]) => {
    const result = await db
        .insert(queryPlacesMappingsTable)
        .values(placeIds.map(placeId => ({ queryId, placeId })))
        .returning()
    return result
}
