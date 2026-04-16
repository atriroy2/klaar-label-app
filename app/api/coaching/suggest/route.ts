import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import {
  TIER_2_SYSTEM_PROMPT,
  TIER_2_USER_PROMPT_TEMPLATE,
  TIER_2_CONFIG,
} from '@/lib/coaching/prompts';
import { logLlmCall } from '@/lib/coaching/cost-logger';

interface SuggestRequest {
  flag: string;
  evidence: string;
  employeeContext: {
    name: string;
    role: string;
    managerName?: string;
    okrs?: string[];
    recentFeedback?: string;
  };
  recentSegment: string;
  conversationContext?: {
    rollingSummary?: string;
    previousTriggers?: string[];
  };
}

interface PerspectiveSuggestion {
  headline: string;
  framework: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface DualSuggestResponse {
  managerSuggestion: PerspectiveSuggestion;
  employeeSuggestion: PerspectiveSuggestion;
}

// ── Trigger-specific fallback suggestions ──
// These are NOT generic — they give real coaching for each trigger so even
// when JSON parsing fails, the user gets something useful.
const TRIGGER_FALLBACKS: Record<string, {
  managerHeadline: string;
  managerSuggestion: string;
  managerFramework: string;
  employeeHeadline: string;
  employeeSuggestion: string;
  employeeFramework: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  VAGUE_FEEDBACK: {
    managerHeadline: 'Be specific about what you observed',
    managerSuggestion: 'Instead of "you need to communicate better", try the SBI pattern: name the specific Situation (e.g., "In yesterday\'s sprint retro"), the exact Behavior you observed (e.g., "you said the approach was fine without raising the scalability concern"), and the Impact it had (e.g., "the team didn\'t realize you had a different view"). Specific feedback is actionable; vague feedback creates confusion.',
    managerFramework: 'SBI',
    employeeHeadline: 'Ask for specifics when feedback feels vague',
    employeeSuggestion: 'When your manager gives general feedback like "improve your communication", try responding with: "I want to work on that — can you point to a specific recent example so I know exactly what to change?" This shows initiative and ensures you\'re working on the right thing.',
    employeeFramework: 'GROW',
    priority: 'high',
  },
  MANAGER_DOMINATING: {
    managerHeadline: 'Create more space for your report to speak',
    managerSuggestion: 'You\'ve been doing most of the talking. Try the "And what else?" technique from The Coaching Habit — after your report responds, ask "And what else?" at least twice before offering your own view. A good 1:1 should have the employee speaking 60-70% of the time. Pause after asking a question and count to 5 before filling the silence.',
    managerFramework: 'COACHING_HABIT',
    employeeHeadline: 'Speak up and steer the conversation',
    employeeSuggestion: 'Your manager has been leading most of the discussion. You can redirect by saying "I\'d love to share what\'s been on my mind" or "Before we move on, there\'s something I wanted to discuss." Preparing 2-3 talking points before your 1:1 helps you take more ownership of the agenda.',
    employeeFramework: 'DESC',
    priority: 'high',
  },
  NO_ACTION_ITEMS: {
    managerHeadline: 'End with clear who-does-what-by-when',
    managerSuggestion: 'Good discussions need commitments to become outcomes. Before wrapping up, try: "Let\'s lock in next steps — what are you committing to by when, and what do you need from me?" Write them down together. This turns conversations into progress.',
    managerFramework: 'RADICAL_CANDOR',
    employeeHeadline: 'Propose your own action items',
    employeeSuggestion: 'Don\'t wait for your manager to assign next steps. Try: "Here\'s what I\'m planning to do after this conversation..." and list 2-3 concrete actions with dates. This demonstrates ownership and ensures the meeting wasn\'t just a chat.',
    employeeFramework: 'GROW',
    priority: 'medium',
  },
  CLOSED_QUESTIONS_ONLY: {
    managerHeadline: 'Ask open questions that invite real thinking',
    managerSuggestion: 'You\'ve been asking questions that invite yes/no answers (e.g., "Are you on track?"). Try replacing them with open questions: "How is the project progressing?" or "What\'s been the biggest challenge?" or "What would make this week a success for you?" Open questions give your report space to think out loud and surface issues you didn\'t know about.',
    managerFramework: 'COACHING_HABIT',
    employeeHeadline: 'Expand your answers beyond yes or no',
    employeeSuggestion: 'When your manager asks a closed question like "Are you on track?", try answering with context: "Yes, and here\'s what\'s going well... but I\'m also navigating this challenge..." This gives your manager a fuller picture and opens up a better conversation.',
    employeeFramework: 'GROW',
    priority: 'medium',
  },
  JUMPING_TO_SOLUTIONS: {
    managerHeadline: 'Ask what they\'ve tried before suggesting fixes',
    managerSuggestion: 'When your report describes a problem, resist the urge to jump straight to a solution. Instead, try: "What have you tried so far?" then "What do you think is the root cause?" This helps them develop problem-solving skills and ensures your solution actually fits what they\'ve already explored.',
    managerFramework: 'COACHING_HABIT',
    employeeHeadline: 'Share what you\'ve already explored',
    employeeSuggestion: 'Before your manager jumps to a solution, try: "I\'ve already looked into X and Y — here\'s what I found..." This shows initiative and helps steer toward a solution that accounts for what you\'ve already learned. If they still jump in, try "I appreciate the idea — can I share the context I have first?"',
    employeeFramework: 'DESC',
    priority: 'high',
  },
  NO_FOLLOW_UP: {
    managerHeadline: 'Check in on last meeting\'s commitments',
    managerSuggestion: 'Neither of you referenced commitments from your last 1:1. Start each meeting with "Let\'s check in on what we agreed to last time." This creates accountability, shows you care about follow-through, and prevents the same issues from being discussed meeting after meeting without progress.',
    managerFramework: 'RADICAL_CANDOR',
    employeeHeadline: 'Bring up your own progress on past items',
    employeeSuggestion: 'Take the lead on accountability by opening with "Here\'s an update on what I committed to last time..." Even if your manager doesn\'t ask, this shows reliability and keeps your development on track.',
    employeeFramework: 'GROW',
    priority: 'medium',
  },
  MISSED_GOAL_REFERENCE: {
    managerHeadline: 'Tie this discussion back to their goals',
    managerSuggestion: 'The conversation is relevant to your report\'s OKRs or growth goals, but neither of you connected the dots. Try: "How does this relate to the [specific OKR]?" or "This seems like a great opportunity to advance your goal around [area]." Connecting daily work to bigger goals keeps development front and center.',
    managerFramework: 'RADICAL_CANDOR',
    employeeHeadline: 'Connect this conversation to your OKRs',
    employeeSuggestion: 'This discussion relates to your goals but no one mentioned them. Try: "This connects to my OKR around [area] — here\'s how I see it fitting in." Proactively linking your work to your goals shows strategic thinking and helps your manager see your growth.',
    employeeFramework: 'GROW',
    priority: 'low',
  },
  ALL_CRITICISM_NO_RECOGNITION: {
    managerHeadline: 'Balance critique with recognition of what\'s working',
    managerSuggestion: 'All the feedback in this segment has been about what needs to improve, with no acknowledgment of what\'s going well. Try the Radical Candor approach: lead with something specific they\'re doing well ("I\'ve noticed you\'ve been shipping faster this sprint — nice work"), then deliver your constructive point. People are much more receptive to tough feedback when they feel seen.',
    managerFramework: 'RADICAL_CANDOR',
    employeeHeadline: 'Advocate for yourself by naming your wins',
    employeeSuggestion: 'When feedback feels one-sided, it\'s okay to add balance yourself: "I appreciate the feedback on [area]. I also wanted to highlight that [specific win] went well this week." This isn\'t bragging — it\'s helping your manager see the full picture.',
    employeeFramework: 'DESC',
    priority: 'high',
  },
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { flag, evidence, employeeContext, recentSegment, conversationContext } =
      (await request.json()) as SuggestRequest;

    // Validate inputs
    if (!flag || typeof flag !== 'string') {
      return NextResponse.json(
        { error: 'flag is required and must be a string' },
        { status: 400 },
      );
    }

    if (!evidence || typeof evidence !== 'string') {
      return NextResponse.json(
        { error: 'evidence is required and must be a string' },
        { status: 400 },
      );
    }

    if (!employeeContext || !employeeContext.name) {
      return NextResponse.json(
        { error: 'employeeContext with name is required' },
        { status: 400 },
      );
    }

    if (!recentSegment || typeof recentSegment !== 'string') {
      return NextResponse.json(
        { error: 'recentSegment is required and must be a string' },
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

    const modelName = TIER_2_CONFIG.model;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: TIER_2_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: TIER_2_CONFIG.temperature,
        topP: TIER_2_CONFIG.topP,
        maxOutputTokens: TIER_2_CONFIG.maxTokens,
      },
    });

