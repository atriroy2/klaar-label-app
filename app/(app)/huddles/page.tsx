'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Link2, Users, ChevronDown, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/huddles/StatusBadge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/huddle-utils'
import type { HuddleListItem } from '@/lib/huddle-types'

const PAGE_SIZE = 20
const POLL_INTERVAL_MS = 15_000
const DEBOUNCE_MS = 300

function formatDateRange(h: HuddleListItem): string {
  if (!h.started_at) return '—'
  const start = new Date(h.started_at)
  const dateStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  let timeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (h.ended_at) {
    const end = new Date(h.ended_at)
    timeStr += ` – ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  return `${dateStr} · ${timeStr}`
}

function formatParticipants(h: HuddleListItem): string {
  const names = h.participants.map((p) => p.name)
  if (names.length <= 3) return names.join(', ')
  return names.slice(0, 3).join(', ') + ` (+${h.participant_count - 3})`
}

const SUMMARY_PREVIEW_LEN = 48
const TOPIC_COLORS = [
  'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/30',
  'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/30',
  'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-400/30',
  'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/30',
  'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-400/30',
]

export default function HuddlesPage() {
  const router = useRouter()
  const [huddles, setHuddles] = useState<HuddleListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [participantSearch, setParticipantSearch] = useState('')
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)
  const { toast } = useToast()

  const hasMore = huddles.length < total

  // Unique participants from loaded huddles (by email; only include those with email)
  const participants = useMemo(() => {
    const seen = new Set<string>()
    const list: { email: string; name: string }[] = []
    for (const h of huddles) {
      for (const p of h.participants) {
        if (p.email && !seen.has(p.email)) {
          seen.add(p.email)
          list.push({ email: p.email, name: p.name })
        }
      }
    }
    return list.sort((a, b) => a.email.localeCompare(b.email))
  }, [huddles])

  const participantsFiltered = useMemo(() => {
    const q = participantSearch.trim().toLowerCase()
    if (!q) return participants
    return participants.filter(
      (p) => p.email.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    )
  }, [participants, participantSearch])

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  // Client-side filter by selected participants
  const filteredHuddles = useMemo(() => {
    if (selectedEmails.size === 0) return huddles
    return huddles.filter((h) =>
      h.participants.some((p) => p.email && selectedEmails.has(p.email))
    )
  }, [huddles, selectedEmails])

  const hasActiveFilters = searchInput.trim() !== '' || from !== '' || to !== '' || selectedEmails.size > 0

  const clearAllFilters = () => {
    setSearchInput('')
    setSearch('')
    setFrom('')
    setTo('')
    setSelectedEmails(new Set())
    setParticipantSearch('')
  }

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', String(PAGE_SIZE))
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/huddles?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to load huddles'
        const detail = typeof json?.detail === 'string' ? json.detail : null
        setError(detail ? `${msg} ${detail}` : msg)
        toast({ title: msg, variant: 'destructive' })
        return
      }
      setError(null)
      setTotal(json.total ?? 0)
      const list = json.huddles ?? []
      if (append) {
        setHuddles((prev) => [...prev, ...list])
      } else {
        setHuddles(list)
      }
    },
    [search, from, to, toast]
  )

  // Initial load and when filters change
  useEffect(() => {
    setPage(1)
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    fetchPage(1, false).finally(() => setLoading(false))
  }, [search, from, to])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load more when sentinel is visible
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        const nextPage = page + 1
        setPage(nextPage)
        setLoadingMore(true)
        fetchPage(nextPage, true).finally(() => setLoadingMore(false))
      },
      { rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, page, fetchPage])

  // Poll when any huddle is in progress
  const hasInProgress = huddles.some((h) =>
    ['recording', 'transcribing', 'processing'].includes(h.status)
  )
  useEffect(() => {
    if (!hasInProgress) return
    const id = setInterval(() => fetchPage(1, false), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasInProgress, fetchPage])

  if (loading && huddles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
              <Input
                placeholder="Search summaries..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-1.5">
                  <Users className="h-4 w-4" />
                  Participants
                  {selectedEmails.size > 0 && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                      {selectedEmails.size}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search by email..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="h-8"
                  />
                </div>
                <ScrollArea className="max-h-[240px]">
                  <div className="p-2 space-y-1">
                    {participantsFiltered.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No participants with email in loaded huddles.
                      </p>
                    ) : (
                      participantsFiltered.map((p) => (
                        <label
                          key={p.email}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedEmails.has(p.email)}
                            onCheckedChange={() => toggleEmail(p.email)}
                          />
                          <span className="truncate" title={p.email}>
                            {p.email}
                          </span>
                          {p.name && p.name !== p.email && (
                            <span className="text-muted-foreground truncate text-xs">({p.name})</span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
                {selectedEmails.size > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs w-full"
                      onClick={() => setSelectedEmails(new Set())}
                    >
                      Clear selection
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Date & time</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="max-w-[180px]">Participants</TableHead>
                <TableHead className="max-w-[200px]">Summary</TableHead>
                <TableHead className="max-w-[180px]">Topics</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16">Shared</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHuddles.map((h) => {
                const summary = h.summary_english ?? 'Processing...'
                const summaryPreview = summary.length <= SUMMARY_PREVIEW_LEN ? summary : summary.slice(0, SUMMARY_PREVIEW_LEN) + '…'
                const idPreview = h.id.slice(0, 6)
                return (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/huddles/${h.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="tabular-nums">{idPreview}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs font-mono text-xs break-all">
                          {h.id}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {formatDateRange(h)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {h.duration_seconds != null ? formatDuration(h.duration_seconds) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate" title={h.participants.map((p) => p.name).join(', ')}>
                      {formatParticipants(h)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{summaryPreview}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap text-xs">
                          {summary}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[180px]">
                            {(h.key_topics ?? []).slice(0, 1).map((t, i) => (
                              <span
                                key={t}
                                className={cn(
                                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                                  TOPIC_COLORS[i % TOPIC_COLORS.length]
                                )}
                              >
                                {t}
                              </span>
                            ))}
                            {(h.key_topics?.length ?? 0) > 1 && (
                              <span className="inline-flex items-center rounded-full border border-muted bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                                {h.key_topics!.length - 1 === 1 ? '1 more' : `${h.key_topics!.length - 1} more`}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs whitespace-nowrap">
                          {(h.key_topics ?? []).join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={h.status} />
                    </TableCell>
                    <TableCell>
                      {h.is_shared ? (
                        <span className="text-muted-foreground" title="Shared">
                          <Link2 className="h-4 w-4 inline" />
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            {hasMore && (
              <TableRow
                ref={sentinelRef}
                onClick={(e) => e.stopPropagation()}
              >
                <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">
                  {loadingMore ? (
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  ) : (
                    <span className="text-xs">Scroll for more</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </TooltipProvider>
        {filteredHuddles.length === 0 && !loading && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {selectedEmails.size > 0 && huddles.length > 0
              ? 'No huddles match the selected participants.'
              : 'No huddle recordings yet. Huddles will appear here once recorded.'}
          </div>
        )}
      </Card>
    </div>
  )
}
