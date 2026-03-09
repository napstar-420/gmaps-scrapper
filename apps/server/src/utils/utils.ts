export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const normalizeQuery = (query: string) => {
    return query?.toLowerCase().trim() || ''
}

/**
 * Removes replacement char (�), Private Use (font icons), zero-width chars,
 * variation selectors, and emoji so addresses/names don't show rectangles or break DB display.
 */
export const sanitizeText = (s: string | null | undefined): string | null => {
    if (s == null || typeof s !== 'string') return null
    const t = s
        .replace(/\uFFFD/g, '') // replacement character
        .replace(/[\u200B-\u200D\uFEFF\uFE00-\uFE0F]/g, '') // zero-width, variation selectors
        .replace(/[\uE000-\uF8FF]/g, '') // Private Use (font icons – often show as rectangle)
        .replace(/[\uFFF0-\uFFFF]/g, '') // Specials block (replacement, etc.)
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // emoji/symbols
        .trim()
    return t || null
}
