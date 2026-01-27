import { LLMProvider, LLMResponse } from './types'

export class GeminiProvider implements LLMProvider {
    name = 'gemini'

    async generateCompletion(prompt: string, model: string, apiKey?: string): Promise<LLMResponse> {
        const key = apiKey || process.env.GEMINI_API_KEY
        
        if (!key) {
            return { output: '', error: 'Gemini API key not configured' }
        }

        try {
            const modelName = model || 'gemini-pro'
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                })
            })

            if (!response.ok) {
                const error = await response.json()
                return { output: '', error: error.error?.message || 'Gemini API error' }
            }

            const data = await response.json()
            const output = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            
            return {
                output,
                tokensUsed: data.usageMetadata?.totalTokenCount
            }
        } catch (error) {
            console.error('Gemini error:', error)
            return { output: '', error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
}
