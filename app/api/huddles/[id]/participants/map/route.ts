import { NextResponse } from 'next/server'
import { getBackendHeaders } from '../../../backend-headers'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL || process.env.NEXT_PUBLIC_HUDDLE_API_URL || ''

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!HUDDLE_API_URL) {
        return NextResponse.json({ error: 'Huddle API URL not configured' }, { status: 502 })
    }
    const auth = await getBackendHeaders(request)
    if (!auth.ok) return auth.response
    const { id } = await params
    const body = await request.json()
    const res = await fetch(`${HUDDLE_API_URL}/api/huddles/${id}/participants/map`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...auth.headers,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
}
