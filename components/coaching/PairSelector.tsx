'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowRight,
  Play,
  Loader2,
  Users,
  ClipboardPaste,
  X,
  ChevronDown,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Employee, TranscriptLine, MeetingBrief } from '@/lib/coaching/types'
import { employees } from '@/lib/coaching/data'

interface PairSelectorProps {
  onStartSession: (manager: Employee, report: Employee, transcript?: TranscriptLine[], meetingBrief?: MeetingBrief | null) => void
}

// ════════════════════════════════════════════════
//  Horizontal Org Chart — top-down tree layout
// ════════════════════════════════════════════════
function OrgChartTree({
  selectedManager,
  selectedReport,
  deptColors,
  onSelectManager,
  onSelectReport,
}: {
  selectedManager: Employee | null
  selectedReport: Employee | null
  deptColors: Record<string, string>
  onSelectManager: (emp: Employee) => void
  onSelectReport: (manager: Employee, report: Employee) => void
}) {
  const root = employees.find(e => e.managerId === null)
  if (!root) return null

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex flex-col items-center min-w-full">
        <OrgNode
          employee={root}
          selectedManager={selectedManager}
          selectedReport={selectedReport}
          deptColors={deptColors}
          onSelectManager={onSelectManager}
          onSelectReport={onSelectReport}
        />
      </div>
    </div>
  )
}

