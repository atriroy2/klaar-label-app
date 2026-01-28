import { LLMProvider, ModelProvider, GenerationOptions } from './types'
import { OpenAIProvider } from './openai'
import { GeminiProvider } from './gemini'
import { AnthropicProvider } from './anthropic'

export * from './types'

const providers: Record<ModelProvider, LLMProvider> = {
    OPENAI: new OpenAIProvider(),
    GEMINI: new GeminiProvider(),
    ANTHROPIC: new AnthropicProvider()
}

export function getProvider(providerName: ModelProvider): LLMProvider {
    return providers[providerName] || providers.OPENAI
}

/**
 * Get variation options for a generation index.
 * Introduces mild parameter variations to produce diverse outputs.
 * 
 * Index 0: More focused (temp 0.80, topP 0.90)
 * Index 1: Balanced (temp 0.90, topP 0.95)
 * Index 2: API default (temp 1.00, topP 1.00)
 * Index 3: More creative (temp 1.10, topP 1.00)
 */
export function getVariationOptions(index: number): GenerationOptions {
    const variations: GenerationOptions[] = [
        { temperature: 0.80, topP: 0.90, variationIndex: 0 },
        { temperature: 0.90, topP: 0.95, variationIndex: 1 },
        { temperature: 1.00, topP: 1.00, variationIndex: 2 },
        { temperature: 1.10, topP: 1.00, variationIndex: 3 },
    ]
    
    // For indices beyond 3, cycle through with slight additional variation
    const baseIndex = index % variations.length
    const cycleCount = Math.floor(index / variations.length)
    
    const base = variations[baseIndex]
    
    // Add tiny variation for cycles beyond first (e.g., index 4, 5, 6, 7...)
    if (cycleCount > 0) {
        return {
            temperature: Math.min(1.5, (base.temperature || 1.0) + (cycleCount * 0.02)),
            topP: base.topP,
            variationIndex: index
        }
    }
    
    return base
}

export function interpolatePrompt(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        result = result.replace(regex, value)
    }
    return result
}
