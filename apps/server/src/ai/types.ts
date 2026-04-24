/** Output of `generateJobPlan` (single Gemini call). */
export interface JobPlan {
    /** Refined / enhanced Google Maps search strings (typically 3–5). */
    queries: string[]
    /**
     * Target cities for the job.
     * - If the user named a city: **exactly one** entry for that place.
     * If the user did not name a city: the **full** model-recommended list for the country (any length ≥ 1; no fixed cap).
     */
    cities: Array<{
        name: string
        lat: number
        lng: number
        radius_meters: number
    }>
}

export interface CityContext {
    cityName: string
    cityLat: number
    cityLng: number
    cityRadius: number
    query: string
    recordsFound: number
    scrapedAreas: Array<{
        lat: number
        lng: number
        radius_meters: number
        records_found: number
    }>
}

export interface NextArea {
    lat: number
    lng: number
    radius_meters: number
    reasoning: string
}
