import { place as placeTable, db } from '../db/index.js'
import type { PlaceInsert } from '../db/schema.js'

export const createPlace = async (place: PlaceInsert) => {
    const [placeResult] = await db.insert(placeTable).values(place).returning()
    return placeResult
}

export const createManyPlaces = async (places: PlaceInsert[]) => {
    const placeResults = await db.insert(placeTable).values(places).returning()
    return placeResults
}
