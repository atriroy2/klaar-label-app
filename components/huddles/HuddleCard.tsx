'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './StatusBadge'
import { Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/huddle-utils'
import type { HuddleListItem } from '@/lib/huddle-types'

function formatHuddleDate(startedAt: string | null, endedAt: string | null, durationSeconds: number | null): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt)
  const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  let timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (endedAt) {
    const end = new Date(endedAt)
    timeStr += `–${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  const duration = durationSeconds != null ? ` (${formatDuration(durationSeconds)})` : ''
  return `${dateStr}\n${timeStr}${duration}`
}

interface HuddleCardProps {
  huddle: HuddleListItem
}

export function HuddleCard({ huddle }: HuddleCardProps) {
  const router = useRouter()
  const channelName = huddle.slack_channel_name ?? 'Unknown Channel'
  const dateTimeLines = formatHuddleDate(huddle.started_at, huddle.ended_at, huddle.duration_seconds).split('\n')
  const participantNames = huddle.participants.map((p) => p.name)
  const displayNames =
    participantNames.length <= 3
      ? participantNames.join(', ')
      : participantNames.slice(0, 3).join(', ') + ` (+${huddle.participant_count - 3} more)`
  const summary = huddle.summary_english ?? 'Processing...'

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/huddles/${huddle.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-lg">#{channelName}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line mt-0.5">
              {dateTimeLines[0]}
              <br />
              {dateTimeLines[1]}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={huddle.status} />
            {huddle.is_shared && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs" title="Shared">
                <Link2 className="h-4 w-4" />
                Shared
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">👤 {displayNames}</p>
        <p className={cn('text-sm', !huddle.summary_english && 'text-muted-foreground italic')} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {summary}
        </p>
        {huddle.key_topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {huddle.key_topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
