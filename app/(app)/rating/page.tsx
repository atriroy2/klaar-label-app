'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, FileText, CheckCircle, XCircle, Equal, ThumbsDown, ArrowRight, Link2, Link2Off } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import MarkdownPreview from "@/components/MarkdownPreview"

// Helper to clean up and format LLM output
function cleanLLMOutput(output: string): string {
    if (!output) return ''
    
    let cleaned = output.trim()
    
    // Remove opening code fence with optional language (```json, ```javascript, ``` etc.)
    cleaned = cleaned.replace(/^```[\w]*\n?/i, '')
    
    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```$/i, '')
    cleaned = cleaned.trim()
    
    // Check if content looks like JSON (array or object)
    const looksLikeJSON = (cleaned.startsWith('[') && cleaned.endsWith(']')) ||
                          (cleaned.startsWith('{') && cleaned.endsWith('}'))
    
    if (looksLikeJSON) {
        try {
            // Try to parse and pretty-print the JSON
            const parsed = JSON.parse(cleaned)
            const formatted = JSON.stringify(parsed, null, 2)
            // Return as a proper code block for syntax highlighting
            return '```json\n' + formatted + '\n```'
        } catch {
            // If parsing fails, just wrap in code block as-is
            return '```json\n' + cleaned + '\n```'
        }
    }
    
    // So single newlines render as line breaks in markdown (standard md treats \n as space)
    cleaned = cleaned.replace(/\n/g, '  \n')
    return cleaned
}

type RejectionReason = {
    id: string
    label: string
    description?: string
}

type Variable = {
    id: string
    key: string
    label: string
}

type Match = {
    id: string
    round: number
    configuration: {
        id: string
        name: string
        description: string | null
        rubric: string | null
        promptTemplate: string
        rejectionReasons: RejectionReason[]
        variables: Variable[]
    }
    promptInstance: {
        id: string
        data: Record<string, string>
    }
    optionA: {
        id: string
        output: string
        index: number
    }
    optionB: {
        id: string
        output: string
        index: number
    }
}

type RatingOutcome = 'A_BETTER' | 'B_BETTER' | 'BOTH_GOOD' | 'NEITHER_GOOD'

