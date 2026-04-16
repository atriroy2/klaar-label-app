/**
 * Cost Logger for Coaching Engine
 * Tracks every LLM and TTS API call with token counts, model, latency, and cost estimates.
 *
 * Uses globalThis to persist across Next.js dev mode module reloads.
 *
 * Pricing as of April 2025 (per 1M tokens unless noted):
 *   Gemini 2.0 Flash:  input $0.10, output $0.40
 *   Gemini 2.5 Pro:    input $1.25, output $10.00
 *   ElevenLabs TTS:    ~$0.30 per 1K characters (free tier: 10K chars/mo)
 */

export interface CostLogEntry {
  id: string;
  timestamp: number;
  tier: 'tier1-detect' | 'tier2-suggest' | 'tier3-summary' | 'gap-detect' | 'tts';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputChars?: number;       // for TTS
  audioBytes?: number;       // for TTS
  latencyMs: number;
  estimatedCostUsd: number;
  metadata?: Record<string, unknown>;
}

export interface SessionCostSummary {
  entries: CostLogEntry[];
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    ttsCharacters: number;
    estimatedCostUsd: number;
    totalLatencyMs: number;
  };
  byTier: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  }>;
}

// Pricing per million tokens
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash':   { input: 0.10, output: 0.40 },
  'gemini-1.5-flash':   { input: 0.075, output: 0.30 },
  'gemini-2.5-pro':     { input: 1.25, output: 10.00 },
  'gemini-2.0-pro':     { input: 1.25, output: 10.00 },
  'gemini-1.5-pro':     { input: 1.25, output: 5.00 },
};

// ElevenLabs: ~$0.30 per 1K characters
const TTS_COST_PER_CHAR = 0.30 / 1000;

// ─── Persist across Next.js dev mode hot reloads via globalThis ───
interface CostLogStore {
  entries: CostLogEntry[];
  counter: number;
}

const globalForCostLog = globalThis as unknown as { __coachingCostLog?: CostLogStore };

if (!globalForCostLog.__coachingCostLog) {
  globalForCostLog.__coachingCostLog = { entries: [], counter: 0 };
}

function getStore(): CostLogStore {
  return globalForCostLog.__coachingCostLog!;
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input +
         (outputTokens / 1_000_000) * pricing.output;
}

export function estimateTtsCost(characters: number): number {
  return characters * TTS_COST_PER_CHAR;
}

export function logLlmCall(params: {
  tier: CostLogEntry['tier'];
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}): CostLogEntry {
  const store = getStore();
  store.counter += 1;
  const entry: CostLogEntry = {
    id: `cost-${store.counter}`,
    timestamp: Date.now(),
    tier: params.tier,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.inputTokens + params.outputTokens,
    latencyMs: params.latencyMs,
    estimatedCostUsd: estimateCost(params.model, params.inputTokens, params.outputTokens),
    metadata: params.metadata,
  };
  store.entries.push(entry);
  console.log(
    `[COST] ${entry.tier} | ${entry.model} | in:${entry.inputTokens} out:${entry.outputTokens} | $${entry.estimatedCostUsd.toFixed(6)} | ${entry.latencyMs}ms`
  );
  return entry;
}

export function logTtsCall(params: {
  inputChars: number;
  audioBytes: number;
  latencyMs: number;
}): CostLogEntry {
  const store = getStore();
  store.counter += 1;
  const entry: CostLogEntry = {
    id: `cost-${store.counter}`,
    timestamp: Date.now(),
    tier: 'tts',
    model: 'eleven_flash_v2_5',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputChars: params.inputChars,
    audioBytes: params.audioBytes,
    latencyMs: params.latencyMs,
    estimatedCostUsd: estimateTtsCost(params.inputChars),
  };
  store.entries.push(entry);
  console.log(
    `[COST] tts | eleven_flash_v2_5 | chars:${params.inputChars} bytes:${params.audioBytes} | $${entry.estimatedCostUsd.toFixed(6)} | ${params.latencyMs}ms`
  );
  return entry;
}

export function getSessionCostSummary(): SessionCostSummary {
  const store = getStore();
  const byTier: SessionCostSummary['byTier'] = {};

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let totalLatency = 0;
  let ttsChars = 0;

  for (const entry of store.entries) {
    totalInput += entry.inputTokens;
    totalOutput += entry.outputTokens;
    totalCost += entry.estimatedCostUsd;
    totalLatency += entry.latencyMs;
    ttsChars += entry.inputChars || 0;

    if (!byTier[entry.tier]) {
      byTier[entry.tier] = { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
    }
    byTier[entry.tier].calls += 1;
    byTier[entry.tier].inputTokens += entry.inputTokens;
    byTier[entry.tier].outputTokens += entry.outputTokens;
    byTier[entry.tier].estimatedCostUsd += entry.estimatedCostUsd;
  }

  return {
    entries: [...store.entries],
    totals: {
      calls: store.entries.length,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      ttsCharacters: ttsChars,
      estimatedCostUsd: totalCost,
      totalLatencyMs: totalLatency,
    },
    byTier,
  };
}

export function resetCostLog(): void {
  const store = getStore();
  store.entries = [];
  store.counter = 0;
}
