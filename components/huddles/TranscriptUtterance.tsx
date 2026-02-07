'use client'

import { cn } from '@/lib/utils'
import { formatTimestamp, getSpeakerColor } from '@/lib/huddle-utils'
import type { TranscriptUtterance as TranscriptUtteranceType } from '@/lib/huddle-types'

export type TranscriptViewMode = 'original' | 'english' | 'sideBySide'

interface TranscriptUtteranceProps {
  utterance: TranscriptUtteranceType
  speakerIndex: number
  viewMode: TranscriptViewMode
  searchHighlight?: string
}

function highlightTextStable(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  )
}

export function TranscriptUtterance({
  utterance,
  speakerIndex,
  viewMode,
  searchHighlight = '',
}: TranscriptUtteranceProps) {
  const colorClass = getSpeakerColor(speakerIndex)
  const initial = utterance.speaker_name.charAt(0).toUpperCase()
  const timeStr = formatTimestamp(utterance.start_time_seconds)
  const orig = utterance.text_original
  const eng = utterance.text_english ?? ''

  const renderOriginal = () => (
    <span className="whitespace-pre-wrap break-words">
      {searchHighlight ? highlightTextStable(orig, searchHighlight) : orig}
    </span>
  )
  const renderEnglish = () => (
    <span className="whitespace-pre-wrap break-words">
      {searchHighlight && eng ? highlightTextStable(eng, searchHighlight) : eng || orig}
    </span>
  )

  if (viewMode === 'sideBySide') {
    return (
      <div className="grid grid-cols-2 gap-4 py-2 border-b border-muted/50 last:border-0">
        <div className="flex gap-2">
          <span className="text-muted-foreground text-sm shrink-0 w-10">{timeStr}</span>
          <span
            className={cn('inline-flex h-6 w-6 shrink-0 rounded-full items-center justify-center text-xs font-medium', colorClass)}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">{renderOriginal()}</div>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground text-sm shrink-0 w-10 opacity-0">{timeStr}</span>
          <span
            className={cn('inline-flex h-6 w-6 shrink-0 rounded-full items-center justify-center text-xs font-medium opacity-0', colorClass)}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">{renderEnglish()}</div>
        </div>
      </div>
    )
  }

  const showOriginal = viewMode === 'original'
  const text = showOriginal ? orig : eng || orig

  return (
    <div className="flex gap-2 py-2 border-b border-muted/50 last:border-0">
      <span className="text-muted-foreground text-sm shrink-0 w-10">{timeStr}</span>
      <span
        className={cn('inline-flex h-6 w-6 shrink-0 rounded-full items-center justify-center text-xs font-medium', colorClass)}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{utterance.speaker_name}</p>
        <p className="text-sm">
          {searchHighlight ? highlightTextStable(text, searchHighlight) : text}
        </p>
      </div>
    </div>
  )
}
