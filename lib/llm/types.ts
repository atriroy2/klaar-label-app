export interface LLMProvider {
    name: string
    generateCompletion(prompt: string, model: string, apiKey?: string): Promise<LLMResponse>
}

export interface LLMResponse {
    output: string
    tokensUsed?: number
    error?: string
}

export type ModelProvider = 'OPENAI' | 'GEMINI' | 'ANTHROPIC'
