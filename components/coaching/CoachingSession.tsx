'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Loader2,
  Volume2,
  VolumeX,
  User,
  Users,
  Eye,
  ExternalLink,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Target,
  MessageSquare,
  BookOpen,
  TrendingUp,
  FileText,
  GripVertical,
} from 'lucide-react'
import MeetingSummary from './MeetingSummary'
import MeetingNotesEditor, { MeetingNotesEditorRef } from './MeetingNotesEditor'
import {
  Employee,
  TranscriptLine,
  CoachingSuggestion,
  MeetingSummary as MeetingSummaryType,
  ReplaySpeed,
  CoachingPerspective,
} from '@/lib/coaching/types'
import type { MeetingBrief } from '@/lib/coaching/types'
import { FRAMEWORK_LINKS } from '@/lib/coaching/prompts'

interface CoachingSessionProps {
  manager: Employee
  report: Employee
  initialTranscript: TranscriptLine[]
  initialMeetingBrief?: MeetingBrief | null
  suggestions: CoachingSuggestion[]
  summary: MeetingSummaryType | null
  onSuggestionsUpdate: (suggestions: CoachingSuggestion[]) => void
  onSummaryUpdate: (summary: MeetingSummaryType | null) => void
  onEnd: () => void
}

const SEGMENT_SIZE = 8

