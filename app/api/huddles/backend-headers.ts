import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Build headers to send to the huddle backend.
 * - Always forwards the session cookie (backend can verify if it shares NEXTAUTH_SECRET).
 * - If HUDDLE_API_KEY is set, also sends X-API-Key and X-User-* so the backend can
 *   trust the proxy and identify the user without verifying the cookie (no need for same secret).
 */
export async function getBackendHeaders(
    request: Request
): Promise<
    | { ok: true; headers: Record<string, string> }
    | { ok: false; response: NextResponse }
> {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Not signed in. Please log in to the Klaar Internal app to view huddles.' },
                { status: 401 }
            ),
        }
    }
    const headers: Record<string, string> = {
        Cookie: request.headers.get('cookie') || '',
    }
    const apiKey = process.env.HUDDLE_API_KEY?.trim()
    if (apiKey) {
        headers['X-API-Key'] = apiKey
        headers['X-User-Email'] = (session.user.email ?? '').trim()
        headers['X-User-Id'] = session.user.id ?? ''
        headers['X-User-Name'] = (session.user.name ?? '').trim()
    }
    return { ok: true, headers }
}
