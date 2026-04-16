'use client'

import { useState } from 'react'
import CoachingSession from '@/components/coaching/CoachingSession'
import PairSelector from '@/components/coaching/PairSelector'
import { Employee, TranscriptLine, CoachingSuggestion, MeetingSummary, MeetingBrief } from '@/lib/coaching/types'

export default function CoachingFullScreen() {
  const [selectedManager, setSelectedManager] = useState<Employee | null>(null)
  const [selectedReport, setSelectedReport] = useState<Employee | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState<TranscriptLine[]>([])
  const [currentMeetingBrief, setCurrentMeetingBrief] = useState<MeetingBrief | null>(null)
  const [suggestions, setSuggestions] = useState<CoachingSuggestion[]>([])
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [sessionKey, setSessionKey] = useState(0)

  const handleStartSession = (manager: Employee, report: Employee, transcript?: TranscriptLine[], meetingBrief?: MeetingBrief | null) => {
    setSelectedManager(manager)
    setSelectedReport(report)
    setCurrentTranscript(transcript || [])
    setCurrentMeetingBrief(meetingBrief || null)
    setSuggestions([])
    setSummary(null)
    setSessionKey(prev => prev + 1)
  }

  const handleEndSession = () => {
    setSelectedManager(null)
    setSelectedReport(null)
    setCurrentTranscript([])
    setCurrentMeetingBrief(null)
    setSuggestions([])
    setSummary(null)
  }

  // If no pair selected, show the pair selector
  if (!selectedManager || !selectedReport) {
    return <PairSelector onStartSession={handleStartSession} />
  }

  // Otherwise show full-screen coaching session
  return (
    <CoachingSession
      key={sessionKey}
      manager={selectedManager}
      report={selectedReport}
      initialTranscript={currentTranscript}
      initialMeetingBrief={currentMeetingBrief}
      suggestions={suggestions}
      summary={summary}
      onSuggestionsUpdate={setSuggestions}
      onSummaryUpdate={setSummary}
      onEnd={handleEndSession}
    />
  )
}
