'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TranscriptUtterance, type TranscriptViewMode } from './TranscriptUtterance'
import type { TranscriptUtterance as TranscriptUtteranceType } from '@/lib/huddle-types'

interface TranscriptViewerProps {
  utterances: TranscriptUtteranceType[]
}

export function TranscriptViewer({ utterances }: TranscriptViewerProps) {
  const [viewMode, setViewMode] = useState<TranscriptViewMode>('english')
  const [search, setSearch] = useState('')

  const speakerOrder = useMemo(() => {
    const seen = new Map<string, number>()
    let idx = 0
    return utterances.map((u) => {
      const key = u.speaker_name
      if (!seen.has(key)) seen.set(key, idx++)
      return seen.get(key)!
    })
  }, [utterances])

  const filtered = useMemo(() => {
    if (!search.trim()) return utterances
    const q = search.toLowerCase()
    return utterances.filter(
      (u) =>
        u.text_original.toLowerCase().includes(q) ||
        (u.text_english && u.text_english.toLowerCase().includes(q))
    )
  }, [utterances, search])

  const matchCount = search.trim()
    ? utterances.filter(
        (u) =>
          u.text_original.toLowerCase().includes(search.toLowerCase()) ||
          (u.text_english?.toLowerCase().includes(search.toLowerCase()))
      ).length
    : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" />
          Transcript
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as TranscriptViewMode)}
          >
            <ToggleGroupItem value="original">Original</ToggleGroupItem>
            <ToggleGroupItem value="english">English</ToggleGroupItem>
            <ToggleGroupItem value="sideBySide">Side by Side</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-1">
          <Input
            placeholder="Search transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {search.trim() && (
            <p className="text-xs text-muted-foreground">{matchCount} match{matchCount !== 1 ? 'es' : ''} found</p>
          )}
        </div>
        <div className="max-h-[600px] overflow-y-auto space-y-0">
          {filtered.map((u) => (
            <TranscriptUtterance
              key={u.id}
              utterance={u}
              speakerIndex={speakerOrder[utterances.indexOf(u)]}
              viewMode={viewMode}
              searchHighlight={search.trim() || undefined}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