export default function RatingPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [match, setMatch] = useState<Match | null>(null)
    const [noMatches, setNoMatches] = useState(false)
    const [selectedOutcome, setSelectedOutcome] = useState<RatingOutcome | null>(null)
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [notes, setNotes] = useState('')
    const [showPromptModal, setShowPromptModal] = useState(false)
    const [ratingsCompleted, setRatingsCompleted] = useState(0)
    const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null)
    const [timeRemaining, setTimeRemaining] = useState<number>(0)
    const [syncScroll, setSyncScroll] = useState(true)
    
    // Refs for synchronized scrolling
    const optionARef = useRef<HTMLDivElement>(null)
    const optionBRef = useRef<HTMLDivElement>(null)
    const isScrolling = useRef(false)

    // Handle synchronized scrolling (same pixel position so both panels scroll at the same speed)
    const handleScroll = useCallback((source: 'A' | 'B') => {
        if (!syncScroll || isScrolling.current) return
        
        isScrolling.current = true
        
        const sourceRef = source === 'A' ? optionARef.current : optionBRef.current
        const targetRef = source === 'A' ? optionBRef.current : optionARef.current
        
        if (sourceRef && targetRef) {
            const maxTargetScroll = targetRef.scrollHeight - targetRef.clientHeight
            // Use same scroll position (pixel-for-pixel) so both panels scroll at the same speed
            targetRef.scrollTop = Math.min(sourceRef.scrollTop, Math.max(0, maxTargetScroll))
        }
        
        setTimeout(() => {
            isScrolling.current = false
        }, 10)
    }, [syncScroll])

    // Check authentication
    useEffect(() => {
        if (status === 'loading') return
        if (!session?.user) {
            router.push('/auth/login')
        }
    }, [session, status, router])

    // Fetch next match
    const fetchMatch = useCallback(async () => {
        setLoading(true)
        setSelectedOutcome(null)
        setSelectedReasons([])
        setNotes('')
        try {
            const response = await fetch('/api/ratings')
            if (response.ok) {
                const data = await response.json()
                if (data.match) {
                    setMatch(data.match)
                    setNoMatches(false)
                    if (data.lockExpiresAt) {
                        setLockExpiresAt(new Date(data.lockExpiresAt))
                    }
                } else {
                    setMatch(null)
                    setNoMatches(true)
                    setLockExpiresAt(null)
                }
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load rating task",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error fetching match:', error)
            toast({
                title: "Error",
                description: "Failed to load rating task",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (session?.user) {
            fetchMatch()
        }
    }, [session, fetchMatch])

    // Countdown timer for lock expiry
    useEffect(() => {
        if (!lockExpiresAt || !match) {
            setTimeRemaining(0)
            return
        }

        const updateRemaining = () => {
            const remaining = Math.max(0, lockExpiresAt.getTime() - Date.now())
            setTimeRemaining(remaining)
            
            // If expired, show warning
            if (remaining === 0) {
                toast({
                    title: "Session Expired",
                    description: "Your rating session has expired. Getting a new task...",
                    variant: "destructive"
                })
                // Fetch a new match after a short delay
                setTimeout(() => fetchMatch(), 1500)
            }
        }

        updateRemaining()
        const interval = setInterval(updateRemaining, 1000)
        return () => clearInterval(interval)
    }, [lockExpiresAt, match, toast, fetchMatch])

    // Format time remaining
    const formatTimeRemaining = (ms: number) => {
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const handleSubmit = async () => {
        if (!match || !selectedOutcome) {
            toast({
                title: "Error",
                description: "Please select an option",
                variant: "destructive"
            })
            return
        }

        // Require reasons for non-tie outcomes
        if ((selectedOutcome === 'A_BETTER' || selectedOutcome === 'B_BETTER' || selectedOutcome === 'NEITHER_GOOD') && 
            selectedReasons.length === 0 && match.configuration.rejectionReasons.length > 0) {
            toast({
                title: "Error",
                description: "Please select at least one reason",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: match.id,
                    outcome: selectedOutcome,
                    reasons: selectedReasons,
                    notes: notes.trim() || undefined
                })
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Rating submitted successfully"
                })
                setRatingsCompleted(prev => prev + 1)
                fetchMatch()
            } else {
                const error = await response.json()
                
                // Handle specific lock-related errors
                if (error.code === 'ALREADY_RATED' || error.code === 'SESSION_EXPIRED' || error.code === 'LOCKED_BY_OTHER') {
                    toast({
                        title: "Task Unavailable",
                        description: error.error + " Getting a new task...",
                        variant: "destructive"
                    })
                    // Fetch a new match
                    setTimeout(() => fetchMatch(), 1500)
                    return
                }
                
                if (error.code === 'NO_LOCK') {
                    toast({
                        title: "Session Issue",
                        description: "Please refresh to continue rating.",
                        variant: "destructive"
                    })
                    return
                }

                toast({
                    title: "Error",
                    description: error.error || "Failed to submit rating",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error submitting rating:', error)
            toast({
                title: "Error",
                description: "Failed to submit rating",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const toggleReason = (reasonId: string) => {
        if (selectedReasons.includes(reasonId)) {
            setSelectedReasons(selectedReasons.filter(id => id !== reasonId))
        } else {
            setSelectedReasons([...selectedReasons, reasonId])
        }
    }

    const getInterpolatedPrompt = () => {
        if (!match) return ''
        let prompt = match.configuration.promptTemplate
        for (const [key, value] of Object.entries(match.promptInstance.data)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            prompt = prompt.replace(regex, value)
        }
        return prompt
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (noMatches) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rate Responses</h1>
                    <p className="text-muted-foreground">
                        Compare and rate AI-generated responses
                    </p>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            There are no more responses waiting to be rated. Check back later!
                        </p>
                        {ratingsCompleted > 0 && (
                            <Badge variant="secondary" className="mb-4">
                                {ratingsCompleted} rating{ratingsCompleted !== 1 ? 's' : ''} completed this session
                            </Badge>
                        )}
                        <Button onClick={fetchMatch} variant="outline">
                            Check Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!match) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p>No match available</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rate Responses</h1>
                    <p className="text-muted-foreground">
                        Compare and rate AI-generated responses
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {timeRemaining > 0 && (
                        <Badge 
                            variant={timeRemaining < 60000 ? "destructive" : "outline"}
                            className={timeRemaining < 60000 ? "animate-pulse" : ""}
                        >
                            ⏱️ {formatTimeRemaining(timeRemaining)}
                        </Badge>
                    )}
                    {ratingsCompleted > 0 && (
                        <Badge variant="secondary">
                            {ratingsCompleted} completed
                        </Badge>
                    )}
                </div>
            </div>

            {/* Configuration Info */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg">{match.configuration.name}</CardTitle>
                            {match.configuration.description && (
                                <CardDescription>{match.configuration.description}</CardDescription>
                            )}
                        </div>
                        <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Full Prompt
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Full Prompt</DialogTitle>
                                    <DialogDescription>
                                        The complete prompt sent to the AI model
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="bg-muted p-4 rounded-md min-h-[400px]">
                                    <MarkdownPreview content={getInterpolatedPrompt()} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Instance Data */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Instance Details:</h4>
                        <div className="space-y-3">
                            {match.configuration.variables.map(variable => (
                                <div key={variable.id} className="bg-muted/50 p-3 rounded-md">
                                    <span className="text-xs text-muted-foreground font-medium">{variable.label}</span>
                                    <div className="text-sm mt-1 prose prose-sm max-w-none dark:prose-invert">
                                        <MarkdownPreview content={match.promptInstance.data[variable.key] || '-'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rubric */}
            {match.configuration.rubric && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Rating Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownPreview content={match.configuration.rubric} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Comparison */}
            <div className="space-y-2">
                {/* Sync scroll toggle */}
                <div className="flex justify-end">
                    <Button
                        variant={syncScroll ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSyncScroll(!syncScroll)}
                        className="gap-2"
                    >
                        {syncScroll ? (
                            <>
                                <Link2 className="h-4 w-4" />
                                Sync Scroll On
                            </>
                        ) : (
                            <>
                                <Link2Off className="h-4 w-4" />
                                Sync Scroll Off
                            </>
                        )}
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                    {/* Option A */}
                    <Card className={`transition-all min-w-0 overflow-hidden ${selectedOutcome === 'A_BETTER' ? 'ring-2 ring-primary' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between min-w-0">
                                <CardTitle className="text-base">Option A</CardTitle>
                                <Badge variant="outline">Response {match.optionA.index + 1}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-hidden p-0">
                            <div 
                                ref={optionARef}
                                onScroll={() => handleScroll('A')}
                                className="prose prose-sm max-w-none dark:prose-invert h-[400px] overflow-y-auto overflow-x-hidden bg-muted/30 p-4 rounded-b-lg break-words [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_code]:break-all"
                            >
                                <MarkdownPreview content={cleanLLMOutput(match.optionA.output)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Option B */}
                    <Card className={`transition-all min-w-0 overflow-hidden ${selectedOutcome === 'B_BETTER' ? 'ring-2 ring-primary' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between min-w-0">
                                <CardTitle className="text-base">Option B</CardTitle>
                                <Badge variant="outline">Response {match.optionB.index + 1}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-hidden p-0">
                            <div 
                                ref={optionBRef}
                                onScroll={() => handleScroll('B')}
                                className="prose prose-sm max-w-none dark:prose-invert h-[400px] overflow-y-auto overflow-x-hidden bg-muted/30 p-4 rounded-b-lg break-words [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_code]:break-all"
                            >
                                <MarkdownPreview content={cleanLLMOutput(match.optionB?.output ?? '')} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Rating Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Your Rating</CardTitle>
                    <CardDescription>Select which response is better</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                            variant={selectedOutcome === 'A_BETTER' ? 'default' : 'outline'}
                            className="h-auto py-4 flex flex-col gap-2"
                            onClick={() => setSelectedOutcome('A_BETTER')}
                        >
                            <CheckCircle className="h-5 w-5" />
                            <span>A is Better</span>
                        </Button>
                        <Button
                            variant={selectedOutcome === 'B_BETTER' ? 'default' : 'outline'}
                            className="h-auto py-4 flex flex-col gap-2"
                            onClick={() => setSelectedOutcome('B_BETTER')}
                        >
                            <CheckCircle className="h-5 w-5" />
                            <span>B is Better</span>
                        </Button>
                        <Button
                            variant={selectedOutcome === 'BOTH_GOOD' ? 'default' : 'outline'}
                            className="h-auto py-4 flex flex-col gap-2"
                            onClick={() => setSelectedOutcome('BOTH_GOOD')}
                        >
                            <Equal className="h-5 w-5" />
                            <span>Both Equally Good</span>
                        </Button>
                        <Button
                            variant={selectedOutcome === 'NEITHER_GOOD' ? 'default' : 'outline'}
                            className="h-auto py-4 flex flex-col gap-2"
                            onClick={() => setSelectedOutcome('NEITHER_GOOD')}
                        >
                            <ThumbsDown className="h-5 w-5" />
                            <span>Neither is Good</span>
                        </Button>
                    </div>

                    {/* Reasons (shown for non-tie selections) */}
                    {selectedOutcome && selectedOutcome !== 'BOTH_GOOD' && match.configuration.rejectionReasons.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <Label>
                                    {selectedOutcome === 'A_BETTER' 
                                        ? 'Why is B worse?' 
                                        : selectedOutcome === 'B_BETTER'
                                        ? 'Why is A worse?'
                                        : 'Why are both responses not good?'}
                                </Label>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {match.configuration.rejectionReasons.map(reason => (
                                        <div key={reason.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={reason.id}
                                                checked={selectedReasons.includes(reason.id)}
                                                onCheckedChange={() => toggleReason(reason.id)}
                                            />
                                            <Label htmlFor={reason.id} className="text-sm font-normal cursor-pointer">
                                                {reason.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Optional notes */}
                    {selectedOutcome && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="notes">Additional Notes (optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any additional feedback..."
                                    rows={2}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={fetchMatch}>
                        Skip
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!selectedOutcome || submitting}
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit & Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
