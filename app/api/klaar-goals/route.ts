/**
 * API Route: /api/klaar-goals
 *
 * Proxies goal creation to the real Klaar backend.
 * Used by the chatbot to actually create goals when the user clicks "Add".
 * Only works for personas with klaarApi config (currently Priya).
 *
 * Request: { goal, klaarApi, token }
 * Response: { success, data } or { error }
 */

import { NextResponse } from 'next/server'

interface MetricValues {
  start_value?: string | number
  target_value?: string | number
  sign?: string
}

interface MetricData {
  name: string
  type: string
  target_type: string
  dimension_type?: string
  values?: MetricValues
  currency?: string
}

interface GoalPayload {
  name: string
  description?: string
  tags?: string[]
  metric_data?: MetricData
  key_results?: Array<{
    name: string
    metric_data?: MetricData
  }>
}

interface KlaarApiConfig {
  sheetUserId: string
  workspaceId: string
  clientDomain: string
  apiBaseUrl: string
}

/**
 * Map the chatbot's metric format to Klaar API's expected format.
 * Key differences:
 * - Klaar API uses "sign" in values (e.g., "%" for percentage)
 * - Klaar API expects numeric start_value/target_value (not strings)
 * - dimension_type in API is "RANGE" for Increase/Reduce, "SINGULAR" for single-value types
 */
function mapMetricForKlaar(m: Record<string, unknown> | null): MetricData | null {
  if (!m) return null
  const type = ((m.type as string) || 'PERCENTAGE').toUpperCase()
  if (type === 'YES_NO') {
    return { name: (m.name as string) || '', type: 'YES_NO', target_type: 'Reach', dimension_type: 'SINGULAR' }
  }

  const targetType = (m.targetType as string) || (m.target_type as string) || 'Increase'
  const isRange = targetType === 'Increase' || targetType === 'Reduce'

  // Determine the sign based on metric type
  let sign = ''
  if (type === 'PERCENTAGE') sign = '%'
  else if (type === 'CURRENCY') sign = (m.currency as string) || '$'
  else sign = ''

  // Parse numeric values — strip %, $, commas
  function parseNum(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0
    const s = String(v).replace(/[%$,]/g, '').trim()
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }

  const target = parseNum(m.target)
  const start = isRange ? parseNum(m.start) : 0

  const values: MetricValues = { sign }
  if (isRange) {
    values.start_value = start
    values.target_value = target
  } else {
    // Single-value types: only target_value, no start_value
    values.target_value = target
  }

  return {
    name: (m.name as string) || '',
    type,
    target_type: targetType,
    dimension_type: isRange ? 'RANGE' : 'SINGULAR',
    values,
  }
}

interface CycleInfo {
  id: string
  name: string
  startAt: string
  endAt: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { goal, klaarApi, cycle, token } = body as {
    goal?: GoalPayload
    klaarApi?: KlaarApiConfig
    cycle?: CycleInfo
    token?: string
  }

  if (!goal || !klaarApi || !token) {
    return NextResponse.json({ error: 'Missing goal, klaarApi config, or token' }, { status: 400 })
  }
  if (!cycle || !cycle.id) {
    return NextResponse.json({ error: 'No goal cycle selected' }, { status: 400 })
  }

  // Build the Klaar API payload for the objective
  const metricData = mapMetricForKlaar(
    (goal as unknown as Record<string, unknown>).metric as Record<string, unknown> || null
  )

  const klaarPayload: Record<string, unknown> = {
    name: goal.name,
    time_period: cycle.id,
    category: 'Individual',
    visibility: 'PUBLIC',
    groups: [],
    owners: [klaarApi.sheetUserId],
    contributors: [],
    node_type: 'Objective',
    description: goal.description || null,
    start_at: cycle.startAt,
    end_at: cycle.endAt,
    tags: goal.tags || [],
    metric_data: metricData || {
      type: 'PERCENTAGE',
      target_type: 'Increase',
      dimension_type: 'RANGE',
      name: 'Progress',
      values: { sign: '%', start_value: 0, target_value: 100 },
    },
    self_tracker: true,
    automatic_tracking_enabled: false,
    parent_node: null,
    milestone_type: '',
    milestones: [],
  }

