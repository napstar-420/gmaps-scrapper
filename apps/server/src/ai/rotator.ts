const COOLDOWN_MS = 60_000

function parseKeysFromEnv(): string[] {
    const raw = process.env.GEMINI_API_KEYS ?? ''
    return raw
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
}

export class AllGeminiKeysRateLimitedError extends Error {
    readonly retryAfterMs: number

    constructor(retryAfterMs: number) {
        const secs = Math.ceil(retryAfterMs / 1000)
        super(`All Gemini API keys are rate limited. Earliest recovery in ${secs}s.`)
        this.name = 'AllGeminiKeysRateLimitedError'
        this.retryAfterMs = retryAfterMs
    }
}

export function isAllGeminiKeysRateLimitedError(e: unknown): e is AllGeminiKeysRateLimitedError {
    return e instanceof AllGeminiKeysRateLimitedError
}

export class GeminiKeyRotator {
    readonly keys: string[]
    index: number
    readonly cooldowns: Map<string, number>

    constructor() {
        this.keys = parseKeysFromEnv()
        this.index = 0
        this.cooldowns = new Map()
    }

    getKey(): string {
        if (this.keys.length === 0) {
            throw new Error('No GEMINI_API_KEYS configured (comma-separated list required)')
        }

        const now = Date.now()
        for (let offset = 0; offset < this.keys.length; offset++) {
            const i = (this.index + offset) % this.keys.length
            const key = this.keys[i]!
            const cooldownUntil = this.cooldowns.get(key) ?? 0
            if (cooldownUntil <= now) {
                this.index = i
                return key
            }
        }

        let earliest = Infinity
        for (const key of this.keys) {
            const until = this.cooldowns.get(key) ?? 0
            if (until > now) {
                earliest = Math.min(earliest, until)
            }
        }
        if (!Number.isFinite(earliest)) {
            throw new AllGeminiKeysRateLimitedError(COOLDOWN_MS)
        }
        throw new AllGeminiKeysRateLimitedError(earliest - now)
    }

    markRateLimited(key: string): void {
        this.cooldowns.set(key, Date.now() + COOLDOWN_MS)
        const i = this.keys.indexOf(key)
        if (i >= 0) {
            this.index = (i + 1) % this.keys.length
        }
    }

    getStatus(): { key: string; available: boolean; cooldownRemainingMs: number }[] {
        const now = Date.now()
        return this.keys.map(key => {
            const until = this.cooldowns.get(key) ?? 0
            const remaining = until > now ? until - now : 0
            return {
                key,
                available: remaining === 0,
                cooldownRemainingMs: remaining,
            }
        })
    }
}

export const geminiKeyRotator = new GeminiKeyRotator()
