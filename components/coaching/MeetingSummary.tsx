'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, ArrowLeft, DollarSign } from 'lucide-react'
import { MeetingSummary as MeetingSummaryType, Employee } from '@/lib/coaching/types'

interface MeetingSummaryProps {
  summary: MeetingSummaryType
  manager: Employee
  report: Employee
  onBack: () => void
  onClose: () => void
}

interface CostSummary {
  totals: {
    calls: number; inputTokens: number; outputTokens: number; totalTokens: number;
    ttsCharacters: number; estimatedCostUsd: number; totalLatencyMs: number;
  };
  byTier: Record<string, { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }>;
}

export default function MeetingSummary({ summary, manager, report, onBack, onClose }: MeetingSummaryProps) {
  const [costData, setCostData] = useState<CostSummary | null>(null)

  useEffect(() => {
    fetch('/api/coaching/costs')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.totals?.calls > 0) setCostData(data) })
      .catch(() => {})
  }, [])

  const getScoreColor = (score: number) => {
    if (score < 2.5) return 'bg-red-500'
    if (score < 3.5) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  const getScoreTextColor = (score: number) => {
    if (score < 2.5) return 'text-red-700 dark:text-red-300'
    if (score < 3.5) return 'text-yellow-700 dark:text-yellow-300'
    return 'text-green-700 dark:text-green-300'
  }

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`text-sm font-semibold ${getScoreTextColor(score)}`}>{score.toFixed(1)}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${getScoreColor(score)}`}
          style={{ width: `${(score / 5) * 100}%` }} />
      </div>
    </div>
  )

  const triggerBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    CLOSED_QUESTIONS_ONLY: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    JUMPING_TO_SOLUTIONS: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
    MANAGER_DOMINATING: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    VAGUE_FEEDBACK: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
    NO_ACTION_ITEMS: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    MISSED_FOLLOW_UP: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    ALL_CRITICISM_NO_RECOGNITION: { bg: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
    NO_FOLLOW_UP: { bg: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
    MISSED_GOAL_REFERENCE: { bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  }
  const defaultTriggerColors = { bg: 'bg-gray-100 dark:bg-gray-950', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-border px-6 py-3 bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Meeting Summary</h2>
            <p className="text-xs text-muted-foreground">{manager.name} ↔ {report.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export Summary</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Close Session</Button>
        </div>
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto py-8 px-8 space-y-8">

          {/* Meeting Notes */}
          <div className="grid grid-cols-2 gap-8">
            {/* Highlights */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Highlights</h3>
              <ul className="space-y-2">
                {summary.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-primary font-bold flex-shrink-0">•</span>
                    <span className="text-sm text-foreground">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Action Items</h3>
              <div className="space-y-2">
                {summary.actionItems.length > 0 ? (
                  summary.actionItems.map((item, idx) => (
                    <Card key={idx} className="border-muted bg-muted/20">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.action}</p>
                            <p className="text-xs text-muted-foreground mt-1">Owner: {item.owner}</p>
                          </div>
                          {item.deadline && <Badge variant="outline" className="text-xs flex-shrink-0">{item.deadline}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No action items captured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Scorecards */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">Performance Scorecards</h3>
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />{manager.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{manager.role}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar label="Feedback Quality" score={summary.managerScorecard.feedbackQuality} />
                  <ScoreBar label="Listening Ratio" score={summary.managerScorecard.listeningRatio} />
                  <ScoreBar label="Open Questions" score={summary.managerScorecard.openQuestions} />
                  <ScoreBar label="Goal Alignment" score={summary.managerScorecard.goalAlignment} />
                  <ScoreBar label="Action Clarity" score={summary.managerScorecard.actionClarity} />
                  <div className="pt-4 border-t border-border mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">Overall</span>
                      <span className={`text-xl font-bold ${getScoreTextColor(summary.managerScorecard.overall)}`}>
                        {summary.managerScorecard.overall.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />{report.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{report.role}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar label="Participation" score={summary.employeeScorecard.participation} />
                  <ScoreBar label="Self-Advocacy" score={summary.employeeScorecard.selfAdvocacy} />
                  <ScoreBar label="Clarity of Needs" score={summary.employeeScorecard.clarityOfNeeds} />
                  <ScoreBar label="Goal Ownership" score={summary.employeeScorecard.goalOwnership} />
                  <div className="pt-4 border-t border-border mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">Overall</span>
                      <span className={`text-xl font-bold ${getScoreTextColor(summary.employeeScorecard.overall)}`}>
                        {summary.employeeScorecard.overall.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Triggers & Frameworks */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Coaching Triggers Detected</h4>
              <div className="space-y-2">
                {summary.triggersDetected.length > 0 ? (
                  summary.triggersDetected.map((trigger, idx) => {
                    const colors = triggerBadgeColors[trigger.trigger] || defaultTriggerColors
                    return (
                      <div key={idx} className={`p-3 rounded border ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${colors.text}`}>{trigger.trigger.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="text-xs">x{trigger.count}</Badge>
                        </div>
                        <p className={`text-xs ${colors.text}`}>Trend: {trigger.trend}</p>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No major triggers detected.</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Coaching Frameworks Applied</h4>
              <div className="flex flex-wrap gap-2">
                {summary.frameworksUsed.length > 0 ? (
                  summary.frameworksUsed.map((fw, idx) => <Badge key={idx} variant="outline" className="text-xs">{fw}</Badge>)
                ) : (
                  <p className="text-sm text-muted-foreground">No frameworks identified.</p>
                )}
              </div>
            </div>
          </div>

          {/* Cost */}
          {costData && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />Session Cost Estimate
              </h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
                      <p className="text-2xl font-bold text-foreground">${costData.totals.estimatedCostUsd.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">API Calls</p>
                      <p className="text-2xl font-bold text-foreground">{costData.totals.calls}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Tokens</p>
                      <p className="text-2xl font-bold text-foreground">{costData.totals.totalTokens.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Latency</p>
                      <p className="text-2xl font-bold text-foreground">{(costData.totals.totalLatencyMs / 1000).toFixed(1)}s</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(costData.byTier).map(([tier, data]) => (
                      <div key={tier} className="bg-background rounded-md px-3 py-2 border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {tier.replace('tier1-', 'T1 ').replace('tier2-', 'T2 ').replace('tier3-', 'T3 ')}
                        </p>
                        <p className="text-sm font-semibold text-foreground">${data.estimatedCostUsd.toFixed(4)}</p>
                        <p className="text-[10px] text-muted-foreground">{data.calls} call{data.calls !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
