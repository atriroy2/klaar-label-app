import { NextResponse } from 'next/server'
import { getBackendHeaders } from '../../huddles/backend-headers'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL || process.env.NEXT_PUBLIC_HUDDLE_API_URL || ''

/**
 * GET /api/admin/huddles
 *
 * Proxy to the backend admin huddles endpoint.
 * Returns all huddles without participation filtering (metadata only, no content).
 */
export async function GET(request: Request) {
    if (!HUDDLE_API_URL) {
        return NextResponse.json({ error: 'Huddle API URL not configured' }, { status: 502 })
    }

    const auth = await getBackendHeaders(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const url = `${HUDDLE_API_URL}/api/admin/huddles${query ? `?${query}` : ''}`

    let res: Response
    try {
        res = await fetch(url, {
            method: 'GET',
            headers: auth.headers,
            cache: 'no-store',
        })
    } catch (err) {
        console.error('[admin/huddles proxy] Backend fetch failed:', err)
        return NextResponse.json(
            { error: 'Could not reach Huddle API.' },
            { status: 502 }
        )
    }

    const text = await res.text()
    let data: unknown
    try {
        data = text.length > 0 ? JSON.parse(text) : {}
    } catch {
        console.error('[admin/huddles proxy] Non-JSON response:', res.status)
        return NextResponse.json(
            { error: 'Huddle API returned an invalid response.' },
            { status: 502 }
        )
    }

    return NextResponse.json(data, { status: res.status })
}
