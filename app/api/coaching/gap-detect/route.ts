import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import {
  GAP_DETECTION_SYSTEM_PROMPT,
  GAP_DETECTION_USER_PROMPT_TEMPLATE,
  GAP_DETECTION_CONFIG,
} from '@/lib/coaching/prompts';
import { logLlmCall } from '@/lib/coaching/cost-logger';

interface GapDetectRequest {
  agenda: Array<{ text: string; owner: string }>;
  priorActionItems: Array<{ text: string; owner: string; status: string }>;
  rollingSummary: string;
  checkedItems: string[]; // texts of talking points marked as discussed
  meetingProgress: number; // 0.0 to 1.0
}

interface GapDetectResponse {
  missedAgendaItems: Array<{
    text: string;
    urgency: 'high' | 'medium';
    nudge: string;
  }>;
  missedPriorActions: Array<{
    text: string;
    owner: string;
    nudge: string;
  }>;
  managerNudge: string | null;
  employeeNudge: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as GapDetectRequest;
    const { agenda, priorActionItems, rollingSummary, checkedItems, meetingProgress } = body;

    if (!agenda || !Array.isArray(agenda)) {
      return NextResponse.json(
        { error: 'agenda is required and must be an array' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 },
      );
    }

    const modelName = GAP_DETECTION_CONFIG.model || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: GAP_DETECTION_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: GAP_DETECTION_CONFIG.temperature,
        topP: GAP_DETECTION_CONFIG.topP,
        maxOutputTokens: GAP_DETECTION_CONFIG.maxTokens,
      },
    });

    const prompt = GAP_DETECTION_USER_PROMPT_TEMPLATE(
      agenda,
      priorActionItems || [],
      rollingSummary || '',
      checkedItems || [],
      meetingProgress || 0,
    );

    const startMs = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startMs;
    const text = result.response.text();

    // Log cost
    const usage = result.response.usageMetadata;
    logLlmCall({
      tier: 'gap-detect',
      model: modelName,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      metadata: {
        agendaCount: agenda.length,
        priorActionCount: priorActionItems?.length || 0,
        meetingProgress: Math.round(meetingProgress * 100),
      },
    });

    try {
      const parsed = JSON.parse(text) as GapDetectResponse;
      return NextResponse.json({
        missedAgendaItems: parsed.missedAgendaItems || [],
        missedPriorActions: parsed.missedPriorActions || [],
        managerNudge: parsed.managerNudge || null,
        employeeNudge: parsed.employeeNudge || null,
      });
    } catch {
      console.error('Failed to parse gap detection response:', text);
      return NextResponse.json({
        missedAgendaItems: [],
        missedPriorActions: [],
        managerNudge: null,
        employeeNudge: null,
      });
    }
  } catch (error) {
    console.error('Error in gap-detect endpoint:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
