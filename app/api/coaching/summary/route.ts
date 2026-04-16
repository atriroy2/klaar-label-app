import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import {
  TIER_3_SYSTEM_PROMPT,
  TIER_3_USER_PROMPT_TEMPLATE,
} from '@/lib/coaching/prompts';
import { MeetingSummary } from '@/lib/coaching/types';
import { logLlmCall } from '@/lib/coaching/cost-logger';

interface CoachingSuggestion {
  trigger: string;
  framework: string;
  suggestion: string;
}

interface SummaryRequest {
  fullTranscript: string;
  allSuggestions: CoachingSuggestion[];
  employeeContext: {
    name: string;
    role: string;
    managerName?: string;
    okrs?: string[];
    recentFeedback?: string;
  };
  managerContext?: {
    name: string;
    role: string;
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { fullTranscript, allSuggestions, employeeContext, managerContext } =
      (await request.json()) as SummaryRequest;

    // Validate inputs
    if (!fullTranscript || typeof fullTranscript !== 'string') {
      return NextResponse.json(
        { error: 'fullTranscript is required and must be a string' },
        { status: 400 },
      );
    }

    if (!employeeContext || !employeeContext.name) {
      return NextResponse.json(
        { error: 'employeeContext with name is required' },
        { status: 400 },
      );
    }

    if (!Array.isArray(allSuggestions)) {
      return NextResponse.json(
        { error: 'allSuggestions must be an array' },
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

    const modelName = 'gemini-2.5-pro';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: TIER_3_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const contextWithDefaults = {
      name: employeeContext.name,
      role: employeeContext.role,
      managerName: employeeContext.managerName || 'Manager',
      okrs: employeeContext.okrs || [],
      recentFeedback: employeeContext.recentFeedback || 'Not provided',
    };

    const prompt = TIER_3_USER_PROMPT_TEMPLATE(
      fullTranscript,
      allSuggestions,
      contextWithDefaults,
    );
    const startMs = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startMs;
    const text = result.response.text();

    // Log cost
    const usage = result.response.usageMetadata;
    logLlmCall({
      tier: 'tier3-summary',
      model: modelName,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      metadata: { transcriptLength: fullTranscript.length, suggestionsCount: allSuggestions.length },
    });

    try {
      const parsed = JSON.parse(text) as MeetingSummary;

      // Validate required fields
      if (!Array.isArray(parsed.bullets) || !Array.isArray(parsed.actionItems)) {
        throw new Error('Invalid response structure');
      }

      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);

      // Return default summary structure if parsing fails
      const defaultSummary: MeetingSummary = {
        bullets: ['Meeting concluded without specific summary.'],
        actionItems: [],
        managerScorecard: {
          feedbackQuality: 5,
          listeningRatio: 5,
          openQuestions: 5,
          goalAlignment: 5,
          actionClarity: 5,
          overall: 5,
        },
        employeeScorecard: {
          participation: 5,
          selfAdvocacy: 5,
          clarityOfNeeds: 5,
          goalOwnership: 5,
          overall: 5,
        },
        triggersDetected: [],
        frameworksUsed: [],
      };

      return NextResponse.json(defaultSummary, { status: 200 });
    }
  } catch (error) {
    console.error('Error in summary endpoint:', error);
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