// ════════════════════════════════════════════════
//  Meeting Brief — pre-meeting context from Klaar data
// ════════════════════════════════════════════════
function MeetingBrief({ manager, report }: { manager: Employee; report: Employee }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Meeting Brief
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-4">
          {/* Report context — this is the person being discussed */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {report.name} — {report.role}
            </p>

            {/* Review Score */}
            {report.reviewScore && (
              <div className="flex items-start gap-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Last Review: {report.reviewScore.toFixed(1)} / 5.0
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.reviewSummary}</p>
                </div>
              </div>
            )}

            {/* Recent Feedback */}
            {report.recentFeedback && (
              <div className="flex items-start gap-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Recent Feedback</p>
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{report.recentFeedback}</p>
                </div>
              </div>
            )}

            {/* IDP Focus */}
            {report.idpFocus && (
              <div className="flex items-start gap-2.5">
                <Target className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">IDP Focus Areas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.idpFocus}</p>
                </div>
              </div>
            )}

            {/* Known coaching patterns for the manager */}
            {manager.signaturePatterns && manager.signaturePatterns.length > 0 && (
              <div className="flex items-start gap-2.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Watch For ({manager.name})
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {manager.signaturePatterns.map(p => (
                      <Badge key={p} variant="outline" className="text-[10px] py-0">
                        {p.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════
//  Main component
// ════════════════════════════════════════════════
export default function CoachingSession({
  manager,
  report,
  initialTranscript,
  initialMeetingBrief,
  suggestions,
  summary,
  onSuggestionsUpdate,
  onSummaryUpdate,
  onEnd,
}: CoachingSessionProps) {
  const [transcript, setTranscript] = useState<TranscriptLine[]>(initialTranscript)
  const [visibleLines, setVisibleLines] = useState(0)
  const [isReplaying, setIsReplaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1)
  const [showSummary, setShowSummary] = useState(!!summary)
  const [currentSuggestions, setCurrentSuggestions] = useState<CoachingSuggestion[]>(suggestions)
  const [currentSummary, setCurrentSummary] = useState<MeetingSummaryType | null>(summary)
  const [rollingSummary, setRollingSummary] = useState('')
  const rollingSummaryRef = useRef('')
  // Keep ref in sync so runSuggestion always has latest summary
  useEffect(() => { rollingSummaryRef.current = rollingSummary }, [rollingSummary])
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [meetingLink, setMeetingLink] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [perspective, setPerspective] = useState<CoachingPerspective>('manager')
  const [highlightedLines, setHighlightedLines] = useState<{ start: number; end: number } | null>(null)

  // Meeting brief from enriched transcript data
  const [meetingBrief, setMeetingBrief] = useState<MeetingBrief | null>(initialMeetingBrief || null)
  const meetingBriefRef = useRef<MeetingBrief | null>(initialMeetingBrief || null) // ref mirror — always current, no stale closures
  const notesEditorRef = useRef<MeetingNotesEditorRef>(null)

  // Gap detection tracking
  const gapDetectionCycleRef = useRef(0) // counts detection cycles, fires gap check every 3rd
  const GAP_CYCLE_INTERVAL = 3 // fire gap detection every 3rd Tier 1 detection cycle (every 24 lines)

  // Cost tracking
  interface CostSummary {
    totals: {
      calls: number; inputTokens: number; outputTokens: number; totalTokens: number;
      ttsCharacters: number; estimatedCostUsd: number; totalLatencyMs: number;
    };
    byTier: Record<string, { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }>;
    entries: Array<{
      id: string; tier: string; model: string; inputTokens: number; outputTokens: number;
      latencyMs: number; estimatedCostUsd: number; inputChars?: number;
    }>;
  }
  const [costData, setCostData] = useState<CostSummary | null>(null)
  const [showCosts, setShowCosts] = useState(false)
  const [showCostDetails, setShowCostDetails] = useState(false)

  // Right panel tab
  type PanelTab = 'transcript' | 'brief' | 'coaching' | 'notes'
  const [activeTab, setActiveTab] = useState<PanelTab>('transcript')

  // Private notes
  const [privateNotes, setPrivateNotes] = useState('')

  // Draggable panel split (percentage for left panel, default 50%)
  const [leftPanelPct, setLeftPanelPct] = useState(50)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setLeftPanelPct(Math.max(25, Math.min(75, pct)))
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  // Preload browser TTS voices (they load async in some browsers)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices() // trigger initial load
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices() // cache voices once loaded
      }
    }
  }, [])

  // Poll cost data
  useEffect(() => {
    fetch('/api/coaching/costs', { method: 'DELETE' }).catch(() => {})
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/coaching/costs')
        if (res.ok) {
          const data = await res.json()
          if (data.totals.calls > 0) setCostData(data)
        }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(poll)
  }, [])

  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const lastDetectedSegment = useRef(0)
  const suggestionIdCounter = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsReplayAbort = useRef(false)

  // --- Discover sample transcripts ---
  interface SampleTranscriptOption { folder: string; month: string; label: string }
  const [availableSamples, setAvailableSamples] = useState<SampleTranscriptOption[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [loadingSampleFile, setLoadingSampleFile] = useState<string | null>(null)

  const MONTH_LABELS: Record<string, string> = {
    'jan-2026': 'January 2026', 'feb-2026': 'February 2026',
    'mar-2026': 'March 2026', 'apr-2026': 'April 2026',
  }

  useEffect(() => {
    if (transcript.length > 0) return
    async function findSamples() {
      setLoadingSamples(true)
      try {
        const res = await fetch('/api/coaching/transcripts')
        if (!res.ok) return
        const data = await res.json()
        const pairs = data.transcripts || []
        const match = pairs.find(
          (p: { manager: string; report: string }) =>
            p.manager.toLowerCase() === manager.name.toLowerCase() &&
            p.report.toLowerCase() === report.name.toLowerCase()
        )
        if (match) {
          const monthOrder = ['jan-2026', 'feb-2026', 'mar-2026', 'apr-2026']
          const sorted = [...match.months].sort(
            (a: string, b: string) => monthOrder.indexOf(a) - monthOrder.indexOf(b)
          )
          setAvailableSamples(
            sorted.map((m: string) => ({ folder: match.folder, month: m, label: MONTH_LABELS[m] || m }))
          )
        }
      } catch { /* ignore */ }
      finally { setLoadingSamples(false) }
    }
    findSamples()
  }, [manager.name, report.name, transcript.length])

  const loadSampleTranscript = async (sample: SampleTranscriptOption) => {
    setLoadingSampleFile(`${sample.folder}/${sample.month}`)
    try {
      const res = await fetch(`/api/coaching/transcripts/${sample.folder}/${sample.month}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      console.log('[COACHING] Loaded transcript:', sample.folder, sample.month, 'lines:', data.lines?.length, 'hasBrief:', !!data.meetingBrief, 'responseKeys:', Object.keys(data))
      if (data.meetingBrief) {
        console.log('[COACHING] Meeting brief agenda items:', data.meetingBrief.agenda?.length, 'prior actions:', data.meetingBrief.priorActionItems?.length, 'new actions:', data.meetingBrief.newActionItems?.length)
      } else {
        console.warn('[COACHING] ⚠️ No meetingBrief in API response! Full response keys:', Object.keys(data))
      }
      setTranscript(data.lines || [])
      // Load meeting brief (agenda + action items) from enriched data
      if (data.meetingBrief) {
        setMeetingBrief(data.meetingBrief)
        meetingBriefRef.current = data.meetingBrief
        console.log('[COACHING] ✅ meetingBrief state + ref set')
      } else {
        setMeetingBrief(null)
        meetingBriefRef.current = null
      }
    } catch (err) { console.error('Error loading sample:', err) }
    finally { setLoadingSampleFile(null) }
  }

  // --- Paste transcript ---
  const [pasteText, setPasteText] = useState('')
  const [showPasteInput, setShowPasteInput] = useState(false)

  const parseAndLoadPastedTranscript = () => {
    if (!pasteText.trim()) return
    const lines: TranscriptLine[] = []
    const rawLines = pasteText.trim().split('\n').filter((l) => l.trim())
    for (const raw of rawLines) {
      let match = raw.match(/^\[?([A-Za-z\s.'-]+?)\]?\s*[:–\-]\s*(.+)$/)
      if (match) { lines.push({ speaker: match[1].trim(), text: match[2].trim() }); continue }
      match = raw.match(/^([A-Za-z\s.'-]+?)\s*\([^)]*\)\s*[:–\-]\s*(.+)$/)
      if (match) { lines.push({ speaker: match[1].trim(), text: match[2].trim() }); continue }
      if (lines.length > 0) { lines[lines.length - 1].text += ' ' + raw.trim() }
      else { lines.push({ speaker: 'Unknown', text: raw.trim() }) }
    }
    if (lines.length > 0) { setTranscript(lines); setPasteText(''); setShowPasteInput(false) }
  }

  // ──────────────────────────────────────────────
  //  Tier 2 Suggestion — dual perspective
  //  Tracks which triggers already have Tier 2 suggestions.
  //  First occurrence → full LLM call.
  //  Repeat occurrence → add evidence-only instance (no LLM call, saves cost).
  // ──────────────────────────────────────────────
  const firedTriggers = useRef<Set<string>>(new Set())

  const runSuggestion = useCallback(async (
    flag: string, evidence: string, segmentText: string,
    lineStart: number, lineEnd: number,
  ) => {
    // ── Repeat trigger: add evidence-only instance, skip Tier 2 LLM call ──
    if (firedTriggers.current.has(flag)) {
      // Find existing suggestions for this trigger and add a new evidence instance
      // We duplicate the existing headline/suggestion/framework but with new evidence + line refs
      setCurrentSuggestions((prev) => {
        const managerExisting = prev.find(s => s.trigger === flag && s.role === 'manager')
        const employeeExisting = prev.find(s => s.trigger === flag && s.role === 'employee')
        const newInstances: CoachingSuggestion[] = []

        if (managerExisting) {
          suggestionIdCounter.current += 1
          newInstances.push({
            ...managerExisting,
            id: `s-${suggestionIdCounter.current}`,
            evidence,
            timestamp: `Lines ${lineStart + 1}–${lineEnd}`,
            lineStart, lineEnd,
          })
        }
        if (employeeExisting) {
          suggestionIdCounter.current += 1
          newInstances.push({
            ...employeeExisting,
            id: `s-${suggestionIdCounter.current}`,
            evidence,
            timestamp: `Lines ${lineStart + 1}–${lineEnd}`,
            lineStart, lineEnd,
          })
        }
        if (newInstances.length > 0) {
          const updated = [...prev, ...newInstances]
          onSuggestionsUpdate(updated)
          return updated
        }
        return prev
      })
      return
    }

    // ── First occurrence: full Tier 2 LLM call ──
    try {
      const res = await fetch('/api/coaching/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag, evidence,
          employeeContext: {
            name: report.name, role: report.role,
            managerName: manager.name, okrs: [],
            recentFeedback: report.recentFeedback || '',
          },
          recentSegment: segmentText,
          conversationContext: {
            rollingSummary: rollingSummaryRef.current,
            previousTriggers: Array.from(firedTriggers.current),
          },
        }),
      })
      if (!res.ok) { console.error('Suggest API error:', res.status); return }
      const data = await res.json()

      firedTriggers.current.add(flag)

      const newSuggestions: CoachingSuggestion[] = []
      if (data.managerSuggestion) {
        suggestionIdCounter.current += 1
        newSuggestions.push({
          id: `s-${suggestionIdCounter.current}`, role: 'manager', trigger: flag,
          framework: data.managerSuggestion.framework || 'General',
          headline: data.managerSuggestion.headline || 'Coaching opportunity',
          suggestion: data.managerSuggestion.suggestion || 'Review coaching opportunity.',
          priority: data.managerSuggestion.priority || 'medium',
          timestamp: `Lines ${lineStart + 1}–${lineEnd}`, evidence, lineStart, lineEnd,
        })
      }
      if (data.employeeSuggestion) {
        suggestionIdCounter.current += 1
        newSuggestions.push({
          id: `s-${suggestionIdCounter.current}`, role: 'employee', trigger: flag,
          framework: data.employeeSuggestion.framework || 'GROW',
          headline: data.employeeSuggestion.headline || 'Speak up about what you need',
          suggestion: data.employeeSuggestion.suggestion || 'Consider how you can take ownership.',
          priority: data.employeeSuggestion.priority || 'medium',
          timestamp: `Lines ${lineStart + 1}–${lineEnd}`, evidence, lineStart, lineEnd,
        })
      }
      if (newSuggestions.length > 0) {
        setCurrentSuggestions((prev) => { const updated = [...prev, ...newSuggestions]; onSuggestionsUpdate(updated); return updated })
      }
    } catch (err) { console.error('Suggestion error:', err) }
  }, [report.name, report.role, report.recentFeedback, manager.name, onSuggestionsUpdate])

  // ──────────────────────────────────────────────
  //  Tier 1 Detection
  // ──────────────────────────────────────────────
  const runDetection = useCallback(
    async (segmentLines: TranscriptLine[], segStart: number, segEnd: number) => {
      if (segmentLines.length === 0) return
      setIsDetecting(true)
      try {
        const segmentText = segmentLines.map((l) => `${l.speaker}: ${l.text}`).join('\n')
        const res = await fetch('/api/coaching/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segment: segmentText, rollingSummary,
            employeeContext: {
              name: report.name, role: report.role,
              okrs: [], recentFeedback: report.recentFeedback || '',
            },
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.rollingSummary) setRollingSummary(data.rollingSummary)
        if (data.flags?.length > 0) {
          for (const flag of data.flags) {
            const evidence = data.evidence?.[flag] || 'Detected in recent segment'
            await runSuggestion(flag, evidence, segmentText, segStart, segEnd)
          }
        }
      } catch (err) { console.error('Detection error:', err) }
      finally { setIsDetecting(false) }
    },
    [rollingSummary, report, manager, runSuggestion],
  )

  // ──────────────────────────────────────────────
  //  Gap Detection — compare agenda vs rolling summary
  //  Fires every 3rd detection cycle (every 24 lines)
  //  Routes: shared gaps → suggested talking points in left panel
  //          perspective nudges → coaching cards
  // ──────────────────────────────────────────────
  const [isGapDetecting, setIsGapDetecting] = useState(false)

  const runGapDetection = useCallback(async () => {
    // Use ref (always current) instead of state (can be stale in closures)
    const brief = meetingBriefRef.current
    console.log('[GAP] runGapDetection called. meetingBriefRef:', !!brief, 'agenda:', brief?.agenda?.length, 'meetingBriefState:', !!meetingBrief, 'visibleLines:', visibleLines)
    if (!brief || !brief.agenda || brief.agenda.length === 0) {
      console.log('[GAP] Skipping — no meeting brief or empty agenda')
      return
    }

    // Read current talking point state from the editor
    const talkingPoints = notesEditorRef.current?.getTalkingPoints() || []
    const checkedItems = talkingPoints.filter(tp => tp.discussed).map(tp => tp.text)
    console.log('[GAP] Talking points:', talkingPoints.length, 'checked:', checkedItems.length, 'ref available:', !!notesEditorRef.current)

    const meetingProgress = transcript.length > 0 ? visibleLines / transcript.length : 0

    setIsGapDetecting(true)
    try {
      const res = await fetch('/api/coaching/gap-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agenda: brief.agenda,
          priorActionItems: (brief.priorActionItems || []).map(ai => ({
            text: ai.text,
            owner: ai.owner,
            status: ai.status,
          })),
          rollingSummary: rollingSummaryRef.current,
          checkedItems,
          meetingProgress,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error('[GAP] API error:', res.status, errText)
        return
      }
      const data = await res.json()
      console.log('[GAP] API response:', JSON.stringify(data, null, 2))

      // Route shared gaps → suggested talking points in left panel
      if (data.missedAgendaItems && data.missedAgendaItems.length > 0) {
        console.log('[GAP] Adding', data.missedAgendaItems.length, 'missed agenda items to left panel')
        for (const item of data.missedAgendaItems) {
          notesEditorRef.current?.addSuggestedTalkingPoint(
            `${item.nudge}`
          )
        }
      }
      if (data.missedPriorActions && data.missedPriorActions.length > 0) {
        console.log('[GAP] Adding', data.missedPriorActions.length, 'missed prior actions to left panel')
        for (const item of data.missedPriorActions) {
          notesEditorRef.current?.addSuggestedTalkingPoint(
            `Follow up: ${item.nudge}`
          )
        }
      }

      // Route perspective-specific nudges → coaching tab as special cards
      const gapCards: CoachingSuggestion[] = []

      if (data.managerNudge) {
        console.log('[GAP] Adding manager nudge to coaching tab:', data.managerNudge.substring(0, 60))
        suggestionIdCounter.current += 1
        gapCards.push({
          id: `gap-m-${suggestionIdCounter.current}`,
          role: 'manager',
          trigger: 'TALKING_POINT_GAP',
          framework: 'General',
          headline: 'Topic not yet covered',
          suggestion: data.managerNudge,
          priority: 'medium',
          timestamp: `Gap check at line ${visibleLines}`,
          evidence: 'Detected by agenda gap analysis',
        })
      }
      if (data.employeeNudge) {
        console.log('[GAP] Adding employee nudge to coaching tab:', data.employeeNudge.substring(0, 60))
        suggestionIdCounter.current += 1
        gapCards.push({
          id: `gap-e-${suggestionIdCounter.current}`,
          role: 'employee',
          trigger: 'TALKING_POINT_GAP',
          framework: 'General',
          headline: 'Topic not yet covered',
          suggestion: data.employeeNudge,
          priority: 'medium',
          timestamp: `Gap check at line ${visibleLines}`,
          evidence: 'Detected by agenda gap analysis',
        })
      }

      // Fallback: if LLM didn't generate nudges but there ARE missed items,
      // create content coaching cards from the missed agenda items themselves
      if (gapCards.length === 0 && data.missedAgendaItems && data.missedAgendaItems.length > 0) {
        console.log('[GAP] No nudges from LLM — creating fallback cards from', data.missedAgendaItems.length, 'missed items')
        for (const item of data.missedAgendaItems) {
          suggestionIdCounter.current += 1
          gapCards.push({
            id: `gap-a-${suggestionIdCounter.current}`,
            role: 'manager',
            trigger: 'TALKING_POINT_GAP',
            framework: 'General',
            headline: item.text.length > 50 ? item.text.substring(0, 47) + '...' : item.text,
            suggestion: item.nudge,
            priority: item.urgency === 'high' ? 'high' : 'medium',
            timestamp: `Gap check at line ${visibleLines}`,
            evidence: 'Detected by agenda gap analysis',
          })
        }
      }

      if (gapCards.length > 0) {
        setCurrentSuggestions(prev => {
          const updated = [...prev, ...gapCards]
          onSuggestionsUpdate(updated)
          return updated
        })
      }
    } catch (err) { console.error('[GAP] Gap detection error:', err) }
    finally { setIsGapDetecting(false) }
  }, [meetingBrief, transcript.length, visibleLines, onSuggestionsUpdate])

  // Trigger detection at segment boundaries
  // Includes 4 lines of overlap from previous segment so the LLM has
  // cross-boundary context (sees 12 lines: 4 overlap + 8 new)
  const OVERLAP_LINES = 4
  useEffect(() => {
    if (visibleLines === 0) return
    const segmentIndex = Math.floor(visibleLines / SEGMENT_SIZE)
    if (segmentIndex > lastDetectedSegment.current && visibleLines <= transcript.length) {
      lastDetectedSegment.current = segmentIndex
      const segStart = (segmentIndex - 1) * SEGMENT_SIZE
      const segEnd = segmentIndex * SEGMENT_SIZE
      // Include overlap from previous segment for cross-boundary context
      const overlapStart = Math.max(0, segStart - OVERLAP_LINES)
      runDetection(transcript.slice(overlapStart, segEnd), segStart, segEnd)

      // Fire gap detection every 3rd cycle
      gapDetectionCycleRef.current += 1
      console.log('[GAP] Detection cycle:', gapDetectionCycleRef.current, 'fires at:', GAP_CYCLE_INTERVAL, 'hasBriefRef:', !!meetingBriefRef.current, 'hasBriefState:', !!meetingBrief)
      if (gapDetectionCycleRef.current % GAP_CYCLE_INTERVAL === 0) {
        console.log('[GAP] >>> Triggering gap detection at line', visibleLines)
        runGapDetection()
      }
    }
  }, [visibleLines, transcript, runDetection, runGapDetection])

  // ──────────────────────────────────────────────
  //  Reading delay — how long to show a line based on its length
  //  ~120 wpm comfortable reading ≈ 2 words/sec → 500ms per word, min 2.5s, max 10s
  //  This is intentionally slower so the demo feels like a real conversation pace
  // ──────────────────────────────────────────────
  const getReadingDelayMs = (text: string, speed: number) => {
    const words = text.split(/\s+/).length
    const baseMs = Math.max(2500, Math.min(10000, words * 500))
    return Math.round(baseMs / speed)
  }

  // ──────────────────────────────────────────────
  //  TTS — Browser speechSynthesis (always available, no API key needed)
  //  Falls back to ElevenLabs API if available as an upgrade
  // ──────────────────────────────────────────────
  const speakLine = useCallback(
    (line: TranscriptLine, speed: number = 1): Promise<boolean> => {
      return new Promise((resolve) => {
        // Determine voice gender from employee data
        const emp = [manager, report].find((e) => e.name.toLowerCase() === line.speaker.toLowerCase())
        const isFemale = emp?.gender === 'F'

        // Use browser speechSynthesis — works everywhere, no API key
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel()

          const utterance = new SpeechSynthesisUtterance(line.text)
          utterance.rate = Math.min(speed, 3) // speechSynthesis supports 0.1 to 10
          utterance.pitch = isFemale ? 1.15 : 0.9

          // Try to pick a good voice
          const voices = window.speechSynthesis.getVoices()
          if (voices.length > 0) {
            // Prefer English voices, try to match gender
            const englishVoices = voices.filter(v => v.lang.startsWith('en'))
            const genderHints = isFemale
              ? ['female', 'samantha', 'karen', 'victoria', 'fiona', 'moira', 'tessa', 'zira']
              : ['male', 'daniel', 'james', 'alex', 'david', 'fred', 'tom', 'mark']

            let picked = englishVoices.find(v =>
              genderHints.some(h => v.name.toLowerCase().includes(h))
            )
            if (!picked && englishVoices.length >= 2) {
              // If we can't match by name, use first voice for male, second for female
              picked = isFemale ? englishVoices[1] : englishVoices[0]
            }
            if (!picked && englishVoices.length > 0) picked = englishVoices[0]
            if (!picked) picked = voices[0]

            utterance.voice = picked
          }

          setIsSpeaking(true)

          utterance.onend = () => { setIsSpeaking(false); resolve(true) }
          utterance.onerror = (e) => {
            // 'interrupted' and 'canceled' are normal during pause/reset, not real errors
            if (e.error === 'interrupted' || e.error === 'canceled') {
              setIsSpeaking(false); resolve(true)
            } else {
              console.warn('[TTS] speechSynthesis error:', e.error)
              setIsSpeaking(false); resolve(false)
            }
          }

          window.speechSynthesis.speak(utterance)
          return
        }

        // Fallback: no TTS available
        console.warn('[TTS] speechSynthesis not available')
        resolve(false)
      })
    },
    [manager, report],
  )

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [visibleLines])

  // ──────────────────────────────────────────────
  //  Unified replay loop — handles both TTS and text-only
  //  Uses an async loop instead of setInterval so each line
  //  gets a delay proportional to its length
  // ──────────────────────────────────────────────
  const replaySpeedRef = useRef(replaySpeed)
  useEffect(() => { replaySpeedRef.current = replaySpeed }, [replaySpeed])

  const replayLoopRunning = useRef(false)

  const runReplayLoop = useCallback(async () => {
    if (replayLoopRunning.current) return
    replayLoopRunning.current = true
    ttsReplayAbort.current = false

    let cursor = visibleLines
    while (cursor < transcript.length && !ttsReplayAbort.current) {
      const line = transcript[cursor]
      const speed = replaySpeedRef.current
      cursor += 1
      setVisibleLines(cursor)

      if (ttsReplayAbort.current) break

      let audioPlayed = false
      if (ttsEnabled) {
        audioPlayed = await speakLine(line, speed)
      }

      if (ttsReplayAbort.current) break

      if (audioPlayed) {
        // TTS played — short pause between lines
        const interLinePause = Math.max(50, Math.round(300 / speed))
        await new Promise((r) => setTimeout(r, interLinePause))
      } else {
        // Text-only or TTS failed — use reading-speed delay
        const readingDelay = getReadingDelayMs(line.text, speed)
        await new Promise((r) => setTimeout(r, readingDelay))
      }
    }

    replayLoopRunning.current = false
    if (cursor >= transcript.length) setIsReplaying(false)
  }, [visibleLines, transcript, speakLine, ttsEnabled])

  // Start the replay loop when isReplaying becomes true
  useEffect(() => {
    if (isReplaying) {
      runReplayLoop()
    }
    return () => {
      // Cleanup: if isReplaying goes false, abort will be set by pause/reset
    }
  }, [isReplaying, runReplayLoop])

  // Detect end of transcript
  useEffect(() => {
    if (visibleLines >= transcript.length && transcript.length > 0 && isReplaying) {
      setIsReplaying(false)
      ttsReplayAbort.current = true
    }
  }, [visibleLines, transcript.length, isReplaying])

  const startReplay = () => {
    if (visibleLines >= transcript.length) { setVisibleLines(0); lastDetectedSegment.current = 0 }
    ttsReplayAbort.current = false; setIsReplaying(true)
  }
  const pauseReplay = () => {
    setIsReplaying(false); ttsReplayAbort.current = true; replayLoopRunning.current = false
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }
  const resetReplay = () => {
    setVisibleLines(0); setIsReplaying(false); ttsReplayAbort.current = true; replayLoopRunning.current = false
    lastDetectedSegment.current = 0; firedTriggers.current.clear(); setCurrentSuggestions([]); setRollingSummary(''); rollingSummaryRef.current = ''; onSuggestionsUpdate([]); setIsSpeaking(false)
    setHighlightedLines(null); gapDetectionCycleRef.current = 0; setIsGapDetecting(false)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  }

  // ──────────────────────────────────────────────
  //  Tier 3 Summary
  // ──────────────────────────────────────────────
  const handleEndMeeting = async () => {
    setIsSummarizing(true); setIsReplaying(false); setVisibleLines(transcript.length)
    try {
      const fullTranscriptText = transcript.map((l) => `${l.speaker}: ${l.text}`).join('\n')
      const res = await fetch('/api/coaching/summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullTranscript: fullTranscriptText,
          allSuggestions: currentSuggestions.map((s) => ({ trigger: s.trigger, framework: s.framework, suggestion: s.suggestion })),
          employeeContext: { name: report.name, role: report.role, managerName: manager.name, okrs: [], recentFeedback: report.recentFeedback || '' },
          managerContext: { name: manager.name, role: manager.role },
        }),
      })
      if (!res.ok) throw new Error(`Summary API error: ${res.status}`)
      const summaryData = await res.json()
      setCurrentSummary(summaryData); onSummaryUpdate(summaryData); setShowSummary(true)
    } catch (err) {
      console.error('Summary generation error:', err)
      const fallback: MeetingSummaryType = {
        bullets: ['Meeting completed. Summary generation encountered an error.'], actionItems: [],
        managerScorecard: { feedbackQuality: 5, listeningRatio: 5, openQuestions: 5, goalAlignment: 5, actionClarity: 5, overall: 5 },
        employeeScorecard: { participation: 5, selfAdvocacy: 5, clarityOfNeeds: 5, goalOwnership: 5, overall: 5 },
        triggersDetected: [], frameworksUsed: [],
      }
      setCurrentSummary(fallback); onSummaryUpdate(fallback); setShowSummary(true)
    } finally { setIsSummarizing(false) }
  }

  // Scroll-to-line
  const scrollToLines = (start: number, end: number) => {
    setHighlightedLines({ start, end })
    const el = lineRefs.current.get(start)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightedLines(null), 4000)
  }

  // Filtered suggestions
  const activeSuggestions = currentSuggestions.filter((s) => s.role === perspective)
  const perspectivePerson = perspective === 'manager' ? manager : report

  // Group suggestions by trigger type — show coaching tip once, instances underneath
  interface SuggestionGroup {
    trigger: string
    headline: string
    framework: string
    suggestion: string // Use the most recent (or best) suggestion text
    priority: 'high' | 'medium' | 'low'
    instances: CoachingSuggestion[]
  }
  const groupedSuggestions: SuggestionGroup[] = (() => {
    const groups = new Map<string, SuggestionGroup>()
    for (const s of activeSuggestions) {
      const existing = groups.get(s.trigger)
      if (existing) {
        existing.instances.push(s)
        // Escalate priority: if any instance is high, the group is high
        if (s.priority === 'high') existing.priority = 'high'
        else if (s.priority === 'medium' && existing.priority === 'low') existing.priority = 'medium'
        // Keep the longest suggestion text (likely the most detailed)
        if (s.suggestion.length > existing.suggestion.length) {
          existing.suggestion = s.suggestion
          existing.headline = s.headline
        }
      } else {
        groups.set(s.trigger, {
          trigger: s.trigger,
          headline: s.headline,
          framework: s.framework,
          suggestion: s.suggestion,
          priority: s.priority,
          instances: [s],
        })
      }
    }
    return Array.from(groups.values())
  })()

  // Track which groups are expanded (show full coaching text + evidence)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroupExpand = (trigger: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(trigger)) next.delete(trigger)
      else next.add(trigger)
      return next
    })
  }

  // Suggestion card styling
  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    low: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  }

  // Split suggestions into behavioral (Tier 2) and content (gap detection)
  const behavioralSuggestions = groupedSuggestions.filter(g => g.trigger !== 'TALKING_POINT_GAP')
  const contentSuggestions = groupedSuggestions.filter(g => g.trigger === 'TALKING_POINT_GAP')

  const renderGroupedSuggestion = (group: SuggestionGroup) => {
    const fwLink = FRAMEWORK_LINKS[group.framework]
    const priColor = priorityColors[group.priority] || priorityColors.medium
    const isExpanded = expandedGroups.has(group.trigger)
    const instanceCount = group.instances.length
    const isContentCard = group.trigger === 'TALKING_POINT_GAP'
    // Truncate suggestion to ~first sentence for collapsed view
    const firstSentence = group.suggestion.split(/(?<=[.!?])\s+/)[0] || group.suggestion
    const hasMore = group.suggestion.length > firstSentence.length + 5

    return (
      <Card key={`${group.trigger}-${group.instances[0]?.id || ''}`} className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isContentCard
          ? 'border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/20'
          : 'border-muted'
      }`}>
        <CardContent className="px-4 py-3 space-y-1.5">
          {/* Header row: headline + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isContentCard && <Target className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
              <h4 className="text-sm font-semibold text-foreground leading-snug">{group.headline}</h4>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isContentCard && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-700 bg-violet-100 dark:bg-violet-900/40">
                  agenda gap
                </Badge>
              )}
              {!isContentCard && instanceCount > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {instanceCount}×
                </Badge>
              )}
              {!isContentCard && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 uppercase tracking-wider font-medium ${priColor}`}>
                  {group.priority}
                </Badge>
              )}
            </div>
          </div>

          {/* Collapsed: first sentence + "Show more" */}
          {!isExpanded && (
            <div>
              <p className="text-xs text-foreground/75 leading-relaxed">
                {firstSentence}{hasMore && '...'}
              </p>
              <button
                onClick={() => toggleGroupExpand(group.trigger)}
                className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
                Show more{instanceCount > 1 ? ` · ${instanceCount} occurrences` : ''}
              </button>
            </div>
          )}

          {/* Expanded: full coaching text + framework + evidence */}
          {isExpanded && (
            <>
              <p className="text-sm text-foreground/85 leading-relaxed">{group.suggestion}</p>

              {/* Framework link */}
              {fwLink?.url ? (
                <a href={fwLink.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title={fwLink.shortDesc}>
                  {fwLink.label}<ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : null}

              {/* Evidence instances */}
              <div className="pt-1.5 border-t border-border/50 space-y-1.5">
                {group.instances.map((inst, idx) => {
                  const hasLineRef = inst.lineStart !== undefined && inst.lineEnd !== undefined
                  // Get the actual transcript lines for this evidence
                  const evidenceLines = hasLineRef
                    ? transcript.slice(inst.lineStart!, inst.lineEnd!)
                    : []
                  return (
                    <div key={inst.id} className="flex items-start gap-2 text-xs">
                      {instanceCount > 1 && (
                        <span className="text-muted-foreground/50 flex-shrink-0 mt-0.5">{idx + 1}.</span>
                      )}
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <p className="text-muted-foreground italic border-l-2 border-muted pl-2 flex-1">
                          &ldquo;{inst.evidence}&rdquo;
                        </p>
                        {hasLineRef && evidenceLines.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors flex-shrink-0 mt-0.5">
                                <Eye className="w-3 h-3" />View
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="left" align="start" className="w-96 max-h-64 overflow-y-auto p-3">
                              <p className="text-xs font-semibold text-foreground mb-2">Conversation excerpt</p>
                              <div className="space-y-1.5">
                                {evidenceLines.map((line, lineIdx) => (
                                  <div key={lineIdx}>
                                    <span className={`text-xs font-semibold ${
                                      line.speaker === manager.name
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>{line.speaker}</span>
                                    <p className="text-xs text-foreground/80 leading-relaxed">{line.text}</p>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => toggleGroupExpand(group.trigger)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronUp className="w-3 h-3" />Show less
              </button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // ──────────────────────────────────────────────
  //  RENDER
  // ──────────────────────────────────────────────
  if (showSummary && currentSummary) {
    return (
      <MeetingSummary
        summary={currentSummary}
        manager={manager}
        report={report}
        onBack={() => setShowSummary(false)}
        onClose={() => { setShowSummary(false); onEnd() }}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ═══ Top bar — pair info + perspective switcher + replay controls ═══ */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2.5 flex items-center justify-between">
        {/* Left: pair info + perspective switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{manager.name}</span>
            <span className="text-muted-foreground text-xs">↔</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">{report.name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {report.managerId === manager.id ? 'Direct' : 'Skip-level'}
          </Badge>

          {/* Perspective switcher — in top bar */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 ml-2">
            <Button size="sm" variant={perspective === 'manager' ? 'default' : 'ghost'}
              className="h-7 text-xs gap-1 px-2.5" onClick={() => setPerspective('manager')}>
              <User className="w-3 h-3" />
              {manager.name.split(' ')[0]}
            </Button>
            <Button size="sm" variant={perspective === 'employee' ? 'default' : 'ghost'}
              className="h-7 text-xs gap-1 px-2.5" onClick={() => setPerspective('employee')}>
              <Users className="w-3 h-3" />
              {report.name.split(' ')[0]}
            </Button>
          </div>

          {isDetecting && (
            <Badge variant="secondary" className="animate-pulse text-xs">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />Analyzing
            </Badge>
          )}
          {isGapDetecting && (
            <Badge variant="secondary" className="animate-pulse text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />Gap check
            </Badge>
          )}
        </div>

        {/* Center: replay controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={isReplaying ? pauseReplay : startReplay} disabled={transcript.length === 0}>
            {isReplaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={resetReplay}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Select value={String(replaySpeed)} onValueChange={(val) => setReplaySpeed(parseFloat(val) as ReplaySpeed)}>
            <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="2.5">2.5x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant={ttsEnabled ? 'default' : 'outline'} className="h-8 w-8 p-0"
            onClick={() => setTtsEnabled(!ttsEnabled)}>
            {ttsEnabled ? <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
          <div className="w-32 bg-muted rounded h-1.5 mx-1">
            <div className="bg-primary h-full rounded transition-all"
              style={{ width: `${transcript.length > 0 ? (visibleLines / transcript.length) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-14 text-right">{visibleLines}/{transcript.length}</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleEndMeeting} disabled={isSummarizing || transcript.length === 0} className="h-8 text-xs">
            {isSummarizing ? (<><Loader2 className="w-3 h-3 animate-spin mr-1" />Generating...</>) : 'End Meeting'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={onEnd}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ═══ Main area — resizable two-panel ═══ */}
      <div className="flex-1 overflow-hidden flex" ref={containerRef}>

        {/* ═══ LEFT: Meeting Notes Editor ═══ */}
        <div className="flex flex-col" style={{ width: `${leftPanelPct}%` }}>

          {/* Meeting link bar */}
          <div className="flex-shrink-0 border-b border-border px-5 py-2.5 flex items-center gap-2 bg-muted/30">
            <Input
              placeholder="Paste meeting link (Google Meet, Zoom, Teams)..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="flex-1 h-8 text-xs bg-background"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!meetingLink}
              onClick={() => alert('Live meeting joining via recall.ai is coming soon.')}>
              Join Live
            </Button>
          </div>

          {/* Notes editor */}
          <div className="flex-1 overflow-hidden">
            <MeetingNotesEditor ref={notesEditorRef} manager={manager} report={report} meetingBrief={meetingBrief} />
          </div>

          {/* Cost footer */}
          {costData && (
            <div className="flex-shrink-0 border-t border-border">
              <button onClick={() => setShowCosts(!showCosts)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  <span>${costData.totals.estimatedCostUsd.toFixed(4)}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{costData.totals.calls} calls</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>{costData.totals.totalTokens.toLocaleString()} tok</span>
                </div>
                {showCosts ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>

              {showCosts && (
                <div className="px-4 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(costData.byTier).map(([tier, data]) => (
                      <div key={tier} className="bg-muted/50 rounded-md px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {tier.replace('tier1-', 'T1 ').replace('tier2-', 'T2 ').replace('tier3-', 'T3 ').replace('gap-', 'Gap ')}
                        </p>
                        <p className="text-sm font-semibold text-foreground">${data.estimatedCostUsd.toFixed(4)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {data.calls} call{data.calls !== 1 ? 's' : ''} · {(data.inputTokens + data.outputTokens).toLocaleString()} tok
                        </p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowCostDetails(!showCostDetails)} className="text-[10px] text-primary hover:underline">
                    {showCostDetails ? 'Hide' : 'Show'} call log ({costData.entries.length})
                  </button>
                  {showCostDetails && (
                    <div className="max-h-36 overflow-y-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border">
                            <th className="pb-1 pr-2">Tier</th><th className="pb-1 pr-2">Model</th>
                            <th className="pb-1 pr-2 text-right">In</th><th className="pb-1 pr-2 text-right">Out</th>
                            <th className="pb-1 pr-2 text-right">ms</th><th className="pb-1 text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costData.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-border/50">
                              <td className="py-0.5 pr-2 font-medium">{entry.tier.replace('tier1-', 'T1 ').replace('tier2-', 'T2 ').replace('tier3-', 'T3 ')}</td>
                              <td className="py-0.5 pr-2 text-muted-foreground">{entry.model}</td>
                              <td className="py-0.5 pr-2 text-right">{entry.tier === 'tts' ? `${entry.inputChars || 0}ch` : entry.inputTokens.toLocaleString()}</td>
                              <td className="py-0.5 pr-2 text-right">{entry.tier === 'tts' ? '—' : entry.outputTokens.toLocaleString()}</td>
                              <td className="py-0.5 pr-2 text-right">{entry.latencyMs}</td>
                              <td className="py-0.5 text-right font-medium">${entry.estimatedCostUsd.toFixed(5)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ DRAGGABLE RESIZER ═══ */}
        <div
          onMouseDown={handleMouseDown}
          className="flex-shrink-0 w-1.5 cursor-col-resize bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative group"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* ═══ RIGHT: 4-tab panel ═══ */}
        <div className="flex-1 flex flex-col bg-muted/20 min-w-0">

          {/* 4-tab bar: Transcript / Meeting Brief / Coaching / Private Notes */}
          <div className="flex-shrink-0 border-b border-border px-4">
            <div className="flex gap-1">
              {([
                { key: 'transcript' as PanelTab, label: 'Transcript', badge: visibleLines > 0 ? visibleLines : null },
                { key: 'brief' as PanelTab, label: 'Meeting Brief', badge: null },
                { key: 'coaching' as PanelTab, label: 'Coaching', badge: groupedSuggestions.length > 0 ? groupedSuggestions.length : null, hasGap: contentSuggestions.length > 0 },
                { key: 'notes' as PanelTab, label: 'Private Notes', badge: null },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {tab.badge !== null && (
                    <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                  {'hasGap' in tab && tab.hasGap && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-violet-500 inline-block animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            {/* ── Transcript tab ── */}
            {activeTab === 'transcript' && (
              <div className="p-5 space-y-2.5" ref={scrollRef}>
                {transcript.slice(0, visibleLines).map((line, idx) => {
                  const isHighlighted = highlightedLines && idx >= highlightedLines.start && idx < highlightedLines.end
                  return (
                    <div
                      key={idx}
                      ref={(el) => { if (el) lineRefs.current.set(idx, el) }}
                      className={`pb-2.5 border-l-2 pl-4 transition-colors rounded-r ${
                        isHighlighted
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : line.triggerBefore
                          ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
                          : 'border-transparent'
                      }`}
                    >
                      {line.triggerBefore && (
                        <Badge variant="outline"
                          className="text-xs py-0 mb-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                          ⚡ {line.triggerBefore.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs text-muted-foreground/50 w-5 flex-shrink-0">{idx + 1}</span>
                        <p className={`font-semibold text-sm ${
                          line.speaker === manager.name
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>{line.speaker}</p>
                        {line.timestamp && <span className="text-xs text-muted-foreground">{line.timestamp}</span>}
                      </div>
                      <p className="text-sm text-foreground ml-7">{line.text}</p>
                    </div>
                  )
                })}

                {/* Pre-replay state */}
                {visibleLines === 0 && transcript.length > 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Play className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Press Play to begin the transcript replay</p>
                    <p className="text-xs mt-1">Coaching suggestions appear as the AI analyzes the conversation</p>
                  </div>
                )}

                {/* No transcript — load or paste */}
                {transcript.length === 0 && (
                  <div className="py-12 px-8 space-y-6">
                    <div className="text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium text-foreground">No transcript loaded</p>
                      <p className="text-xs mt-1">Join a live meeting, paste a transcript, or load a sample below.</p>
                    </div>

                    {/* Paste */}
                    {!showPasteInput ? (
                      <div className="flex justify-center">
                        <Button variant="outline" size="sm" onClick={() => setShowPasteInput(true)}>
                          <ClipboardPaste className="w-4 h-4 mr-2" />Paste a Transcript
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-w-lg mx-auto">
                        <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                          placeholder={`${manager.name}: Hello, how are things going?\n${report.name}: Good, I wanted to discuss...`}
                          className="min-h-[140px] text-sm font-mono" />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={parseAndLoadPastedTranscript} disabled={!pasteText.trim()}>
                            <Play className="w-3 h-3 mr-2" />Load
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowPasteInput(false); setPasteText('') }}>Cancel</Button>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {pasteText.trim().split('\n').filter(l => l.trim()).length} lines
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Samples */}
                    {loadingSamples && (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Checking samples...</span>
                      </div>
                    )}
                    {!loadingSamples && availableSamples.length > 0 && (
                      <div className="space-y-3 max-w-lg mx-auto">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Sample transcripts
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {availableSamples.map((sample) => (
                            <Button key={sample.month} variant="outline" size="sm" className="justify-start"
                              disabled={!!loadingSampleFile} onClick={() => loadSampleTranscript(sample)}>
                              {loadingSampleFile === `${sample.folder}/${sample.month}`
                                ? <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                : <Play className="w-3 h-3 mr-2" />}
                              {sample.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Meeting Brief tab ── */}
            {activeTab === 'brief' && (
              <MeetingBrief manager={manager} report={report} />
            )}

            {/* ── Coaching tab ── */}
            {activeTab === 'coaching' && (
              <div className="p-4 space-y-4">
                {/* Empty state — nothing detected yet */}
                {groupedSuggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 opacity-50" />
                    </div>
                    <div className="text-sm font-medium">Listening...</div>
                    <p className="text-xs mt-2 text-center max-w-[260px]">
                      {perspective === 'manager'
                        ? 'Coaching nudges appear as behavioral patterns like vague feedback or closed questions are detected.'
                        : 'Employee coaching appears when patterns like low participation or missed advocacy are detected.'}
                    </p>
                  </div>
                )}

                {/* ── Behavioral Coaching (Tier 2) ── */}
                {behavioralSuggestions.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Behavioral Coaching
                      </h3>
                      <span className="text-[10px] text-muted-foreground/60">
                        {perspective === 'manager' ? 'SBI · Coaching Habit · Radical Candor' : 'GROW · DESC'}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {behavioralSuggestions.map(renderGroupedSuggestion)}
                    </div>
                  </div>
                )}

                {/* ── Content Coaching (Gap Detection) ── */}
                {contentSuggestions.length > 0 && (
                  <div className="space-y-2.5">
                    {behavioralSuggestions.length > 0 && <div className="border-t border-border/50" />}
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-violet-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Missed Topics
                      </h3>
                      <span className="text-[10px] text-muted-foreground/60">
                        agenda gap analysis
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {contentSuggestions.map(renderGroupedSuggestion)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Private Notes tab ── */}
            {activeTab === 'notes' && (
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Private Notes</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your notes are private and not shared with anyone in the meeting.
                  </p>
                </div>
                <Textarea
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Type your notes here... These stay private to you."
                  className="min-h-[300px] text-sm resize-none"
                />
                {privateNotes.trim().length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {privateNotes.trim().split(/\s+/).length} words
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
