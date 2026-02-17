import { NextResponse } from 'next/server'
import { getBackendHeaders } from '@/app/api/huddles/backend-headers'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL || process.env.NEXT_PUBLIC_HUDDLE_API_URL || ''

export async function POST(request: Request) {
    if (!HUDDLE_API_URL) {
        return NextResponse.json({ error: 'Huddle API URL not configured' }, { status: 502 })
    }

    const auth = await getBackendHeaders(request)
    if (!auth.ok) return auth.response

    let body: string
    try {
        body = await request.text()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const url = `${HUDDLE_API_URL}/api/zoom/join`

    let res: Response
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                ...auth.headers,
                'Content-Type': 'application/json',
            },
            body,
        })
    } catch (err) {
        console.error('[zoom/join proxy] Backend fetch failed:', err)
        return NextResponse.json(
            { error: 'Could not reach Huddle API backend.' },
            { status: 502 }
        )
    }

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
}
