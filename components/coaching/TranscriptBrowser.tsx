'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, Loader2 } from 'lucide-react'
import { employees } from '@/lib/coaching/data'
import { TranscriptLine, Employee } from '@/lib/coaching/types'

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

interface TranscriptBrowserProps {
  onSelectTranscript: (transcript: TranscriptLine[]) => void
  onManagerReportSelected: (manager: Employee, report: Employee) => void
}

const MONTH_LABELS: Record<string, string> = {
  'jan-2026': 'January 2026',
  'feb-2026': 'February 2026',
  'mar-2026': 'March 2026',
  'apr-2026': 'April 2026',
}

// Sort months chronologically
const MONTH_ORDER = ['jan-2026', 'feb-2026', 'mar-2026', 'apr-2026']

export default function TranscriptBrowser({
  onSelectTranscript,
  onManagerReportSelected,
}: TranscriptBrowserProps) {
  const [pairs, setPairs] = useState<TranscriptPairInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPairId, setExpandedPairId] = useState<number | null>(null)
  const [loadingTranscript, setLoadingTranscript] = useState<string | null>(null)

  // Fetch pairs list on mount
  useEffect(() => {
    async function fetchPairs() {
      try {
        const res = await fetch('/api/coaching/transcripts')
        if (!res.ok) throw new Error('Failed to fetch transcripts list')
        const data = await res.json()
        setPairs(data.transcripts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchPairs()
  }, [])

  const handleLoadTranscript = async (pair: TranscriptPairInfo, month: string) => {
    const key = `${pair.folder}/${month}`
    setLoadingTranscript(key)

    try {
      const res = await fetch(`/api/coaching/transcripts/${pair.folder}/${month}`)
      if (!res.ok) throw new Error('Failed to load transcript')
      const data = await res.json()

      // Find employees in our data to pass manager/report context
      const manager = employees.find(
        (e) => e.name.toLowerCase() === pair.manager.toLowerCase()
      )
      const report = employees.find(
        (e) => e.name.toLowerCase() === pair.report.toLowerCase()
      )

      if (manager && report) {
        onManagerReportSelected(manager, report)
      }

      onSelectTranscript(data.lines || [])
    } catch (err) {
      console.error('Error loading transcript:', err)
    } finally {
      setLoadingTranscript(null)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const departmentAvatarColors: Record<string, string> = {
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

  const getDepartment = (name: string): string => {
    const emp = employees.find((e) => e.name.toLowerCase() === name.toLowerCase())
    return emp?.department || 'Engineering'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading transcripts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-sm mb-2">Error: {error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Sample Transcripts (NovaBuild Org)
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Browse pre-recorded 1:1 meetings. Click a pair to see monthly transcripts, then load
            one to replay the coaching session. All {pairs.length} pairs × 4 months available.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pairs.map((pair) => {
            const isExpanded = expandedPairId === pair.pairId
            const managerDept = getDepartment(pair.manager)
            const reportDept = getDepartment(pair.report)
            const sortedMonths = [...pair.months].sort(
              (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
            )

            return (
              <Card key={pair.pairId} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Pair header - click to expand */}
                  <button
                    onClick={() => setExpandedPairId(isExpanded ? null : pair.pairId)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex gap-1">
                          <div
                            className={`w-8 h-8 rounded-full ${
                              departmentAvatarColors[managerDept]
                            } flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}
                          >
                            {getInitials(pair.manager)}
                          </div>
                          <div
                            className={`w-8 h-8 rounded-full ${
                              departmentAvatarColors[reportDept]
                            } flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}
                          >
                            {getInitials(pair.report)}
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

                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    {/* Manager patterns preview */}
                    {pair.managerPatterns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pair.managerPatterns.map((pattern) => {
                          const colors =
                            triggerBadgeColors[pattern] || triggerBadgeColors.VAGUE_FEEDBACK
                          return (
                            <Badge
                              key={pattern}
                              variant="outline"
                              className={`text-xs py-0 ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              {pattern.replace(/_/g, ' ')}
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </button>

                  {/* Expanded content - monthly transcripts */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-muted/20">
                      {pair.dynamic && (
                        <p className="text-xs text-muted-foreground italic mb-3 border-l-2 border-primary/30 pl-2">
                          {pair.dynamic}
                        </p>
                      )}

                      {sortedMonths.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No transcripts available</p>
                      ) : (
                        sortedMonths.map((month) => {
                          const loadKey = `${pair.folder}/${month}`
                          const isLoading = loadingTranscript === loadKey

                          return (
                            <div
                              key={month}
                              className="p-3 border border-border rounded bg-background hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-sm text-foreground">
                                  {MONTH_LABELS[month] || month}
                                </p>
                              </div>

                              <Button
                                onClick={() => handleLoadTranscript(pair, month)}
                                size="sm"
                                className="w-full"
                                variant="default"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                                    Loading...
                                  </>
                                ) : (
                                  'Load Transcript'
                                )}
                              </Button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {pairs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No transcripts available</p>
            <p className="text-xs mt-1">
              Ensure transcript files are in the &quot;Cluely for HR/transcripts&quot; folder
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