    const contextWithDefaults = {
      name: employeeContext.name,
      role: employeeContext.role,
      managerName: employeeContext.managerName || 'Manager',
      okrs: employeeContext.okrs || [],
      recentFeedback: employeeContext.recentFeedback || 'Not provided',
    };

    const prompt = TIER_2_USER_PROMPT_TEMPLATE(
      flag,
      evidence,
      contextWithDefaults,
      recentSegment,
      conversationContext,
    );
    const startMs = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - startMs;
    const text = result.response.text();

    // Log cost
    const usage = result.response.usageMetadata;
    logLlmCall({
      tier: 'tier2-suggest',
      model: modelName,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      metadata: { flag },
    });

    try {
      const parsed = JSON.parse(text) as DualSuggestResponse;

      // Validate dual response structure — both sides present with actual content
      if (parsed.managerSuggestion?.suggestion && parsed.employeeSuggestion?.suggestion) {
        return NextResponse.json({
          managerSuggestion: {
            headline: parsed.managerSuggestion.headline || getFallback(flag).managerHeadline,
            framework: parsed.managerSuggestion.framework || getFallback(flag).managerFramework,
            suggestion: parsed.managerSuggestion.suggestion,
            priority: validatePriority(parsed.managerSuggestion.priority),
          },
          employeeSuggestion: {
            headline: parsed.employeeSuggestion.headline || getFallback(flag).employeeHeadline,
            framework: parsed.employeeSuggestion.framework || getFallback(flag).employeeFramework,
            suggestion: parsed.employeeSuggestion.suggestion,
            priority: validatePriority(parsed.employeeSuggestion.priority),
          },
        });
      }

      // Partial parse — one side present but not the other
      const fb = getFallback(flag);
      return NextResponse.json({
        managerSuggestion: {
          headline: parsed.managerSuggestion?.headline || fb.managerHeadline,
          framework: parsed.managerSuggestion?.framework || fb.managerFramework,
          suggestion: parsed.managerSuggestion?.suggestion || fb.managerSuggestion,
          priority: validatePriority(parsed.managerSuggestion?.priority),
        },
        employeeSuggestion: {
          headline: parsed.employeeSuggestion?.headline || fb.employeeHeadline,
          framework: parsed.employeeSuggestion?.framework || fb.employeeFramework,
          suggestion: parsed.employeeSuggestion?.suggestion || fb.employeeSuggestion,
          priority: validatePriority(parsed.employeeSuggestion?.priority),
        },
      });
    } catch (parseError) {
      // JSON parsing failed entirely — use rich contextual fallbacks
      console.error('Failed to parse Gemini response for', flag, ':', text?.substring(0, 200));
      const fb = getFallback(flag);
      return NextResponse.json({
        managerSuggestion: {
          headline: fb.managerHeadline,
          framework: fb.managerFramework,
          suggestion: fb.managerSuggestion,
          priority: fb.priority,
        },
        employeeSuggestion: {
          headline: fb.employeeHeadline,
          framework: fb.employeeFramework,
          suggestion: fb.employeeSuggestion,
          priority: fb.priority,
        },
      });
    }
  } catch (error) {
    console.error('Error in suggest endpoint:', error);
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

// ── Helpers ──

function getFallback(trigger: string) {
  return TRIGGER_FALLBACKS[trigger] || {
    managerHeadline: 'Reflect on your coaching approach here',
    managerSuggestion: 'This moment in the conversation could benefit from a different approach. Consider whether you\'re creating space for your report to think, speak, and own their development. Try asking "What\'s the real challenge here for you?" before offering your perspective.',
    managerFramework: 'COACHING_HABIT',
    employeeHeadline: 'Take more ownership of this conversation',
    employeeSuggestion: 'This is a good moment to step up and share your perspective. Try: "Here\'s what I\'m thinking about this..." or "I have an idea I\'d like to explore." Your manager can\'t help with things they don\'t know about.',
    employeeFramework: 'GROW',
    priority: 'medium' as const,
  };
}

function validatePriority(p: string | undefined): 'high' | 'medium' | 'low' {
  if (p && ['high', 'medium', 'low'].includes(p)) return p as 'high' | 'medium' | 'low';
  return 'medium';
}
