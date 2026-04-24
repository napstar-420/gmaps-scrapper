import { ApiError, GoogleGenAI } from '@google/genai'
import { geminiKeyRotator } from './rotator.js'

const MODEL = 'gemini-1.5-flash'

function is429(e: unknown): boolean {
    return e instanceof ApiError && e.status === 429
}

/**
 * Single entry point for Gemini JSON responses. Uses `@google/genai` ({@link GoogleGenAI}).
 * On HTTP 429, rotates API keys up to `keys.length` attempts.
 */
export async function callGemini<T = unknown>(
    prompt: string,
    systemInstruction: string,
    maxOutputTokens: number,
): Promise<T> {
    const rotator = geminiKeyRotator
    const maxAttempts = rotator.keys.length
    if (maxAttempts === 0) {
        throw new Error('No GEMINI_API_KEYS configured (comma-separated list required)')
    }

    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const key = rotator.getKey()

        try {
            const ai = new GoogleGenAI({ apiKey: key })
            const response = await ai.models.generateContent({
                model: MODEL,
                contents: prompt,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    maxOutputTokens,
                },
            })

            const text = response.text?.trim()
            if (text == null || text === '') {
                throw new Error('Gemini returned empty response text')
            }

            try {
                return JSON.parse(text) as T
            } catch (parseErr) {
                const hint = parseErr instanceof Error ? parseErr.message : String(parseErr)
                throw new Error(`Gemini JSON parse failed: ${hint}. Raw: ${text}`)
            }
        } catch (e) {
            if (is429(e)) {
                rotator.markRateLimited(key)
                lastError = e
                continue
            }
            throw e
        }
    }

    if (lastError != null) {
        throw lastError
    }
    throw new Error('Gemini: exhausted API retries after rate limits')
}
