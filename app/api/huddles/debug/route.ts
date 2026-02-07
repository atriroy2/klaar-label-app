import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Dev-only: help debug 401 from backend. Returns whether HUDDLE_API_KEY is set,
 * its length (so you can compare with backend), and whether session has email.
 * Only available when NODE_ENV !== 'production'.
 */
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
    }
    const session = await getServerSession(authOptions)
    const key = process.env.HUDDLE_API_KEY
    const keyTrimmed = key?.trim()
    return NextResponse.json({
        huddleApiKeySet: Boolean(keyTrimmed),
        huddleApiKeyLength: keyTrimmed?.length ?? 0,
        signedIn: Boolean(session?.user),
        userEmailSet: Boolean(session?.user?.email),
        userEmailLength: (session?.user?.email ?? '').length,
    })
}
