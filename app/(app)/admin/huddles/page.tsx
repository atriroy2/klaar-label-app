'use client'

import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Link2, Users, ChevronDown, X, MessageSquare, Video } from 'lucide-react'
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
import { Role } from '@/lib/auth'
import type { AdminHuddleListItem } from '@/lib/huddle-types'

const PAGE_SIZE = 20
const POLL_INTERVAL_MS = 15_000

function formatDateRange(h: AdminHuddleListItem): string {
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

function formatParticipants(h: AdminHuddleListItem): string {
  const names = h.participants.map((p) => p.name)
  if (names.length <= 3) return names.join(', ')
  return names.slice(0, 3).join(', ') + ` (+${h.participant_count - 3})`
}

export default function AdminHuddlesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [huddles, setHuddles] = useState<AdminHuddleListItem[]>([])
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
  const { toast } = useToast()

  const hasMore = huddles.length < total

  // Admin role check — redirect non-admins
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      const isTenantAdmin = session.user.role === Role.TENANT_ADMIN
      const isSuperAdminWithTenant = session.user.role === Role.SUPER_ADMIN && session.user.tenantId
      if (!isTenantAdmin && !isSuperAdminWithTenant) {
        router.push('/dashboard')
      }
    }
  }, [session, sessionStatus, router])

  // Unique participants from loaded huddles (by email)
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

  const hasActiveFilters = from !== '' || to !== '' || selectedEmails.size > 0

  const clearAllFilters = () => {
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
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/huddles?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to load huddles'
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

  // Poll when any huddle is in progress
  const hasInProgress = huddles.some((h) =>
    ['recording', 'transcribing', 'processing'].includes(h.status)
  )
  useEffect(() => {
    if (!hasInProgress) return
    const id = setInterval(() => fetchPage(1, false), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasInProgress, fetchPage])

  if (sessionStatus === 'loading' || (loading && huddles.length === 0)) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Huddles</h1>
        <p className="text-sm text-muted-foreground">
          View all huddles across the organization. Content is not shown for privacy.
        </p>
      </div>

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
              {total} huddle{total !== 1 ? 's' : ''} total
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date & time</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="max-w-[220px]">Participants</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16">Shared</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHuddles.map((h) => {
                const idPreview = h.id.slice(0, 6)
                return (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/huddles/${h.id}`)}
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
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        {h.meeting_platform === 'zoom' ? (
                          <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        )}
                        <span className="text-muted-foreground truncate" title={h.meeting_platform === 'zoom' ? (h.meeting_title || 'Zoom Meeting') : (h.slack_channel_name || '—')}>
                          {h.meeting_platform === 'zoom' ? (h.meeting_title || 'Zoom Meeting') : (h.slack_channel_name || '—')}
                        </span>
                      </div>
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
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
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
              : 'No huddle recordings found.'}
          </div>
        )}
      </Card>
    </div>
  )
}
