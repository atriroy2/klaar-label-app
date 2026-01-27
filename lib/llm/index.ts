import { LLMProvider, ModelProvider } from './types'
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

export function interpolatePrompt(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        result = result.replace(regex, value)
    }
    return result
}
