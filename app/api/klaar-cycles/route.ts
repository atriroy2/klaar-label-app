/**
 * API Route: /api/klaar-cycles
 *
 * Fetches available goal cycles (time periods) from the Klaar backend.
 * Used by the chatbot to populate the goal cycle dropdown.
 *
 * Request: GET ?sheetUserId=...&workspaceId=...&clientDomain=...&apiBaseUrl=...&token=...
 * Response: { cycles: [{ id, name, startAt, endAt }] }
 */

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sheetUserId = url.searchParams.get('sheetUserId')
  const workspaceId = url.searchParams.get('workspaceId')
  const clientDomain = url.searchParams.get('clientDomain')
  const apiBaseUrl = url.searchParams.get('apiBaseUrl')
  const token = url.searchParams.get('token')

  if (!sheetUserId || !workspaceId || !clientDomain || !apiBaseUrl || !token) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    const apiUrl = `${apiBaseUrl}/okr/performance/time_period/?sheet_user_id=${sheetUserId}&page=1&page_size=20`
    const res = await fetch(apiUrl, {
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${token}`,
        'client-domain': clientDomain,
        'workspace-id': workspaceId,
      },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error')
      console.error(`[klaar-cycles] Failed ${res.status}:`, errText.substring(0, 200))
      return NextResponse.json({ error: `Klaar API error ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const results = data.results || []

    const cycles = results
      .filter((r: Record<string, unknown>) => r.is_active)
      .map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        startAt: r.start_at,
        endAt: r.end_at,
      }))
      .sort((a: { startAt: string }, b: { startAt: string }) => a.startAt.localeCompare(b.startAt))

    console.log(`[klaar-cycles] Fetched ${cycles.length} active cycles`)
    return NextResponse.json({ cycles })
  } catch (e) {
    console.error('[klaar-cycles] Failed to reach Klaar API:', e)
    return NextResponse.json({ error: 'Failed to connect to Klaar API' }, { status: 502 })
  }
}
