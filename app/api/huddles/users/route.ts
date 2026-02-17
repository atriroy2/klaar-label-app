import { NextResponse } from 'next/server'
import { getBackendHeaders } from '../backend-headers'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL || process.env.NEXT_PUBLIC_HUDDLE_API_URL || ''

export async function GET(request: Request) {
    if (!HUDDLE_API_URL) {
        return NextResponse.json({ error: 'Huddle API URL not configured' }, { status: 502 })
    }
    const auth = await getBackendHeaders(request)
    if (!auth.ok) return auth.response
    const res = await fetch(`${HUDDLE_API_URL}/api/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...auth.headers,
        },
        cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
}
