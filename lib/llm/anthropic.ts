import { LLMProvider, LLMResponse } from './types'

export class AnthropicProvider implements LLMProvider {
    name = 'anthropic'

    async generateCompletion(prompt: string, model: string, apiKey?: string): Promise<LLMResponse> {
        const key = apiKey || process.env.ANTHROPIC_API_KEY
        
        if (!key) {
            return { output: '', error: 'Anthropic API key not configured' }
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-sonnet-20240229',
                    max_tokens: 4096,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                })
            })

            if (!response.ok) {
                const error = await response.json()
                return { output: '', error: error.error?.message || 'Anthropic API error' }
            }

            const data = await response.json()
            const output = data.content?.[0]?.text || ''
            
            return {
                output,
                tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            }
        } catch (error) {
            console.error('Anthropic error:', error)
            return { output: '', error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
}
