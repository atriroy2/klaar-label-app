'use client'

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Trash2,
  Check,
  Circle,
  GripVertical,
  ListChecks,
  MessageSquarePlus,
  StickyNote,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Employee, MeetingBrief, AgendaItem, ActionItem as ActionItemType } from '@/lib/coaching/types'

// ────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────

interface TalkingPoint {
  id: string
  text: string
  discussed: boolean
  owner: string // 'shared' | manager first name | report first name
  suggested?: boolean // AI-suggested during meeting
}

interface ActionItemLocal {
  id: string
  text: string
  owner: string
  done: boolean
  deadline?: string
  fromPrior?: boolean // carried forward from a previous meeting
  priorStatus?: string // status from previous meeting
}

// Public ref API so CoachingSession can read state and push suggestions
export interface MeetingNotesEditorRef {
  getTalkingPoints: () => TalkingPoint[]
  getActionItems: () => ActionItemLocal[]
  addSuggestedTalkingPoint: (text: string) => void
}

interface MeetingNotesEditorProps {
  manager: Employee
  report: Employee
  meetingBrief?: MeetingBrief | null
}

let _idCounter = 0
const nextId = () => `item-${++_idCounter}-${Date.now()}`

// ────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────

const MeetingNotesEditor = forwardRef<MeetingNotesEditorRef, MeetingNotesEditorProps>(
  function MeetingNotesEditor({ manager, report, meetingBrief }, ref) {
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([
    { id: nextId(), text: 'Review progress on current OKRs', discussed: false, owner: 'shared' },
    { id: nextId(), text: 'Discuss blockers and support needed', discussed: false, owner: 'shared' },
    { id: nextId(), text: 'Career development check-in', discussed: false, owner: 'shared' },
  ])
  const [actionItems, setActionItems] = useState<ActionItemLocal[]>([])
  const [sharedNotes, setSharedNotes] = useState('')

  // Load meeting brief data when it changes (transcript loaded)
  useEffect(() => {
    if (!meetingBrief) return
    console.log('[NOTES] Loading meeting brief — agenda:', meetingBrief.agenda?.length, 'prior:', meetingBrief.priorActionItems?.length, 'new:', meetingBrief.newActionItems?.length)

    // Build talking points from agenda
    if (meetingBrief.agenda && meetingBrief.agenda.length > 0) {
      setTalkingPoints(
        meetingBrief.agenda.map((a) => ({
          id: nextId(),
          text: a.text,
          discussed: false,
          owner: a.owner || 'shared',
        }))
      )
    }

    // Build action items from priorActionItems + newActionItems
    const items: ActionItemLocal[] = []

    // Prior action items first (from previous meeting, carried forward)
    if (meetingBrief.priorActionItems && meetingBrief.priorActionItems.length > 0) {
      for (const ai of meetingBrief.priorActionItems) {
        items.push({
          id: nextId(),
          text: ai.text,
          owner: ai.owner,
          done: ai.status === 'done',
          deadline: ai.originalDeadline,
          fromPrior: true,
          priorStatus: ai.status,
        })
      }
    }

    // New action items from this meeting (initially empty — populated during meeting)
    // We still load them from the enrichment so the demo has data
    if (meetingBrief.newActionItems && meetingBrief.newActionItems.length > 0) {
      for (const ai of meetingBrief.newActionItems) {
        items.push({
          id: nextId(),
          text: ai.text,
          owner: ai.owner,
          done: false,
          deadline: ai.deadline,
          fromPrior: false,
        })
      }
    }

    setActionItems(items)
  }, [meetingBrief])

  // Section collapse state
  const [expandedSections, setExpandedSections] = useState({
    talkingPoints: true,
    actionItems: true,
    sharedNotes: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // ── Talking Points ──
  const addTalkingPoint = () => {
    setTalkingPoints(prev => [...prev, { id: nextId(), text: '', discussed: false, owner: 'shared' }])
  }
  const updateTalkingPoint = (id: string, text: string) => {
    setTalkingPoints(prev => prev.map(tp => tp.id === id ? { ...tp, text } : tp))
  }
  const toggleTalkingPoint = (id: string) => {
    setTalkingPoints(prev => prev.map(tp => tp.id === id ? { ...tp, discussed: !tp.discussed } : tp))
  }
  const removeTalkingPoint = (id: string) => {
    setTalkingPoints(prev => prev.filter(tp => tp.id !== id))
  }

  // Add an AI-suggested talking point (from gap detection)
  const addSuggestedTalkingPoint = useCallback((text: string) => {
    console.log('[NOTES] Adding suggested talking point:', text)
    setTalkingPoints(prev => {
      // Don't add duplicates
      if (prev.some(tp => tp.text.toLowerCase() === text.toLowerCase())) return prev
      return [...prev, { id: nextId(), text, discussed: false, owner: 'shared', suggested: true }]
    })
  }, [])

  // ── Action Items ──
  const addActionItem = () => {
    setActionItems(prev => [...prev, { id: nextId(), text: '', owner: manager.name, done: false }])
  }
  const updateActionItem = (id: string, field: 'text' | 'owner', value: string) => {
    setActionItems(prev => prev.map(ai => ai.id === id ? { ...ai, [field]: value } : ai))
  }
  const toggleActionItem = (id: string) => {
    setActionItems(prev => prev.map(ai => ai.id === id ? { ...ai, done: !ai.done } : ai))
  }
  const removeActionItem = (id: string) => {
    setActionItems(prev => prev.filter(ai => ai.id !== id))
  }

  // Expose ref API
  useImperativeHandle(ref, () => ({
    getTalkingPoints: () => talkingPoints,
    getActionItems: () => actionItems,
    addSuggestedTalkingPoint,
  }), [talkingPoints, actionItems, addSuggestedTalkingPoint])

  const undiscussedCount = talkingPoints.filter(tp => !tp.discussed).length
  const openActionCount = actionItems.filter(ai => !ai.done).length
  const priorItems = actionItems.filter(ai => ai.fromPrior)
  const newItems = actionItems.filter(ai => !ai.fromPrior)

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-1">

        {/* ═══ Section: Talking Points ═══ */}
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => toggleSection('talkingPoints')}
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquarePlus className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Talking Points</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {undiscussedCount} remaining
              </Badge>
            </div>
            {expandedSections.talkingPoints
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {expandedSections.talkingPoints && (
            <div className="px-4 pb-3 pt-1 space-y-1.5 bg-card/50">
              {talkingPoints.map((tp) => (
                <div key={tp.id} className={`group flex items-start gap-2 ${tp.suggested ? 'animate-in fade-in slide-in-from-bottom-1 duration-300' : ''}`}>
                  <button
                    onClick={() => toggleTalkingPoint(tp.id)}
                    className={`mt-2 flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      tp.discussed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground/40 hover:border-primary'
                    }`}
                  >
                    {tp.discussed && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 flex items-start gap-1">
                    {tp.suggested && (
                      <Sparkles className="w-3 h-3 text-amber-500 mt-2.5 flex-shrink-0" />
                    )}
                    <Input
                      value={tp.text}
                      onChange={(e) => updateTalkingPoint(tp.id, e.target.value)}
                      placeholder="Add a talking point..."
                      className={`flex-1 h-8 text-sm border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 ${
                        tp.discussed ? 'line-through text-muted-foreground' : ''
                      } ${tp.suggested ? 'text-amber-700 dark:text-amber-300' : ''}`}
                    />
                  </div>
                  {tp.owner !== 'shared' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 mt-2 flex-shrink-0">
                      {tp.owner}
                    </Badge>
                  )}
                  <button
                    onClick={() => removeTalkingPoint(tp.id)}
                    className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 pl-7"
                onClick={addTalkingPoint}
              >
                <Plus className="w-3 h-3" />Add talking point
              </Button>
            </div>
          )}
        </div>

        {/* ═══ Section: Action Items ═══ */}
        <div className="rounded-lg border border-border overflow-hidden mt-3">
          <button
            onClick={() => toggleSection('actionItems')}
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ListChecks className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-foreground">Action Items</span>
              {actionItems.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {openActionCount} open
                </Badge>
              )}
            </div>
            {expandedSections.actionItems
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {expandedSections.actionItems && (
            <div className="px-4 pb-3 pt-1 space-y-2 bg-card/50">
              {actionItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 pl-7">
                  No action items yet. Add one below or they&apos;ll be auto-suggested after the meeting.
                </p>
              )}

              {/* Prior action items (from previous meeting) */}
              {priorItems.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pl-7 flex items-center gap-1">
                    <Clock className="w-3 h-3" />From previous meeting
                  </p>
                  {priorItems.map((ai) => (
                    <div key={ai.id} className="group flex items-start gap-2">
                      <button
                        onClick={() => toggleActionItem(ai.id)}
                        className={`mt-2 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          ai.done
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-muted-foreground/40 hover:border-orange-500'
                        }`}
                      >
                        {ai.done && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <div className="flex-1 space-y-1">
                        <Input
                          value={ai.text}
                          onChange={(e) => updateActionItem(ai.id, 'text', e.target.value)}
                          placeholder="What needs to be done?"
                          className={`h-8 text-sm border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 ${
                            ai.done ? 'line-through text-muted-foreground' : ''
                          }`}
                        />
                        <div className="flex items-center gap-2 pl-1">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-muted-foreground" />
                            <select
                              value={ai.owner}
                              onChange={(e) => updateActionItem(ai.id, 'owner', e.target.value)}
                              className="text-[11px] text-muted-foreground bg-transparent border-0 focus:outline-none cursor-pointer hover:text-foreground"
                            >
                              <option value={manager.name}>{manager.name}</option>
                              <option value={report.name}>{report.name}</option>
                            </select>
                          </div>
                          {ai.priorStatus && ai.priorStatus !== 'done' && (
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                              ai.priorStatus === 'pending' ? 'text-amber-600 border-amber-300' : 'text-blue-600 border-blue-300'
                            }`}>
                              {ai.priorStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeActionItem(ai.id)}
                        className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New action items */}
              {newItems.length > 0 && priorItems.length > 0 && (
                <div className="border-t border-border/50 pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pl-7 mb-1.5">
                    This meeting
                  </p>
                </div>
              )}
              {newItems.map((ai) => (
                <div key={ai.id} className="group flex items-start gap-2">
                  <button
                    onClick={() => toggleActionItem(ai.id)}
                    className={`mt-2 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      ai.done
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground/40 hover:border-orange-500'
                    }`}
                  >
                    {ai.done && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={ai.text}
                      onChange={(e) => updateActionItem(ai.id, 'text', e.target.value)}
                      placeholder="What needs to be done?"
                      className={`h-8 text-sm border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 ${
                        ai.done ? 'line-through text-muted-foreground' : ''
                      }`}
                    />
                    <div className="flex items-center gap-2 pl-1">
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-muted-foreground" />
                        <select
                          value={ai.owner}
                          onChange={(e) => updateActionItem(ai.id, 'owner', e.target.value)}
                          className="text-[11px] text-muted-foreground bg-transparent border-0 focus:outline-none cursor-pointer hover:text-foreground"
                        >
                          <option value={manager.name}>{manager.name}</option>
                          <option value={report.name}>{report.name}</option>
                        </select>
                      </div>
                      {ai.deadline && (
                        <span className="text-[10px] text-muted-foreground">
                          due {new Date(ai.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeActionItem(ai.id)}
                    className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 pl-7"
                onClick={addActionItem}
              >
                <Plus className="w-3 h-3" />Add action item
              </Button>
            </div>
          )}
        </div>

        {/* ═══ Section: Shared Notes ═══ */}
        <div className="rounded-lg border border-border overflow-hidden mt-3">
          <button
            onClick={() => toggleSection('sharedNotes')}
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <StickyNote className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">Shared Notes</span>
            </div>
            {expandedSections.sharedNotes
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {expandedSections.sharedNotes && (
            <div className="px-4 pb-4 pt-2 bg-card/50">
              <Textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                placeholder="Shared meeting notes visible to both participants..."
                className="min-h-[160px] text-sm resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
              />
            </div>
          )}
        </div>

      </div>
    </ScrollArea>
  )
})

export default MeetingNotesEditor
