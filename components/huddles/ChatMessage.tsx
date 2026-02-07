'use client'

import { cn } from '@/lib/utils'
import MarkdownPreview from '@/components/MarkdownPreview'
import { SourceCitation } from './SourceCitation'
import type { ChatSource } from '@/lib/huddle-types'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-lg p-3 max-w-[85%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview content={content} />
          </div>
        )}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-3 space-y-2">
            {sources.map((src, i) => (
              <SourceCitation key={i} source={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
