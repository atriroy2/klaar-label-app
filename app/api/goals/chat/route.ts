/**
 * API Route: /api/goals/chat
 *
 * Proxies chat messages to the ADK agent's /run endpoint (sync mode).
 * Extracts goals from ```json blocks in the agent's response.
 *
 * Request:  { message: string, session_id: string }
 * Response: { text: string, goals: Goal[] | null, error?: string }
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8080'

// ADK web uses the package directory name as app_name
const ADK_APP_NAME = 'agent'

interface AgentEvent {
  content?: {
    parts?: Array<{
      text?: string
      functionCall?: { name: string; args: Record<string, unknown> }
      functionResponse?: { name: string; response: unknown }
    }>
  }
  author?: string
}

/**
 * Extract the final text response from ADK events.
 * ADK /run returns an array of events. We want the last event
 * that has text content from the agent (not function calls).
 */
function extractResponseText(events: AgentEvent[]): string {
  let lastText = ''

  for (const event of events) {
    if (!event.content?.parts) continue
    for (const part of event.content.parts) {
      if (part.text) {
        lastText = part.text
      }
    }
  }

  return lastText
}

/**
 * Extract goals from ```json blocks in the response text.
 * The GenerativeGoals tool outputs goals in JSON format.
 * Returns null if no JSON block found (e.g., clarification question).
 */
function extractGoals(text: string): Record<string, unknown>[] | null {
  // Match ```json ... ``` blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[1])

    // Handle both { goals: [...] } and direct array
    const goalsArray = Array.isArray(parsed) ? parsed : parsed.goals
    if (!Array.isArray(goalsArray)) return null

    // Map snake_case from agent → camelCase for UI, add IDs
    return goalsArray.map((g: Record<string, unknown>, i: number) => ({
      id: `g${i + 1}`,
      name: g.name || '',
      description: g.description || '',
      tags: g.tags || [],
      alignedTo: g.aligned_to || g.alignedTo || '',
      metricType: g.metric_type || g.metricType || 'rollup',
      metric: mapMetric(g.metric as Record<string, unknown> | null),
      keyResults: mapKeyResults(g.key_results || g.keyResults),
      childGoals: mapChildGoals(g.child_goals || g.childGoals),
    }))
  } catch (e) {
    console.error('[goals/chat] Failed to parse goals JSON:', e)
    return null
  }
}

function mapMetric(m: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!m) return null
  return {
    name: m.name || '',
    type: (m.type || 'NUMERIC') as string,
    target: String(m.target || ''),
    start: String(m.start || m.baseline || ''),
    targetType: m.target_type || m.targetType || 'Reach',
  }
}

function mapKeyResults(krs: unknown): Record<string, unknown>[] {
  if (!Array.isArray(krs)) return []
  return krs.map((kr: Record<string, unknown>) => ({
    name: kr.name || '',
    metric: mapMetric(kr.metric as Record<string, unknown> | null),
  }))
}

function mapChildGoals(cgs: unknown): Record<string, unknown>[] {
  if (!Array.isArray(cgs)) return []
  return cgs.map((cg: Record<string, unknown>) => ({
    name: cg.name || '',
    metric: mapMetric(cg.metric as Record<string, unknown> | null),
    keyResults: mapKeyResults(cg.key_results || cg.keyResults),
  }))
}

/**
 * Remove ```json blocks from text to get the conversational part only.
 */
function stripJsonBlocks(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim()
}

export async function POST(request: Request) {
  // Auth check
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Not signed in' },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { message, session_id } = body as { message?: string; session_id?: string }

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    )
  }

  const agentSessionId = session_id || `web-${Date.now()}`
  const userId = session.user.email || session.user.id || 'anonymous'

  try {
    // Call ADK agent's /run endpoint (sync mode)
    const agentResponse = await fetch(`${AGENT_API_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: ADK_APP_NAME,
        user_id: userId,
        session_id: agentSessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
        streaming: false,
      }),
    })

    if (!agentResponse.ok) {
      const errText = await agentResponse.text().catch(() => 'Unknown error')
      console.error(`[goals/chat] ADK agent error ${agentResponse.status}:`, errText)
      return NextResponse.json(
        { error: `Agent returned ${agentResponse.status}`, text: 'Sorry, I encountered an error. Please try again.' },
        { status: 502 }
      )
    }

    const events: AgentEvent[] = await agentResponse.json()
    const responseText = extractResponseText(events)
    const goals = extractGoals(responseText)
    const conversationalText = goals ? stripJsonBlocks(responseText) : responseText

    return NextResponse.json({
      text: conversationalText || (goals ? `Here are ${goals.length} goals I generated:` : ''),
      goals,
      session_id: agentSessionId,
    })
  } catch (e) {
    console.error('[goals/chat] Failed to reach ADK agent:', e)
    return NextResponse.json(
      {
        error: 'Cannot reach AI agent',
        text: 'I couldn\'t connect to the AI agent. Make sure `adk web` is running on port 8080.',
      },
      { status: 502 }
    )
  }
}
