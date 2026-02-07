'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { formatTimestamp } from '@/lib/huddle-utils'
import type { ChatSource } from '@/lib/huddle-types'

interface SourceCitationProps {
  source: ChatSource
}

export function SourceCitation({ source }: SourceCitationProps) {
  const router = useRouter()
  const channel = source.channel_name ? `#${source.channel_name}` : 'Huddle'
  const timeRange = `${formatTimestamp(source.start_time_seconds)}–${formatTimestamp(source.end_time_seconds)}`
  const snippet = source.text_snippet.length > 100
    ? source.text_snippet.slice(0, 100) + '…'
    : source.text_snippet

  return (
    <Card
      className="p-3 cursor-pointer hover:bg-accent transition-colors"
      onClick={() => router.push(`/huddles/${source.huddle_id}`)}
    >
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {channel} · {source.date} · {timeRange}
          </p>
          <p className="text-sm mt-0.5 line-clamp-2">"{snippet}"</p>
          <button
            type="button"
            className="text-xs text-primary hover:underline mt-1"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/huddles/${source.huddle_id}`)
            }}
          >
            View Transcript →
          </button>
        </div>
      </div>
    </Card>
  )
}
