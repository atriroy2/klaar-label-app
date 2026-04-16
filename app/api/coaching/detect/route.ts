import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import {
  TIER_1_SYSTEM_PROMPT,
  TIER_1_USER_PROMPT_TEMPLATE,
  TIER_1_CONFIG,
} from '@/lib/coaching/prompts';
import { logLlmCall } from '@/lib/coaching/cost-logger';

interface DetectRequest {
  segment: string;
  rollingSummary: string;
  employeeContext: {
    name: string;
    role: string;
    okrs?: string[];
    recentFeedback?: string;
  };
}

interface DetectResponse {
  flags: string[];
  evidence: Record<string, string>;
  rollingSummary: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { segment, rollingSummary, employeeContext } =
      (await request.json()) as DetectRequest;

    if (!segment || typeof segment !== 'string') {
      return NextResponse.json(
        { error: 'segment is required and must be a string' },
        { status: 400 },
      );
    }

    if (!employeeContext || !employeeContext.name) {
      return NextResponse.json(
        { error: 'employeeContext with name is required' },
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

    const modelName = TIER_1_CONFIG.model || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: TIER_1_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: TIER_1_CONFIG.temperature,
        topP: TIER_1_CONFIG.topP,
        maxOutputTokens: TIER_1_CONFIG.maxTokens,
      },
    });

    const contextWithDefaults = {
      name: employeeContext.name,
      role: employeeContext.role,
      okrs: employeeContext.okrs || [],
      recentFeedback: employeeContext.recentFeedback || 'Not provided',
    };

    const prompt = TIER_1_USER_PROMPT_TEMPLATE(
      segment,
      rollingSummary,
      contextWithDefaults,
    );

    const startMs = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startMs;
    const text = result.response.text();

    // Log cost
    const usage = result.response.usageMetadata;
    logLlmCall({
      tier: 'tier1-detect',
      model: modelName,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      metadata: { segmentLength: segment.length },
    });

    try {
      const parsed = JSON.parse(text) as DetectResponse;
      return NextResponse.json(parsed);
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json(
        {
          flags: [],
          evidence: {},
          rollingSummary: rollingSummary || 'No summary available',
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error('Error in detect endpoint:', error);
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
