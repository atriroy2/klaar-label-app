'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/huddles/StatusBadge'
import { ParticipantTimeline } from '@/components/huddles/ParticipantTimeline'
import { TranscriptViewer } from '@/components/huddles/TranscriptViewer'
import { RecordingPlayer } from '@/components/huddles/RecordingPlayer'
import { useToast } from '@/components/ui/use-toast'
import MarkdownPreview from '@/components/MarkdownPreview'
import { generateHuddlePdf } from '@/lib/generate-huddle-pdf'

import type { HuddleDetail, TranscriptResponse, HuddleStatus } from '@/lib/huddle-types'

const POLL_INTERVAL_MS = 10_000

export default function HuddleDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [huddle, setHuddle] = useState<HuddleDetail | null>(null)
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/huddles/${id}`)
      if (!res.ok) throw new Error('Failed to load huddle')
      const data = await res.json()
      setHuddle(data)
    } catch {
      toast({ title: 'Error loading huddle', variant: 'destructive' })
    }
  }, [id, toast])

  const fetchTranscript = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/huddles/${id}/transcript?format=both`)
      if (!res.ok) return
      const data = await res.json()
      setTranscript(data)
    } catch {
      // optional
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchDetail(), fetchTranscript()]).finally(() => setLoading(false))
  }, [id, fetchDetail, fetchTranscript])

  const notReady = huddle && huddle.status !== 'ready' && huddle.status !== 'failed'
  useEffect(() => {
    if (!notReady) return
    const t = setInterval(() => {
      fetchDetail()
      fetchTranscript()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [notReady, fetchDetail, fetchTranscript])

  const handleShare = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/huddles/${id}/share`, { method: 'POST' })
      if (!res.ok) throw new Error('Share failed')
      toast({ title: 'Huddle shared' })
      setShareDialogOpen(false)
      await fetchDetail()
    } catch {
      toast({ title: 'Failed to share', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnshare = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/huddles/${id}/unshare`, { method: 'POST' })
      if (!res.ok) throw new Error('Unshare failed')
      toast({ title: 'Huddle unshared' })
      setUnshareDialogOpen(false)
      await fetchDetail()
    } catch {
      toast({ title: 'Failed to unshare', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/huddles/admin/retry/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Retry failed')
      toast({ title: 'Retry started' })
      await fetchDetail()
    } catch {
      toast({ title: 'Retry failed', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/huddles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'Huddle deleted' })
      router.push('/huddles')
    } catch {
      toast({ title: 'Failed to delete huddle', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPdf = () => {
    if (!huddle) return
    generateHuddlePdf(huddle, transcript)
  }

  if (loading && !huddle) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!huddle) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/huddles')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-muted-foreground">Huddle not found.</p>
      </div>
    )
  }

  const startDate = huddle.started_at ? new Date(huddle.started_at) : null
  const dateStr = startDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—'

  // Build participant label: "Shreyas, Prerona & Shruti" or "Shreyas, Prerona, Shruti & 2 more"
  const firstNames = huddle.participants.map((p) => p.name.split(' ')[0])
  const participantLabel =
    firstNames.length <= 3
      ? firstNames.length === 2
        ? `${firstNames[0]} & ${firstNames[1]}`
        : firstNames.length === 3
          ? `${firstNames[0]}, ${firstNames[1]} & ${firstNames[2]}`
          : firstNames[0] || 'Unknown'
      : `${firstNames.slice(0, 3).join(', ')} & ${firstNames.length - 3} more`

  const canUnshare = huddle.is_shared

  const statusMessage: Record<HuddleStatus, string> = {
    recording: 'This huddle is still being recorded...',
    transcribing: 'Transcript is being generated. This usually takes 1-2 minutes.',
    processing: 'AI is analyzing the transcript...',
    ready: '',
    failed: 'Processing failed.',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/huddles')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{participantLabel}</h1>
          <p className="text-muted-foreground">{dateStr}</p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={huddle.status} />
            {huddle.is_shared && (
              <span className="text-sm text-muted-foreground">Shared ✓</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {huddle.status === 'failed' && (
            <Button variant="destructive" onClick={handleRetry} disabled={actionLoading}>
              Retry Processing
            </Button>
          )}
          {huddle.status === 'ready' && (
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-1">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          )}
          {!huddle.is_shared && (
            <>
              <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
                Share with Everyone
              </Button>
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share huddle</DialogTitle>
                    <DialogDescription>
                      This will make the huddle transcript visible to all users in your organization. Continue?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleShare} disabled={actionLoading}>Share</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {huddle.is_shared && canUnshare && (
            <>
              <Button variant="outline" onClick={() => setUnshareDialogOpen(true)}>
                Unshare
              </Button>
              <Dialog open={unshareDialogOpen} onOpenChange={setUnshareDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Unshare huddle</DialogTitle>
                    <DialogDescription>
                      This will make the huddle transcript visible only to participants. Continue?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUnshareDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleUnshare} disabled={actionLoading}>Unshare</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-red-500 mr-1" />
              Delete
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete huddle?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this huddle, including the transcript, summary, and all associated data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {(huddle.status === 'recording' || huddle.status === 'transcribing' || huddle.status === 'processing' || huddle.status === 'failed') && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {statusMessage[huddle.status]}
              {huddle.status === 'failed' && ' Use "Retry Processing" to try again.'}
            </p>
          </CardContent>
        </Card>
      )}

      {huddle.status === 'ready' && (
        <>
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5" />
                Summary
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {huddle.summary_english && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownPreview content={huddle.summary_english} />
                </div>
              )}
              {huddle.action_items.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 font-medium mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Action Items
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {huddle.action_items.map((item, i) => (
                      <li key={i}>
                        {item.assignee ? `${item.assignee}: ${item.text}` : item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {huddle.key_topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {huddle.key_topics.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {huddle.has_recording && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecordingPlayer huddleId={huddle.id} />
              {transcript && transcript.utterances.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <h2 className="text-lg font-semibold">Transcript</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {transcript.utterances.map((u) => (
                        <div key={u.id} className="text-sm">
                          <span className="font-medium">{u.speaker_name}: </span>
                          <span>{u.text_original}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <ParticipantTimeline
            participants={huddle.participants}
            startedAt={huddle.started_at}
            endedAt={huddle.ended_at}
          />

          {transcript && transcript.utterances.length > 0 && (
            <TranscriptViewer utterances={transcript.utterances} />
          )}
        </>
      )}
    </div>
  )
}