// Single person card used in the tree
function PersonCard({
  employee,
  deptColors,
  isSelectedAsManager,
  isSelectedAsReport,
  isReportOfSelectedManager,
  onClick,
}: {
  employee: Employee
  deptColors: Record<string, string>
  isSelectedAsManager: boolean
  isSelectedAsReport: boolean
  isReportOfSelectedManager: boolean
  onClick: () => void
}) {
  const reports = employees.filter(e => e.managerId === employee.id)

  let ringClass = ''
  let bgClass = 'bg-card hover:bg-accent/50'
  if (isSelectedAsManager) {
    ringClass = 'ring-2 ring-blue-500'
    bgClass = 'bg-blue-50 dark:bg-blue-950/30'
  } else if (isSelectedAsReport) {
    ringClass = 'ring-2 ring-green-500'
    bgClass = 'bg-green-50 dark:bg-green-950/30'
  } else if (isReportOfSelectedManager) {
    ringClass = 'ring-1 ring-primary/50'
    bgClass = 'bg-primary/5 hover:bg-primary/10'
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-all text-center w-[120px] flex-shrink-0 ${ringClass} ${bgClass}`}
    >
      <div className={`w-9 h-9 rounded-full ${deptColors[employee.department] || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
        {employee.name.split(' ').map(n => n[0]).join('')}
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight truncate w-full">{employee.name}</p>
      <p className="text-[10px] text-muted-foreground leading-tight truncate w-full">{employee.role}</p>
      <div className="flex items-center gap-1">
        {employee.reviewScore && (
          <Badge variant="outline" className="text-[9px] py-0 px-1">
            {employee.reviewScore.toFixed(1)}
          </Badge>
        )}
        {reports.length > 0 && (
          <span className="text-[9px] text-muted-foreground">({reports.length})</span>
        )}
      </div>
    </button>
  )
}

function OrgNode({
  employee,
  selectedManager,
  selectedReport,
  deptColors,
  onSelectManager,
  onSelectReport,
}: {
  employee: Employee
  selectedManager: Employee | null
  selectedReport: Employee | null
  deptColors: Record<string, string>
  onSelectManager: (emp: Employee) => void
  onSelectReport: (manager: Employee, report: Employee) => void
}) {
  const reports = employees.filter(e => e.managerId === employee.id)
  const hasReports = reports.length > 0

  const isSelectedAsManager = selectedManager?.id === employee.id
  const isSelectedAsReport = selectedReport?.id === employee.id
  const isReportOfSelectedManager = !!(selectedManager && employee.managerId === selectedManager.id)

  const handleClick = () => {
    if (!selectedManager) {
      onSelectManager(employee)
    } else if (isSelectedAsManager) {
      onSelectManager(employee)
    } else if (isReportOfSelectedManager) {
      onSelectReport(selectedManager, employee)
    } else {
      onSelectManager(employee)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* This person */}
      <PersonCard
        employee={employee}
        deptColors={deptColors}
        isSelectedAsManager={isSelectedAsManager}
        isSelectedAsReport={isSelectedAsReport}
        isReportOfSelectedManager={isReportOfSelectedManager}
        onClick={handleClick}
      />

      {/* Connector + children */}
      {hasReports && (
        <>
          {/* Vertical line down from parent */}
          <div className="w-px h-5 bg-border" />

          {/* Horizontal bar spanning all children */}
          {reports.length > 1 && (
            <div className="relative w-full flex justify-center">
              <div
                className="h-px bg-border absolute top-0"
                style={{
                  left: `${100 / (reports.length * 2)}%`,
                  right: `${100 / (reports.length * 2)}%`,
                }}
              />
            </div>
          )}

          {/* Children row */}
          <div className="flex items-start gap-1">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-col items-center">
                {/* Vertical line from horizontal bar to child */}
                <div className="w-px h-5 bg-border" />
                <OrgNode
                  employee={report}
                  selectedManager={selectedManager}
                  selectedReport={selectedReport}
                  deptColors={deptColors}
                  onSelectManager={onSelectManager}
                  onSelectReport={onSelectReport}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface TranscriptPairInfo {
  pairId: number
  folder: string
  manager: string
  report: string
  type: 'direct' | 'skip-level'
  months: string[]
  managerPatterns: string[]
  dynamic: string
}

export default function PairSelector({ onStartSession }: PairSelectorProps) {
  const [selectedManager, setSelectedManager] = useState<Employee | null>(null)
  const [selectedReport, setSelectedReport] = useState<Employee | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showManualSelect, setShowManualSelect] = useState(false)

  // Pre-made pairs
  const [preMadePairs, setPreMadePairs] = useState<TranscriptPairInfo[]>([])
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [expandedPairId, setExpandedPairId] = useState<number | null>(null)
  const [loadingTranscriptKey, setLoadingTranscriptKey] = useState<string | null>(null)

  // Sample transcript discovery (for manual selection)
  interface SampleOption {
    folder: string
    month: string
    label: string
  }
  const [samples, setSamples] = useState<SampleOption[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [loadingFile, setLoadingFile] = useState<string | null>(null)

  // Fetch pre-made pairs on mount
  useEffect(() => {
    async function fetchPairs() {
      try {
        const res = await fetch('/api/coaching/transcripts')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setPreMadePairs(data.transcripts || [])
      } catch { /* ignore */ }
      finally { setLoadingPairs(false) }
    }
    fetchPairs()
  }, [])

  const handleLoadPreMadeTranscript = async (pair: TranscriptPairInfo, month: string) => {
    const key = `${pair.folder}/${month}`
    setLoadingTranscriptKey(key)
    try {
      const res = await fetch(`/api/coaching/transcripts/${pair.folder}/${month}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const mgr = employees.find(e => e.name.toLowerCase() === pair.manager.toLowerCase())
      const rpt = employees.find(e => e.name.toLowerCase() === pair.report.toLowerCase())
      if (mgr && rpt) {
        onStartSession(mgr, rpt, data.lines || [], data.meetingBrief || null)
      }
    } catch (err) { console.error(err) }
    finally { setLoadingTranscriptKey(null) }
  }

  const MONTH_LABELS: Record<string, string> = {
    'jan-2026': 'Jan 2026',
    'feb-2026': 'Feb 2026',
    'mar-2026': 'Mar 2026',
    'apr-2026': 'Apr 2026',
  }

  // When both are selected, look for samples
  useEffect(() => {
    if (!selectedManager || !selectedReport) { setSamples([]); return }
    async function findSamples() {
      setLoadingSamples(true)
      try {
        const res = await fetch('/api/coaching/transcripts')
        if (!res.ok) return
        const data = await res.json()
        const pairs = data.transcripts || []
        const match = pairs.find(
          (p: { manager: string; report: string }) =>
            p.manager.toLowerCase() === selectedManager!.name.toLowerCase() &&
            p.report.toLowerCase() === selectedReport!.name.toLowerCase()
        )
        if (match) {
          const monthOrder = ['jan-2026', 'feb-2026', 'mar-2026', 'apr-2026']
          const sorted = [...match.months].sort(
            (a: string, b: string) => monthOrder.indexOf(a) - monthOrder.indexOf(b)
          )
          setSamples(sorted.map((m: string) => ({ folder: match.folder, month: m, label: MONTH_LABELS[m] || m })))
        } else {
          setSamples([])
        }
      } catch { /* ignore */ }
      finally { setLoadingSamples(false) }
    }
    findSamples()
  }, [selectedManager, selectedReport])

  const loadSampleAndStart = async (sample: SampleOption) => {
    if (!selectedManager || !selectedReport) return
    setLoadingFile(`${sample.folder}/${sample.month}`)
    try {
      const res = await fetch(`/api/coaching/transcripts/${sample.folder}/${sample.month}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      onStartSession(selectedManager, selectedReport, data.lines || [], data.meetingBrief || null)
    } catch (err) { console.error(err) }
    finally { setLoadingFile(null) }
  }

  const parseAndStart = () => {
    if (!selectedManager || !selectedReport || !pasteText.trim()) return
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
    if (lines.length > 0) onStartSession(selectedManager, selectedReport, lines)
  }

  const deptColors: Record<string, string> = {
    Engineering: 'bg-blue-500',
    Sales: 'bg-green-500',
    'People & Ops': 'bg-purple-500',
    Leadership: 'bg-amber-500',
  }

  const triggerBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    CLOSED_QUESTIONS_ONLY: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    JUMPING_TO_SOLUTIONS: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
    MANAGER_DOMINATING: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    VAGUE_FEEDBACK: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
    NO_ACTION_ITEMS: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    NO_FOLLOW_UP: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    MISSED_GOAL_REFERENCE: { bg: 'bg-indigo-50 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
    ALL_CRITICISM_NO_RECOGNITION: { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  }

  const MONTH_ORDER = ['jan-2026', 'feb-2026', 'mar-2026', 'apr-2026']
  const MONTH_LABELS_FULL: Record<string, string> = {
    'jan-2026': 'January 2026', 'feb-2026': 'February 2026',
    'mar-2026': 'March 2026', 'apr-2026': 'April 2026',
  }

  const getDepartment = (name: string): string => {
    const emp = employees.find(e => e.name.toLowerCase() === name.toLowerCase())
    return emp?.department || 'Engineering'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Minimal header */}
      <div className="flex-shrink-0 border-b border-border px-8 py-5">
        <h1 className="text-2xl font-bold text-foreground">Coaching Studio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Select a 1:1 pair to start a coaching session</p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto py-8 px-8 space-y-8">

          {/* ═══ Pre-made pairs with sample transcripts ═══ */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Sample Pairs (NovaBuild Org)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pre-recorded 1:1 meetings with coaching triggers. Click a pair to see available months, then load a transcript.
              </p>
            </div>

            {loadingPairs ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading pairs...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {preMadePairs.map(pair => {
                  const isExpanded = expandedPairId === pair.pairId
                  const managerDept = getDepartment(pair.manager)
                  const reportDept = getDepartment(pair.report)
                  const sortedMonths = [...pair.months].sort(
                    (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
                  )

                  return (
                    <Card key={pair.pairId} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Pair header */}
                        <button
                          onClick={() => setExpandedPairId(isExpanded ? null : pair.pairId)}
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex gap-1">
                                <div className={`w-8 h-8 rounded-full ${deptColors[managerDept]} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                                  {pair.manager.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className={`w-8 h-8 rounded-full ${deptColors[reportDept]} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                                  {pair.report.split(' ').map(n => n[0]).join('')}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {pair.manager} → {pair.report}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs py-0">
                                    {pair.type === 'skip-level' ? 'Skip-level' : 'Direct'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs py-0">
                                    {pair.months.length} meetings
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {/* Coaching patterns */}
                          {pair.managerPatterns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pair.managerPatterns.map(pattern => {
                                const colors = triggerBadgeColors[pattern] || triggerBadgeColors.VAGUE_FEEDBACK
                                return (
                                  <Badge key={pattern} variant="outline" className={`text-xs py-0 ${colors.bg} ${colors.text} ${colors.border}`}>
                                    {pattern.replace(/_/g, ' ')}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </button>

                        {/* Expanded: months */}
                        {isExpanded && (
                          <div className="p-4 pt-0 space-y-2 border-t border-border bg-muted/20">
                            {pair.dynamic && (
                              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 mt-3 mb-2">
                                {pair.dynamic}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              {sortedMonths.map(month => {
                                const key = `${pair.folder}/${month}`
                                const isLoading = loadingTranscriptKey === key
                                return (
                                  <Button
                                    key={month}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start"
                                    disabled={!!loadingTranscriptKey}
                                    onClick={() => handleLoadPreMadeTranscript(pair, month)}
                                  >
                                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                                    {MONTH_LABELS_FULL[month] || month}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Divider — manual selection toggle */}
          <div className="border-t border-border pt-6">
            <button
              onClick={() => setShowManualSelect(!showManualSelect)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showManualSelect ? 'rotate-180' : ''}`} />
              Or select a custom pair manually
            </button>
          </div>

          {/* ═══ Manual pair selection via org chart (collapsible) ═══ */}
          {showManualSelect && <>

          {/* Selected pair card */}
          {selectedManager && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${deptColors[selectedManager.department]} flex items-center justify-center text-white text-sm font-bold`}>
                        {selectedManager.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedManager.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedManager.role}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    {selectedReport ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${deptColors[selectedReport.department]} flex items-center justify-center text-white text-sm font-bold`}>
                          {selectedReport.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{selectedReport.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedReport.role}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Click a report in the org chart below</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedManager(null); setSelectedReport(null); setSamples([]) }}>
                      <X className="w-4 h-4 mr-1" /> Reset
                    </Button>
                    {selectedReport && (
                      <Button size="sm" onClick={() => onStartSession(selectedManager, selectedReport)}>
                        <Play className="w-4 h-4 mr-1" /> Start Empty Session
                      </Button>
                    )}
                  </div>
                </div>

                {selectedReport && (
                  <div className="mt-4 pt-4 border-t border-primary/20 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {loadingSamples && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> Finding samples...
                        </div>
                      )}
                      {samples.map(s => (
                        <Button key={s.month} variant="outline" size="sm" disabled={!!loadingFile}
                          onClick={() => loadSampleAndStart(s)}>
                          {loadingFile === `${s.folder}/${s.month}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {s.label}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setShowPaste(!showPaste)}>
                        <ClipboardPaste className="w-3 h-3 mr-1" /> Paste Transcript
                      </Button>
                    </div>
                    {showPaste && (
                      <div className="space-y-2">
                        <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                          placeholder={`${selectedManager.name}: Hello, how are things?\n${selectedReport.name}: Good, wanted to discuss...`}
                          className="min-h-[120px] text-sm font-mono" />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={parseAndStart} disabled={!pasteText.trim()}>
                            <Play className="w-3 h-3 mr-1" /> Load & Start
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {pasteText.trim().split('\n').filter(l => l.trim()).length} lines
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Org chart instructions */}
          <p className="text-xs text-muted-foreground">
            {!selectedManager
              ? 'Click any person to select them as the manager, then click one of their reports to form a 1:1 pair.'
              : `${selectedManager.name} selected as manager — click a report to start, or click someone else to switch.`}
          </p>

          {/* ═══ Org Chart Tree ═══ */}
          <OrgChartTree
            selectedManager={selectedManager}
            selectedReport={selectedReport}
            deptColors={deptColors}
            onSelectManager={(emp) => { setSelectedManager(emp); setSelectedReport(null) }}
            onSelectReport={(mgr, rpt) => { setSelectedManager(mgr); setSelectedReport(rpt) }}
          />

          </>}
        </div>
      </div>
    </div>
  )
}
