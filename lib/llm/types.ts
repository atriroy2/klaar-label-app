export interface GenerationOptions {
    temperature?: number
    topP?: number
    // Index is used for logging/debugging
    variationIndex?: number
}

export interface LLMProvider {
    name: string
    generateCompletion(prompt: string, model: string, apiKey?: string, options?: GenerationOptions): Promise<LLMResponse>
}

export interface LLMResponse {
    output: string
    tokensUsed?: number
    error?: string
}

export type ModelProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
