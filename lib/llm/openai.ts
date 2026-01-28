import { LLMProvider, LLMResponse, GenerationOptions } from './types'

export class OpenAIProvider implements LLMProvider {
    name = 'openai'

    async generateCompletion(prompt: string, model: string, apiKey?: string, options?: GenerationOptions): Promise<LLMResponse> {
        const key = apiKey || process.env.OPENAI_API_KEY
        
        if (!key) {
            return { output: '', error: 'OpenAI API key not configured' }
        }

        // Use provided options or defaults
        const temperature = options?.temperature ?? 1.0
        const topP = options?.topP ?? 1.0

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature,
                    top_p: topP,
                    max_tokens: 4096
                })
            })

            if (!response.ok) {
                const error = await response.json()
                return { output: '', error: error.error?.message || 'OpenAI API error' }
            }

            const data = await response.json()
            return {
                output: data.choices[0]?.message?.content || '',
                tokensUsed: data.usage?.total_tokens
            }
        } catch (error) {
            console.error('OpenAI error:', error)
            return { output: '', error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
}
