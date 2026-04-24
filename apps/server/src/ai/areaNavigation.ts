import { callGemini } from './gemini.js'
import type { CityContext, NextArea } from './types.js'

const SYSTEM_INSTRUCTION =
    'You are a geographic coverage assistant. You always respond with valid JSON only. No explanation, no markdown, no code fences.'

const MAX_SCRAPED_AREAS_IN_PROMPT = 20

/**
 * Picks the next scrape area for a city. If Gemini returns exhaustion (`next_area: null`), returns `null`.
 *
 * **Inngest contract:** If this throws `AllGeminiKeysRateLimitedError` (all keys in cooldown), return
 * `{ rateLimited: true, retryAfterMs }` and `step.sleep(retryAfterMs)` before retrying.
 * For any other error, treat the city as exhausted: log, mark city done, continue (same as `null`).
 */
export async function getNextArea(cityContext: CityContext): Promise<NextArea | null> {
    const total = cityContext.scrapedAreas.length
    const recent = cityContext.scrapedAreas.slice(-MAX_SCRAPED_AREAS_IN_PROMPT)
    const n = recent.length

    const prompt = `You are helping scrape Google Maps for "${cityContext.query}" in ${cityContext.cityName}.

City center: lat ${cityContext.cityLat}, lng ${cityContext.cityLng}
City search radius: ${cityContext.cityRadius} meters

Already scraped areas (most recent ${n} of ${total}):
${JSON.stringify(recent, null, 2)}

Total records found in this city so far: ${cityContext.recordsFound}

Decide the next area to scrape. Your goal is to maximize geographic coverage without repeating already-covered areas.

Return a JSON object:
{
  "next_area": {
    "lat": number,
    "lng": number,
    "radius_meters": number,
    "reasoning": string   // 1 sentence explaining why this area
  } | null   // return null if you believe the city is fully covered or diminishing returns are severe
}

Rules:
- Choose an area that doesn't significantly overlap with already-scraped areas
- Stay within or near the city's overall bounding radius
- Shrink radius_meters for dense urban cores, increase for sparse suburban/rural outskirts
- Return null if: all major areas of the city have been covered, or the last 3 areas returned 0 new records
- The reasoning field is required and helps with debugging`

    const raw = await callGemini<unknown>(prompt, SYSTEM_INSTRUCTION, 300)
    return parseNextArea(raw)
}

function parseNextArea(raw: unknown): NextArea | null {
    if (raw === null || typeof raw !== 'object') {
        throw new Error('Next area: expected a JSON object')
    }
    const o = raw as Record<string, unknown>
    const next = o.next_area
    if (next === null) {
        return null
    }
    if (next === undefined) {
        throw new Error('Next area: missing "next_area" field')
    }
    if (typeof next !== 'object') {
        throw new Error('Next area: "next_area" must be an object or null')
    }
    const a = next as Record<string, unknown>
    const lat = a.lat
    const lng = a.lng
    const radius_meters = a.radius_meters
    const reasoning = a.reasoning
    if (typeof lat !== 'number' || !Number.isFinite(lat)) {
        throw new Error('Next area: "lat" must be a finite number')
    }
    if (typeof lng !== 'number' || !Number.isFinite(lng)) {
        throw new Error('Next area: "lng" must be a finite number')
    }
    if (typeof radius_meters !== 'number' || !Number.isFinite(radius_meters) || radius_meters <= 0) {
        throw new Error('Next area: "radius_meters" must be a positive finite number')
    }
    if (typeof reasoning !== 'string' || reasoning.trim() === '') {
        throw new Error('Next area: "reasoning" must be a non-empty string')
    }
    return { lat, lng, radius_meters, reasoning }
}
