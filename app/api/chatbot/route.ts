/**
 * API Route: /api/chatbot
 *
 * Proxies chat messages to the ADK agent's /run endpoint (sync mode).
 * The frontend handles context injection (prepending user context to messages).
 * This route extracts goals from ```json blocks if the agent returns them.
 *
 * Request:  { message: string, session_id: string, file?: { name: string, mimeType: string, base64: string } }
 * Response: { text: string, goals: Goal[] | null, session_id: string }
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import JSON5 from 'json5'

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000'

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
 * Focus area type returned by the agent's Mode 1 (D47).
 */
interface FocusArea {
  id: number
  label: string
  description: string
  selected: boolean
}

/**
 * Extract structured content from ```json blocks in the response text.
 * Handles two types:
 * 1. Focus areas ({"type": "focus_areas", "areas": [...]}) — D47
 * 2. Goals (JSON array of OKRs) — existing behavior
 * Returns null for both if no JSON block found (e.g., general conversation).
 */
function extractStructuredContent(text: string): {
  goals: Record<string, unknown>[] | null
  focusAreas: FocusArea[] | null
  focusAreasMessage: string | null
  parseError: boolean
} {
  // Strategy 1: Match ```json ... ``` blocks (most common)
  let jsonMatch = text.match(/```json\s*([\s\S]*?)```/)

  // Strategy 2: Match ``` ... ``` blocks (Router sometimes drops "json" label)
  if (!jsonMatch) {
    jsonMatch = text.match(/```\s*([\s\S]*?)```/)
    // Only use if content looks like JSON (starts with [ or {)
    if (jsonMatch && !/^\s*[\[{]/.test(jsonMatch[1])) jsonMatch = null
  }

  // Strategy 3: Find raw JSON array or object in text (Router stripped all fencing)
  if (!jsonMatch) {
    // Look for a JSON array starting with [{"name" (goals) or {"type" (focus areas)
    const rawArrayMatch = text.match(/(\[[\s]*\{[\s]*"name"[\s\S]*\])/m)
    const rawObjectMatch = text.match(/(\{[\s]*"type"[\s]*:[\s]*"focus_areas"[\s\S]*\})/m)
    if (rawArrayMatch) {
      jsonMatch = [rawArrayMatch[0], rawArrayMatch[1]]
      console.log('[chatbot] Used fallback: raw JSON array (no fencing)')
    } else if (rawObjectMatch) {
      jsonMatch = [rawObjectMatch[0], rawObjectMatch[1]]
      console.log('[chatbot] Used fallback: raw focus_areas object (no fencing)')
    }
  }

  if (!jsonMatch) return { goals: null, focusAreas: null, focusAreasMessage: null, parseError: false }

  try {
    // Clean common LLM formatting issues before parsing:
    // 1. Literal \n (backslash + n as text) → real newlines
    // 2. Double-escaped quotes \\\" → \"
    // 3. Trailing commas (handled by JSON5)
    let cleanedJson = jsonMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\\\\"/g, '\\"')

    // Remove any markdown-style bold (**text**) the Router might inject inside JSON
    cleanedJson = cleanedJson.replace(/\*\*([^*]+)\*\*/g, '$1')

    console.log('[chatbot] Attempting JSON parse, first 200 chars:', cleanedJson.substring(0, 200))

    // Use JSON5 for lenient parsing — handles trailing commas, literal \n,
    // single quotes, unquoted keys, and other common LLM formatting quirks.
    const parsed = JSON5.parse(cleanedJson)

    // Check if this is a focus_areas response (D47)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type === 'focus_areas') {
      const areas = Array.isArray(parsed.areas) ? parsed.areas : []
      const mappedAreas: FocusArea[] = areas.map((a: Record<string, unknown>, i: number) => ({
        id: (a.id as number) || i + 1,
        label: (a.label as string) || '',
        description: (a.description as string) || '',
        selected: a.selected === true,
      }))
      return {
        goals: null,
        focusAreas: mappedAreas,
        focusAreasMessage: (parsed.message as string) || 'Here are some focus areas for your goals:',
        parseError: false,
      }
    }

    // Otherwise, treat as goals (existing behavior)
    const goalsArray = Array.isArray(parsed) ? parsed : parsed.goals
    if (!Array.isArray(goalsArray)) return { goals: null, focusAreas: null, focusAreasMessage: null, parseError: true }

    // Map snake_case from agent → camelCase for UI, add IDs
    const mapped = goalsArray.map((g: Record<string, unknown>, i: number) => ({
      id: `g${i + 1}`,
      name: g.name || '',
      description: g.description || '',
      tags: g.tags || [],
      alignedTo: g.aligned_to || g.alignedTo || '',
      metricType: g.metric_type || g.metricType || 'rollup',
      metric: mapMetric((g.metric_data || g.metric) as Record<string, unknown> | null),
      keyResults: mapKeyResults(g.key_results || g.keyResults),
      childGoals: mapChildGoals(g.child_goals || g.childGoals),
    }))
    return { goals: mapped, focusAreas: null, focusAreasMessage: null, parseError: false }
  } catch (e) {
    console.error('[chatbot] Failed to parse JSON:', e)
    console.error('[chatbot] Raw JSON text (first 500 chars):', jsonMatch[1]?.substring(0, 500))
    console.error('[chatbot] Full response text (first 300 chars):', text.substring(0, 300))
    return { goals: null, focusAreas: null, focusAreasMessage: null, parseError: true }
  }
}

function mapMetric(m: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!m) return null
  const metricType = ((m.type || 'PERCENTAGE') as string).toUpperCase()
  const targetType = (m.target_type || m.targetType || 'Increase') as string

  // YES_NO metrics have no values
  if (metricType === 'YES_NO') {
    return {
      name: m.name || '',
      type: metricType,
      target: '',
      start: '',
      targetType,
    }
  }

  // Agent may return values nested: { values: { start_value, target_value } }
  // or flat: { start, target }
  // For single-value target types (Reach, Stay Above, etc.), start_value won't exist
  // For range target types (Increase, Reduce), both may exist
  const values = m.values as Record<string, unknown> | undefined
  const target = values?.target_value ?? m.target ?? ''
  const start = values?.start_value ?? m.start ?? m.baseline ?? ''
  const result: Record<string, unknown> = {
    name: m.name || '',
    type: metricType,
    target: String(target),
    start: String(start),
    targetType,
  }
  // Include currency code if present
  if (m.currency) result.currency = m.currency
  return result
}

function mapKeyResults(krs: unknown): Record<string, unknown>[] {
  if (!Array.isArray(krs)) return []
  return krs.map((kr: Record<string, unknown>) => ({
    name: kr.name || '',
    metric: mapMetric((kr.metric_data || kr.metric) as Record<string, unknown> | null),
  }))
}

function mapChildGoals(cgs: unknown): Record<string, unknown>[] {
  if (!Array.isArray(cgs)) return []
  return cgs.map((cg: Record<string, unknown>) => ({
    name: cg.name || '',
    metric: mapMetric((cg.metric_data || cg.metric) as Record<string, unknown> | null),
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
  // Auth check — optional for local PoC testing
  let userId = 'anonymous'
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      userId = session.user.email || session.user.id || 'anonymous'
    }
  } catch {
    // Auth not available — continue without it for PoC
  }

  const body = await request.json().catch(() => ({}))
  const { message, session_id, file } = body as {
    message?: string;
    session_id?: string;
    file?: { name: string; mimeType: string; base64: string };
  }

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    )
  }

  const agentSessionId = session_id || `web-${Date.now()}`

  try {
    // Determine if we need to create a new session or reuse an existing one.
    // ADK web ignores client-provided IDs and generates its own UUIDs.
    // If the frontend sends back a server-assigned UUID, we reuse it directly.
    let actualSessionId = agentSessionId
    const isServerSession = agentSessionId && !agentSessionId.startsWith('web-')

    if (!isServerSession) {
      // First call — create a new ADK session
      const sessionUrl = `${AGENT_API_URL}/apps/${ADK_APP_NAME}/users/${encodeURIComponent(userId)}/sessions`
      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: {} }),
      }).catch((e) => {
        console.error('[chatbot] Session creation failed:', e)
        return null
      })
      if (sessionRes?.ok) {
        const sessionData = await sessionRes.json().catch(() => null)
        if (sessionData?.id) {
          actualSessionId = sessionData.id
          console.log('[chatbot] Created new ADK session:', actualSessionId)
        }
      }
    } else {
      console.log('[chatbot] Reusing existing ADK session:', actualSessionId)
    }

    // Call ADK agent's /run endpoint (sync mode)
    // The message may contain a [CONTEXT] block prepended by the frontend.
    // If a file is attached, send it as inline_data (Gemini multimodal format).
    const messageParts: Array<Record<string, unknown>> = [{ text: message }]
    if (file?.base64 && file?.mimeType) {
      messageParts.push({
        inline_data: {
          mime_type: file.mimeType,
          data: file.base64,
        },
      })
      console.log(`[chatbot] Attaching file: ${file.name} (${file.mimeType}, ${Math.round(file.base64.length * 0.75 / 1024)}KB)`)
    }

    const agentResponse = await fetch(`${AGENT_API_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: ADK_APP_NAME,
        user_id: userId,
        session_id: actualSessionId,
        new_message: {
          role: 'user',
          parts: messageParts,
        },
        streaming: false,
      }),
    })

    if (!agentResponse.ok) {
      const errText = await agentResponse.text().catch(() => 'Unknown error')
      console.error(`[chatbot] ADK agent error ${agentResponse.status}:`, errText)
      return NextResponse.json(
        { error: `Agent returned ${agentResponse.status}`, text: 'Sorry, I encountered an error. Please try again.' },
        { status: 502 }
      )
    }

    const events: AgentEvent[] = await agentResponse.json()
    const responseText = extractResponseText(events)
    const { goals, focusAreas, focusAreasMessage, parseError } = extractStructuredContent(responseText)
    const hasStructured = goals || focusAreas
    const conversationalText = hasStructured ? stripJsonBlocks(responseText) : responseText

    return NextResponse.json({
      text: conversationalText || (goals ? `Here are ${goals.length} goals I generated:` : '') || (focusAreas ? focusAreasMessage : ''),
      goals,
      focusAreas,
      focusAreasMessage,
      parseError,
      session_id: actualSessionId,
    })
  } catch (e) {
    console.error('[chatbot] Failed to reach ADK agent:', e)
    return NextResponse.json(
      {
        error: 'Cannot reach AI agent',
        text: 'I couldn\'t connect to the AI agent. Make sure `adk web` is running.',
      },
      { status: 502 }
    )
  }
}
