'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatMessage } from '@/components/huddles/ChatMessage'
import { useToast } from '@/components/ui/use-toast'
import type { ChatSource } from '@/lib/huddle-types'

const SUGGESTIONS = [
  'What did we decide about the goals module?',
  'Summarize all discussions from last week',
  'What action items came out of recent meetings?',
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export default function HuddleChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async (text?: string) => {
    const toSend = (text ?? input).trim()
    if (!toSend || loading) return

    const userMessage: Message = { role: 'user', content: toSend }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/huddles/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: toSend,
          conversation_history: history,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!res.ok) throw new Error('Chat failed')
      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response ?? '',
          sources: data.sources ?? [],
        },
      ])
    } catch {
      toast({ title: 'Failed to get response', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col min-h-0" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-7 w-7" />
          Meeting Knowledge Base
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
        >
          Clear Chat
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 rounded-lg border bg-card">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
            <p className="text-muted-foreground mb-6">
              Ask me anything about your past meetings. I can search across all transcripts you have access to.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 whitespace-normal"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <ChatMessage
                key={i}
                role={m.role}
                content={m.content}
                sources={m.sources}
              />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t p-4 bg-background shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder="Ask about your meetings..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}