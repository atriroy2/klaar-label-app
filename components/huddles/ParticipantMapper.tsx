'use client'

import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, UserCheck, Users, Loader2, X, CheckCheck, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { findBestMatch } from '@/lib/fuzzy-match'
import type { ParticipantDetail, AppUser, ParticipantMappingEntry } from '@/lib/huddle-types'

interface ParticipantMapperProps {
  huddleId: string
  participants: ParticipantDetail[]
  onMappingComplete: () => void
}

interface MappingRow {
  participant: ParticipantDetail
  suggestedUser: AppUser | null
  suggestedScore: number
  selectedUserId: string | null
}

export function ParticipantMapper({
  huddleId,
  participants,
  onMappingComplete,
}: ParticipantMapperProps) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [sectionOpen, setSectionOpen] = useState(true)
  const [mappedOpen, setMappedOpen] = useState(false)
  const [remapPopoverId, setRemapPopoverId] = useState<string | null>(null)
  const [remappings, setRemappings] = useState<Record<string, string>>({})
  const [savingRemap, setSavingRemap] = useState(false)
  const { toast } = useToast()

  // Fetch users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/huddles/users')
        if (!res.ok) throw new Error('Failed to load users')
        const data = await res.json()
        setUsers(data.users || [])
      } catch {
        toast({ title: 'Failed to load users', variant: 'destructive' })
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [toast])

  // Split participants into unmapped and mapped
  const unmappedParticipants = useMemo(
    () => participants.filter((p) => !p.user_id),
    [participants]
  )

  const mappedParticipants = useMemo(
    () => participants.filter((p) => p.user_id),
    [participants]
  )

  // Generate mapping rows with fuzzy suggestions
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([])

  useEffect(() => {
    if (loadingUsers || users.length === 0) return
    const rows: MappingRow[] = unmappedParticipants.map((p) => {
      const match = findBestMatch(p.name, users)
      return {
        participant: p,
        suggestedUser: match?.user ?? null,
        suggestedScore: match?.score ?? 0,
        selectedUserId: null,
      }
    })
    setMappingRows(rows)
  }, [unmappedParticipants, users, loadingUsers])

  // Count how many rows have a suggestion that hasn't been accepted yet
  const pendingSuggestions = useMemo(
    () => mappingRows.filter((r) => r.suggestedUser && !r.selectedUserId),
    [mappingRows]
  )

  const handleAcceptSuggestion = (participantId: string) => {
    setMappingRows((prev) =>
      prev.map((row) =>
        row.participant.id === participantId && row.suggestedUser
          ? { ...row, selectedUserId: row.suggestedUser.id }
          : row
      )
    )
  }

  const handleAcceptAllSuggestions = () => {
    setMappingRows((prev) =>
      prev.map((row) =>
        row.suggestedUser && !row.selectedUserId
          ? { ...row, selectedUserId: row.suggestedUser.id }
          : row
      )
    )
  }

  const handleSelectUser = (participantId: string, userId: string) => {
    setMappingRows((prev) =>
      prev.map((row) =>
        row.participant.id === participantId
          ? { ...row, selectedUserId: userId }
          : row
      )
    )
    setOpenPopoverId(null)
  }

  const handleClearSelection = (participantId: string) => {
    setMappingRows((prev) =>
      prev.map((row) =>
        row.participant.id === participantId
          ? { ...row, selectedUserId: null }
          : row
      )
    )
  }

  const mappingsToSave = mappingRows.filter((r) => r.selectedUserId)

  const handleSave = async () => {
    if (mappingsToSave.length === 0) return
    setSaving(true)
    try {
      const mappings: ParticipantMappingEntry[] = mappingsToSave.map((r) => ({
        participant_id: r.participant.id,
        user_id: r.selectedUserId!,
      }))

      const res = await fetch(`/api/huddles/${huddleId}/participants/map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save mappings')
      }

      const data = await res.json()
      toast({
        title: `Mapped ${data.mapped_count} participant${data.mapped_count === 1 ? '' : 's'}`,
      })
      onMappingComplete()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to save mappings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Remap handlers for already-mapped participants ──────────
  const handleRemapSelect = (participantId: string, userId: string) => {
    setRemappings((prev) => ({ ...prev, [participantId]: userId }))
    setRemapPopoverId(null)
  }

  const handleClearRemap = (participantId: string) => {
    setRemappings((prev) => {
      const next = { ...prev }
      delete next[participantId]
      return next
    })
  }

  const remappingsToSave = Object.entries(remappings)

  const handleSaveRemappings = async () => {
    if (remappingsToSave.length === 0) return
    setSavingRemap(true)
    try {
      const mappings: ParticipantMappingEntry[] = remappingsToSave.map(
        ([participantId, userId]) => ({
          participant_id: participantId,
          user_id: userId,
        })
      )

      const res = await fetch(`/api/huddles/${huddleId}/participants/map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save remappings')
      }

      const data = await res.json()
      toast({
        title: `Remapped ${data.mapped_count} participant${data.mapped_count === 1 ? '' : 's'}`,
      })
      setRemappings({})
      onMappingComplete()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to save remappings',
        variant: 'destructive',
      })
    } finally {
      setSavingRemap(false)
    }
  }

  // Nothing to show at all
  if (unmappedParticipants.length === 0 && mappedParticipants.length === 0) return null

  if (loadingUsers) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading users...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-lg font-semibold hover:text-muted-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  'h-5 w-5 transition-transform',
                  !sectionOpen && '-rotate-90'
                )}
              />
              <UserCheck className="h-5 w-5" />
              Map Participants
              {unmappedParticipants.length > 0 && (
                <span className="text-muted-foreground font-normal text-base">
                  ({unmappedParticipants.length} unmapped)
                </span>
              )}
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {pendingSuggestions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleAcceptAllSuggestions}
              >
                <CheckCheck className="h-4 w-4" />
                Accept All ({pendingSuggestions.length})
              </Button>
            )}
            {mappingsToSave.length > 0 && (
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="gap-1"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save ({mappingsToSave.length})
              </Button>
            )}
          </div>
        </div>
        {sectionOpen && (
          <p className="text-sm text-muted-foreground">
            Match meeting participants to users so they can access this recording.
          </p>
        )}
      </CardHeader>
      <CollapsibleContent>
      <CardContent className="space-y-4">
        {/* ─── Unmapped participants ──────────────────────────── */}
        {mappingRows.map((row) => {
          const selectedUser = row.selectedUserId
            ? users.find((u) => u.id === row.selectedUserId)
            : null

          return (
            <div
              key={row.participant.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-muted/30"
            >
              {/* Participant name from the meeting */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {row.participant.name}
                </p>
                {row.participant.is_host && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Host
                  </Badge>
                )}
              </div>

              {/* Arrow separator */}
              <span className="text-muted-foreground hidden sm:block">&rarr;</span>

              {/* Mapping controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedUser ? (
                  /* Selected user display */
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      {selectedUser.name}
                      <span className="text-xs opacity-75">
                        ({selectedUser.email})
                      </span>
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleClearSelection(row.participant.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  /* Suggestion + picker */
                  <>
                    {row.suggestedUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() =>
                          handleAcceptSuggestion(row.participant.id)
                        }
                      >
                        <Check className="h-3 w-3" />
                        {row.suggestedUser.name}
                        <span className="text-muted-foreground">
                          ({Math.round(row.suggestedScore * 100)}%)
                        </span>
                      </Button>
                    )}
                    <Popover
                      open={openPopoverId === row.participant.id}
                      onOpenChange={(open) =>
                        setOpenPopoverId(open ? row.participant.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                        >
                          <Users className="h-3 w-3" />
                          {row.suggestedUser ? 'Pick different' : 'Pick user'}
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search by name or email..." />
                          <CommandList>
                            <CommandEmpty>No user found.</CommandEmpty>
                            <CommandGroup>
                              {users.map((u) => (
                                <CommandItem
                                  key={u.id}
                                  value={`${u.name} ${u.email}`}
                                  onSelect={() =>
                                    handleSelectUser(
                                      row.participant.id,
                                      u.id
                                    )
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm">{u.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {u.email}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Save button for unmapped */}
        {unmappedParticipants.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {mappingsToSave.length === 0
                ? 'Select users to map'
                : `${mappingsToSave.length} participant${mappingsToSave.length === 1 ? '' : 's'} selected`}
            </p>
            <Button
              onClick={handleSave}
              disabled={mappingsToSave.length === 0 || saving}
              className="gap-1"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Mappings
            </Button>
          </div>
        )}

        {/* ─── Already-mapped participants (collapsible) ──────── */}
        {mappedParticipants.length > 0 && (
          <Collapsible open={mappedOpen} onOpenChange={setMappedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 w-full pt-3 border-t text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    mappedOpen && 'rotate-180'
                  )}
                />
                <Users className="h-4 w-4" />
                <span>
                  {mappedParticipants.length} mapped participant{mappedParticipants.length === 1 ? '' : 's'}
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3">
              {mappedParticipants.map((p) => {
                const currentUser = users.find((u) => u.id === p.user_id)
                const remappedUserId = remappings[p.id]
                const remappedUser = remappedUserId
                  ? users.find((u) => u.id === remappedUserId)
                  : null

                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-muted/10"
                  >
                    {/* Participant name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.is_host && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Host
                        </Badge>
                      )}
                    </div>

                    <span className="text-muted-foreground hidden sm:block">&rarr;</span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {remappedUser ? (
                        /* Show the new selection */
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="gap-1">
                            <Check className="h-3 w-3" />
                            {remappedUser.name}
                            <span className="text-xs opacity-75">
                              ({remappedUser.email})
                            </span>
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleClearRemap(p.id)}
                            title="Undo remap"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        /* Show current mapping + change button */
                        <>
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" />
                            {currentUser?.name || p.email || 'Unknown'}
                            {currentUser?.email && (
                              <span className="text-xs opacity-75">
                                ({currentUser.email})
                              </span>
                            )}
                          </Badge>
                          <Popover
                            open={remapPopoverId === p.id}
                            onOpenChange={(open) =>
                              setRemapPopoverId(open ? p.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs h-7"
                              >
                                Change
                                <ChevronsUpDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search by name or email..." />
                                <CommandList>
                                  <CommandEmpty>No user found.</CommandEmpty>
                                  <CommandGroup>
                                    {users.map((u) => (
                                      <CommandItem
                                        key={u.id}
                                        value={`${u.name} ${u.email}`}
                                        onSelect={() =>
                                          handleRemapSelect(p.id, u.id)
                                        }
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-sm">{u.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {u.email}
                                          </span>
                                        </div>
                                        {u.id === p.user_id && (
                                          <Check className="h-3 w-3 ml-auto text-muted-foreground" />
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Save remappings button */}
              {remappingsToSave.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    {remappingsToSave.length} remap{remappingsToSave.length === 1 ? '' : 's'} pending
                  </p>
                  <Button
                    onClick={handleSaveRemappings}
                    disabled={savingRemap}
                    size="sm"
                    className="gap-1"
                  >
                    {savingRemap && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Remappings
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  )
}
