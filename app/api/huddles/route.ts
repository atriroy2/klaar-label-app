import { NextResponse } from 'next/server'
import { getBackendHeaders } from './backend-headers'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL || process.env.NEXT_PUBLIC_HUDDLE_API_URL || ''

async function proxyGet(request: Request) {
    if (!HUDDLE_API_URL) {
        return NextResponse.json({ error: 'Huddle API URL not configured' }, { status: 502 })
    }
    const auth = await getBackendHeaders(request)
    if (!auth.ok) return auth.response
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const url = `${HUDDLE_API_URL}/api/huddles${query ? `?${query}` : ''}`
    let res: Response
    try {
        res = await fetch(url, {
            method: 'GET',
            headers: auth.headers,
            cache: 'no-store',
        })
    } catch (err) {
        console.error('Huddle API fetch failed:', err)
        return NextResponse.json(
            { error: 'Could not reach Huddle API. Check HUDDLE_API_URL (or NEXT_PUBLIC_HUDDLE_API_URL) and that the backend is running.' },
            { status: 502 }
        )
    }
    const text = await res.text()
    let data: unknown
    try {
        data = text.length > 0 ? JSON.parse(text) : {}
    } catch {
        // non-JSON response handled below
        const preview = text.slice(0, 200).replace(/\s+/g, ' ').trim()
        console.error('Huddle API returned non-JSON:', res.status, preview)
        return NextResponse.json(
            {
                error: 'Huddle API returned an invalid response (not JSON).',
                detail: res.status >= 400
                    ? `Backend returned ${res.status}. It may be an error page or wrong URL. Check HUDDLE_API_URL points to the correct API (e.g. .../api/huddles).`
                    : 'Check that the backend returns JSON for GET /api/huddles.',
            },
            { status: 502 }
        )
    }
    if (res.status === 401 && typeof data === 'object' && data !== null && !('detail' in (data as object))) {
        if (process.env.HUDDLE_API_KEY) {
            console.warn(
                '[Huddle proxy] Backend returned 401. We sent X-API-Key and X-User-Email. Check: (1) HUDDLE_API_KEY is identical in both apps (no extra spaces), (2) backend auth runs before 401, (3) backend env var is named HUDDLE_API_KEY.'
            )
        }
        return NextResponse.json(
            {
                ...(data as Record<string, unknown>),
                error: (data as { error?: string }).error ?? 'Unauthorized',
                detail: process.env.HUDDLE_API_KEY
                    ? 'Backend rejected the request. Checklist: (1) HUDDLE_API_KEY is the exact same string in both Klaar Label and the backend (copy-paste, no spaces). (2) Backend is deployed with the API-key auth code and reads the env var. (3) Backend compares X-API-Key to that value and accepts when it matches.'
                    : 'The huddle backend could not verify your session. Either (1) set the same NEXTAUTH_SECRET in the backend, or (2) set HUDDLE_API_KEY in this app and configure the backend to accept X-API-Key and X-User-Email.',
            },
            { status: 401 }
        )
    }
    return NextResponse.json(data, { status: res.status })
}

export async function GET(request: Request) {
    return proxyGet(request)
}
