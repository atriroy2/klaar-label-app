'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HuddleStatus } from '@/lib/huddle-types'

interface StatusBadgeProps {
  status: HuddleStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<
    HuddleStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; pulse?: boolean }
  > = {
    ready: { label: 'Ready', variant: 'default' },
    recording: { label: 'Recording', variant: 'destructive', pulse: true },
    transcribing: { label: 'Transcribing', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'secondary' },
    failed: { label: 'Failed', variant: 'destructive' },
  }
  const { label, variant, pulse } = config[status]
  return (
    <Badge
      variant={variant}
      className={cn(
        pulse && 'animate-pulse',
        className
      )}
    >
      {label}
    </Badge>
  )
}
