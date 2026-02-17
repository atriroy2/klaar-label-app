'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Video, Link2, Users, ChevronDown, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import type { HuddleListItem, GoogleMeetJoinRequest } from '@/lib/huddle-types'

const PAGE_SIZE = 20
const POLL_INTERVAL_MS = 15_000

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

export default function GoogleMeetPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // ─── Join form state ───────────────────────────────────────
  const firstName = session?.user?.name?.split(' ')[0] || ''
  const [meetingUrl, setMeetingUrl] = useState('')
  const [botName, setBotName] = useState('')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [joining, setJoining] = useState(false)

  // Set default bot name when session loads
  useEffect(() => {
    if (firstName && !botName) {
      setBotName(`${firstName}'s Earl Notetaker`)
    }
  }, [firstName, botName])

  // ─── Recordings list state ─────────────────────────────────
  const [huddles, setHuddles] = useState<HuddleListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [participantSearch, setParticipantSearch] = useState('')
  const sentinelRef = useRef<HTMLTableRowElement | null>(null)

  const hasMore = huddles.length < total

  // Unique participants from loaded huddles
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

  const filteredHuddles = useMemo(() => {
    if (selectedEmails.size === 0) return huddles
    return huddles.filter((h) =>
      h.participants.some((p) => p.email && selectedEmails.has(p.email))
    )
  }, [huddles, selectedEmails])

  const hasActiveFilters = from !== '' || to !== '' || selectedEmails.size > 0

  const clearAllFilters = () => {
    setFrom('')
    setTo('')
    setSelectedEmails(new Set())
    setParticipantSearch('')
  }

  // ─── Fetch Google Meet recordings ───────────────────────────
  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const params = new URLSearchParams()
      params.set('page', String(pageNum))
      params.set('limit', String(PAGE_SIZE))
      params.set('platform', 'google_meet')
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/huddles?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to load recordings'
        setError(msg)
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
    [from, to, toast]
  )

  // Initial load and when filters change
  useEffect(() => {
    setPage(1)
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    fetchPage(1, false).finally(() => setLoading(false))
  }, [from, to])

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

  // Poll for in-progress recordings
  const hasInProgress = huddles.some((h) =>
    ['recording', 'transcribing', 'processing'].includes(h.status)
  )
  useEffect(() => {
    if (!hasInProgress) return
    const id = setInterval(() => fetchPage(1, false), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasInProgress, fetchPage])

  // ─── Join handler ──────────────────────────────────────────
  const handleJoin = async () => {
    if (!meetingUrl.includes('meet.google.com')) {
      toast({ title: 'Please enter a valid Google Meet URL', variant: 'destructive' })
      return
    }
    if (!botName.trim()) {
      toast({ title: 'Please enter a notetaker name', variant: 'destructive' })
      return
    }

    setJoining(true)
    try {
      const body: GoogleMeetJoinRequest = {
        meeting_url: meetingUrl,
        bot_name: botName.trim(),
        ...(meetingTitle.trim() ? { meeting_title: meetingTitle.trim() } : {}),
      }

      const res = await fetch('/api/google-meet/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast({
          title: data.error || 'Failed to join meeting',
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Notetaker is joining the meeting!' })
      setMeetingUrl('')
      setMeetingTitle('')

      // Refresh the list to show the new recording
      fetchPage(1, false)
    } catch (err) {
      toast({ title: 'Network error. Please try again.', variant: 'destructive' })
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Join Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Google Meet</h1>
        <p className="text-sm text-muted-foreground">
          Send a notetaker to record, transcribe, and summarize your Google Meet meetings.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Meeting URL
                </label>
                <Input
                  placeholder="https://meet.google.com/..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Notetaker Name
                </label>
                <Input
                  placeholder="Earl Notetaker"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Meeting Title (optional)
                </label>
                <Input
                  placeholder="e.g., Weekly standup, Sprint planning..."
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={joining || !meetingUrl}
                className="h-9 gap-2"
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Join Meeting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error banner */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            {participants.length > 0 && (
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
                      placeholder="Search by name or email..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[240px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {participantsFiltered.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                          No participants found.
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
                  </div>
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
            )}
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
            <div className="ml-auto text-xs text-muted-foreground">
              {total} recording{total !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recordings Table */}
      <Card>
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date & time</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="max-w-[220px]">Participants</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && huddles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin inline text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredHuddles.map((h) => (
                    <TableRow
                      key={h.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/huddles/${h.id}`)}
                    >
                      <TableCell className="text-sm font-medium">
                        {h.meeting_title || 'Google Meet'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                        {formatDateRange(h)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {h.duration_seconds != null ? formatDuration(h.duration_seconds) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[220px] truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{formatParticipants(h)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            <div className="space-y-0.5">
                              {h.participants.map((p, i) => (
                                <div key={i}>
                                  {p.name}
                                  {p.email ? <span className="text-muted-foreground ml-1">({p.email})</span> : ''}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={h.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {hasMore && (
                    <TableRow
                      ref={sentinelRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                        {loadingMore ? (
                          <Loader2 className="h-5 w-5 animate-spin inline" />
                        ) : (
                          <span className="text-xs">Scroll for more</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
        {filteredHuddles.length === 0 && !loading && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {selectedEmails.size > 0 && huddles.length > 0
              ? 'No recordings match the selected participants.'
              : 'No Google Meet recordings yet. Join a meeting above to get started.'}
          </div>
        )}
      </Card>
    </div>
  )
}