  console.log('[klaar-goals] Creating objective:', goal.name)

  try {
    // Create the objective
    const objUrl = `${klaarApi.apiBaseUrl}/okr/performance/objective/?sheet_user_id=${klaarApi.sheetUserId}`
    const objRes = await fetch(objUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${token}`,
        'client-domain': klaarApi.clientDomain,
        'content-type': 'application/json',
        'workspace-id': klaarApi.workspaceId,
      },
      body: JSON.stringify(klaarPayload),
    })

    if (!objRes.ok) {
      const errText = await objRes.text().catch(() => 'Unknown error')
      console.error(`[klaar-goals] Objective creation failed ${objRes.status}:`, errText.substring(0, 300))
      return NextResponse.json({ error: `Klaar API error ${objRes.status}`, details: errText.substring(0, 300) }, { status: objRes.status })
    }

    const objData = await objRes.json()
    console.log('[klaar-goals] Objective response:', JSON.stringify(objData).substring(0, 500))
    // Klaar API returns: { success: true, data: ["uuid"] }
    const objectiveId = Array.isArray(objData.data) ? objData.data[0] : (objData.data?.id || objData.id || objData.uuid)
    if (!objectiveId) {
      console.error('[klaar-goals] Could not extract objective ID from response')
      return NextResponse.json({ error: 'Objective created but could not extract ID', data: objData }, { status: 500 })
    }
    console.log('[klaar-goals] Objective created:', objectiveId)

    // Create key results under the objective
    const krResults: unknown[] = []
    console.log('[klaar-goals] key_results received:', JSON.stringify(goal.key_results?.length ?? 'none'))
    if (goal.key_results && goal.key_results.length > 0) {
      for (const kr of goal.key_results) {
        console.log('[klaar-goals] Processing KR:', kr.name, 'metric:', JSON.stringify((kr as Record<string, unknown>).metric))
        const krMetric = mapMetricForKlaar(
          (kr as Record<string, unknown>).metric as Record<string, unknown> || null
        )
        const krPayload: Record<string, unknown> = {
          name: kr.name,
          time_period: cycle.id,
          category: 'Individual',
          visibility: 'PUBLIC',
          groups: [],
          owners: [klaarApi.sheetUserId],
          contributors: [],
          node_type: 'KR',
          description: null,
          start_at: cycle.startAt,
          end_at: cycle.endAt,
          tags: [],
          metric_data: krMetric || {
            type: 'PERCENTAGE',
            target_type: 'Increase',
            dimension_type: 'RANGE',
            name: 'Progress',
            values: { sign: '%', start_value: 0, target_value: 100 },
          },
          self_tracker: true,
          automatic_tracking_enabled: false,
          parent_node: objectiveId,
          milestone_type: '',
          milestones: [],
        }

        try {
          const krRes = await fetch(objUrl, {
            method: 'POST',
            headers: {
              'accept': 'application/json, text/plain, */*',
              'authorization': `Bearer ${token}`,
              'client-domain': klaarApi.clientDomain,
              'content-type': 'application/json',
              'workspace-id': klaarApi.workspaceId,
            },
            body: JSON.stringify(krPayload),
          })

          if (krRes.ok) {
            const krData = await krRes.json()
            krResults.push(krData)
            console.log(`[klaar-goals]   KR created: ${kr.name} (${krData.id})`)
          } else {
            const errBody = await krRes.text().catch(() => 'Unknown')
            console.error(`[klaar-goals]   KR creation failed for "${kr.name}": ${krRes.status}`, errBody.substring(0, 300))
          }
        } catch (krErr) {
          console.error(`[klaar-goals]   KR creation error for "${kr.name}":`, krErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        objective: objData,
        keyResults: krResults,
      },
    })
  } catch (e) {
    console.error('[klaar-goals] Failed to reach Klaar API:', e)
    return NextResponse.json({ error: 'Failed to connect to Klaar API' }, { status: 502 })
  }
}
