import { callGemini } from './gemini.js'
import type { JobPlan } from './types.js'

const SYSTEM_INSTRUCTION =
    'You are a geographic search planning assistant. You always respond with valid JSON only. No explanation, no markdown, no code fences.'

function buildPrompt(baseQuery: string, country: string, city: string | undefined): string {
    const cityLine = city
        ? `City (user-specified): ${city}`
        : 'No city specified — you must choose the full set of cities to cover this search across the country.'

    return `The user wants to scrape Google Maps for: "${baseQuery}"
Country: ${country}
${cityLine}

Return a JSON object with this exact shape:
{
  "queries": string[],      // 3-5 refined, enhanced Google Maps search queries derived from the base query
  "cities": [
    {
      "name": string,        // human-readable city name
      "lat": number,         // city center latitude
      "lng": number,         // city center longitude
      "radius_meters": number // small focused search radius, typically 1500–5000 meters, so Maps can surface most businesses in that area
    }
  ]
}

Rules:
- queries should be varied and fine-tuned for Maps — include the base term, category synonyms, and local language variants if relevant
- If a city was specified above, return only that one city in the cities array (exactly one entry)
- If no city was specified, return the complete list of cities you recommend scraping for this query in this country — include every urban area that should be covered; there is no minimum or maximum number of cities, use your judgment (aim for broad geographic spread and major population centers where relevant)
- radius_meters should be small and focused so Google Maps can show most businesses in that area
- Use 1500–3000 meters for dense urban areas and 3000–5000 meters for sparse or suburban areas
- Do not return broad city-wide radii; coverage will be expanded later by getNextArea
- Return only the JSON object, nothing else`
}

const JOB_PLAN_MAX_OUTPUT_TOKENS = 2000

function validateJobPlan(raw: unknown, userSpecifiedCity: string | undefined): JobPlan {
    if (raw === null || typeof raw !== 'object') {
        throw new Error('Job plan: expected a JSON object')
    }
    const o = raw as Record<string, unknown>
    const queries = o.queries
    if (!Array.isArray(queries) || queries.length === 0) {
        throw new Error('Job plan: "queries" must be a non-empty array of strings')
    }
    for (const q of queries) {
        if (typeof q !== 'string' || q.trim() === '') {
            throw new Error('Job plan: every query must be a non-empty string')
        }
    }

    const cities = o.cities
    if (!Array.isArray(cities) || cities.length === 0) {
        throw new Error('Job plan: "cities" must be a non-empty array')
    }

    const outCities: JobPlan['cities'] = []
    for (let i = 0; i < cities.length; i++) {
        const c = cities[i]
        if (c === null || typeof c !== 'object') {
            throw new Error(`Job plan: cities[${i}] must be an object`)
        }
        const co = c as Record<string, unknown>
        const name = co.name
        const lat = co.lat
        const lng = co.lng
        const radius_meters = co.radius_meters
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error(`Job plan: cities[${i}].name must be a non-empty string`)
        }
        if (typeof lat !== 'number' || !Number.isFinite(lat)) {
            throw new Error(`Job plan: cities[${i}].lat must be a finite number`)
        }
        if (typeof lng !== 'number' || !Number.isFinite(lng)) {
            throw new Error(`Job plan: cities[${i}].lng must be a finite number`)
        }
        if (typeof radius_meters !== 'number' || !Number.isFinite(radius_meters) || radius_meters <= 0) {
            throw new Error(`Job plan: cities[${i}].radius_meters must be a positive finite number`)
        }
        outCities.push({ name, lat, lng, radius_meters })
    }

    if (userSpecifiedCity !== undefined && outCities.length !== 1) {
        throw new Error(
            `Job plan: when a city is specified, "cities" must contain exactly one entry (got ${outCities.length})`,
        )
    }

    return { queries: queries as string[], cities: outCities }
}

/**
 * Single-shot job planning: refined Google Maps queries plus a city list.
 *
 * - If `city` is set: `cities` will contain **exactly one** entry for that place.
 * - If `city` is omitted: `cities` is the **full** model-chosen list for the country (any length ≥ 1).
 *
 * Workers should iterate `cities` in order and use `getNextArea` for coverage within each city. On throw, fail the job with
 * `AI planning failed: ${error.message}` and do not enqueue downstream work.
 */
export async function generateJobPlan(baseQuery: string, country: string, city?: string): Promise<JobPlan> {
    const prompt = buildPrompt(baseQuery, country, city)
    const raw = await callGemini<unknown>(prompt, SYSTEM_INSTRUCTION, JOB_PLAN_MAX_OUTPUT_TOKENS)
    return validateJobPlan(raw, city)
}
