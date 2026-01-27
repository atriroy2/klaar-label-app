'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { 
    Loader2, 
    Play, 
    Pause, 
    Trash2, 
    RefreshCw, 
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    RotateCcw
} from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type GenerationRun = {
    id: string
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    provider: string
    modelName: string
    totalInstances: number
    processedCount: number
    progress: number
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    configuration: {
        id: string
        name: string
        generationsPerInstance: number
    }
    instanceStats: Record<string, number>
}

type QueueSummary = {
    queuedRuns: number
    runningRuns: number
    completedRuns: number
    failedRuns: number
    totalPendingInstances: number
    totalGeneratingInstances: number
}

export default function QueueDashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { toast } = useToast()

    const [runs, setRuns] = useState<GenerationRun[]>([])
    const [summary, setSummary] = useState<QueueSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(false)

    // Check access
    useEffect(() => {
        if (status === 'loading') return
        if (!session?.user) {
            router.push('/auth/login')
            return
        }
        const isAdmin = session.user.role === 'TENANT_ADMIN' || 
            (session.user.role === 'SUPER_ADMIN' && session.user.tenantId)
        if (!isAdmin) {
            router.push('/dashboard')
        }
    }, [session, status, router])

    const fetchQueue = useCallback(async () => {
        try {
            const response = await fetch('/api/queue')
            if (response.ok) {
                const data = await response.json()
                setRuns(data.runs)
                setSummary(data.summary)
            }
        } catch (error) {
            console.error('Error fetching queue:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchQueue()
    }, [fetchQueue])

    // Auto-refresh when enabled
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(fetchQueue, 3000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchQueue])

    const handleProcessQueue = async () => {
        setProcessing(true)
        try {
            const response = await fetch('/api/worker/process', {
                method: 'POST'
            })
            const result = await response.json()
            
            console.log('[Worker Result]', result)
            
            toast({
                title: response.ok ? "Worker Executed" : "Worker Error",
                description: result.message || result.error || 'Check console for details',
                variant: response.ok ? "default" : "destructive"
            })
            
            // Refresh immediately and enable auto-refresh if there's work remaining
            await fetchQueue()
            
            if (result.remaining && result.remaining > 0) {
                setAutoRefresh(true)
                toast({
                    title: "Auto-Refresh Enabled",
                    description: `${result.remaining} instances remaining. Watching progress...`
                })
            }
        } catch (error) {
            console.error('Error processing queue:', error)
            toast({
                title: "Error",
                description: "Failed to trigger worker",
                variant: "destructive"
            })
        } finally {
            setProcessing(false)
        }
    }

    const handleCancelRun = async (runId: string) => {
        try {
            const response = await fetch(`/api/queue/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' })
            })
            
            if (response.ok) {
                toast({ title: "Success", description: "Run cancelled" })
                fetchQueue()
            } else {
                const error = await response.json()
                toast({ title: "Error", description: error.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to cancel run", variant: "destructive" })
        }
    }

    const handleRetryRun = async (runId: string) => {
        try {
            const response = await fetch(`/api/queue/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'retry' })
            })
            
            if (response.ok) {
                toast({ title: "Success", description: "Run queued for retry" })
                fetchQueue()
            } else {
                const error = await response.json()
                toast({ title: "Error", description: error.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to retry run", variant: "destructive" })
        }
    }

    const handleDeleteRun = async (runId: string) => {
        try {
            const response = await fetch(`/api/queue/${runId}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                toast({ title: "Success", description: "Run deleted" })
                fetchQueue()
            } else {
                const error = await response.json()
                toast({ title: "Error", description: error.error, variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete run", variant: "destructive" })
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'QUEUED': return <Clock className="h-4 w-4 text-yellow-500" />
            case 'RUNNING': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />
            default: return <AlertCircle className="h-4 w-4" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'QUEUED': return 'bg-yellow-500/20 text-yellow-500'
            case 'RUNNING': return 'bg-blue-500/20 text-blue-500'
            case 'COMPLETED': return 'bg-green-500/20 text-green-500'
            case 'FAILED': return 'bg-red-500/20 text-red-500'
            default: return 'bg-gray-500/20 text-gray-500'
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString()
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Generation Queue</h1>
                    <p className="text-muted-foreground">Monitor and manage LLM generation jobs</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={autoRefresh ? 'bg-green-500/20' : ''}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchQueue}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleProcessQueue}
                        disabled={processing}
                    >
                        {processing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="mr-2 h-4 w-4" />
                        )}
                        Process Queue
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.queuedRuns}</p>
                                    <p className="text-sm text-muted-foreground">Queued Runs</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.runningRuns}</p>
                                    <p className="text-sm text-muted-foreground">Running</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.completedRuns}</p>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{summary.totalPendingInstances}</p>
                                    <p className="text-sm text-muted-foreground">Pending Instances</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Runs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Generation Runs</CardTitle>
                    <CardDescription>All LLM generation jobs for your tenant</CardDescription>
                </CardHeader>
                <CardContent>
                    {runs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No generation runs yet. Execute a configuration to start.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Configuration</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Instances</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runs.map(run => (
                                    <TableRow key={run.id}>
                                        <TableCell>
                                            <Badge className={getStatusColor(run.status)}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(run.status)}
                                                    {run.status}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <a 
                                                href={`/admin/configs/${run.configuration.id}`}
                                                className="text-blue-500 hover:underline"
                                            >
                                                {run.configuration.name}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">
                                                {run.provider} / {run.modelName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${run.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm">
                                                    {run.processedCount}/{run.totalInstances}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-1">
                                                {run.instanceStats.PENDING && (
                                                    <div className="text-yellow-600">
                                                        {run.instanceStats.PENDING} pending
                                                    </div>
                                                )}
                                                {run.instanceStats.GENERATING && (
                                                    <div className="text-blue-600">
                                                        {run.instanceStats.GENERATING} generating
                                                    </div>
                                                )}
                                                {run.instanceStats.READY_FOR_RATING && (
                                                    <div className="text-green-600">
                                                        {run.instanceStats.READY_FOR_RATING} ready
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDate(run.startedAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {(run.status === 'QUEUED' || run.status === 'RUNNING') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCancelRun(run.id)}
                                                        title="Cancel"
                                                    >
                                                        <Pause className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {run.status === 'FAILED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRetryRun(run.id)}
                                                        title="Retry"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Run?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete this generation run and all its completions. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteRun(run.id)}>
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p><strong>1. Execute a Configuration</strong> - Creates a generation run with status QUEUED</p>
                    <p><strong>2. Click "Process Queue"</strong> - Triggers the worker to process instances (in dev mode)</p>
                    <p><strong>3. Monitor Progress</strong> - Use Auto-Refresh to watch progress in real-time</p>
                    <p><strong>4. On Vercel</strong> - A cron job automatically processes the queue every minute</p>
                    <p className="pt-2 text-xs">
                        💡 Tip: Check your terminal for <code>[WORKER ...]</code> logs when processing
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
