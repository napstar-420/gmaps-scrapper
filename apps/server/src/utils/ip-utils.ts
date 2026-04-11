import type { Request } from 'express'
import { isIPv4, isIPv6 } from 'node:net'

/**
 * Strip IPv6 zone identifier (e.g. fe80::1%eth0) for a stable, comparable form.
 */
function stripIpv6Zone(ip: string): string {
    const i = ip.indexOf('%')
    return i === -1 ? ip : ip.slice(0, i)
}

/**
 * Normalize a client IP to either dotted IPv4 or lowercase IPv6.
 * Returns null if the value is missing or not a valid IP after parsing.
 */
export function normalizeClientIp(raw: string | null | undefined): string | null {
    if (raw == null) return null
    let ip = raw.trim()
    if (!ip) return null

    // [::1]:port
    if (ip.startsWith('[')) {
        const end = ip.indexOf(']')
        if (end !== -1) {
            ip = ip.slice(1, end)
        }
    } else {
        // IPv4 with port: 203.0.113.1:12345
        const lastColon = ip.lastIndexOf(':')
        if (lastColon > 0 && lastColon < ip.length - 1) {
            const host = ip.slice(0, lastColon)
            const tail = ip.slice(lastColon + 1)
            if (isIPv4(host) && /^\d{1,5}$/.test(tail) && Number(tail) <= 65535) {
                ip = host
            }
        }
    }

    ip = stripIpv6Zone(ip)

    const lower = ip.toLowerCase()
    if (lower.startsWith('::ffff:')) {
        const v4 = ip.slice(7)
        if (isIPv4(v4)) {
            return v4
        }
    }

    if (isIPv4(ip)) {
        return ip
    }

    if (isIPv6(ip)) {
        return lower
    }

    return null
}

function headerString(value: string | string[] | undefined): string | undefined {
    if (value == null) return undefined
    const s = Array.isArray(value) ? value[0] : value
    const t = typeof s === 'string' ? s.trim() : ''
    return t || undefined
}

/**
 * Best-effort client IP for an Express request.
 *
 * Prefer `req.ip` (honours `app.set('trust proxy', …)` and X-Forwarded-For when enabled).
 * Behind a reverse proxy, set trust proxy (e.g. `app.set('trust proxy', 1)`) so `req.ip`
 * is not spoofable from the wire without your proxy stripping/forging headers.
 *
 * Falls back to X-Real-IP only when trust proxy is enabled (same trust assumptions as forwarded headers).
 * Finally uses the TCP remote address.
 */
export function getIpAddress(req: Request): string | null {
    const trust = req.app.get('trust proxy')
    let raw: string | undefined = req.ip

    if (!raw && trust) {
        raw = headerString(req.headers['x-real-ip'])
    }

    raw ??= req.socket.remoteAddress ?? undefined

    return normalizeClientIp(raw)
}
