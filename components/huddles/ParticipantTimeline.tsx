'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ParticipantDetail } from '@/lib/huddle-types'

interface ParticipantTimelineProps {
  participants: ParticipantDetail[]
  startedAt: string | null
  endedAt: string | null
}

export function ParticipantTimeline({
  participants,
  startedAt,
  endedAt,
}: ParticipantTimelineProps) {
  const startMs = startedAt ? new Date(startedAt).getTime() : 0
  const endMs = endedAt ? new Date(endedAt).getTime() : startMs + 1
  const durationMs = Math.max(1, endMs - startMs)

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5" />
          Participants ({participants.length})
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>{startedAt ? new Date(startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
          <span>{endedAt ? new Date(endedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
        </div>
        <div className="space-y-3">
          {participants.map((p) => {
            const joinedMs = p.joined_at ? new Date(p.joined_at).getTime() : startMs
            const leftMs = p.left_at ? new Date(p.left_at).getTime() : endMs
            const leftPct = ((joinedMs - startMs) / durationMs) * 100
            const widthPct = ((leftMs - joinedMs) / durationMs) * 100
            const tooltip = `Joined ${formatTime(p.joined_at)} · Left ${formatTime(p.left_at)}`
            return (
              <TooltipProvider key={p.email ?? p.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.is_host && (
                          <Badge variant="secondary" className="text-xs">Host</Badge>
                        )}
                      </div>
                      {p.email && (
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      )}
                      <div className="h-2 w-full rounded bg-muted overflow-hidden flex">
                        <div
                          className="h-full bg-primary rounded shrink-0"
                          style={{
                            marginLeft: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
