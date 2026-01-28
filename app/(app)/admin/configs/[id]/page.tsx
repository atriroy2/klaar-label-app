'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, Play, Download, Trash2, Plus, Save, AlertCircle, X, CheckCircle, RotateCcw, RefreshCw, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import MarkdownEditor from "@/components/MarkdownEditor"
import MarkdownPreview from "@/components/MarkdownPreview"

type Variable = {
    id: string
    key: string
    label: string
    description?: string
    required: boolean
}

type Completion = {
    id: string
    output: string
    provider: string
    modelName: string
    tokensUsed?: number
    index: number
    createdAt: string
}

type Instance = {
    id: string
    data: Record<string, string>
    status: string
    createdAt: string
    _count?: { completions: number; ratingMatches: number }
    completions?: Completion[]
}

type GenerationRun = {
    id: string
    status: string
    provider: string
    modelName: string
    totalInstances: number
    processedCount: number
    errorMessage?: string
    startedAt?: string
    completedAt?: string
    createdAt: string
}

type RatingResponseData = {
    id: string
    outcome: string
    reasons: string[]
    notes?: string
    createdAt: string
    user: { id: string; name: string | null; email: string }
}

type RatingMatchData = {
    id: string
    round: number
    isComplete: boolean
    outcome?: string
    createdAt: string
    promptInstance: { id: string; data: Record<string, string> }
    optionA: { id: string; index: number; output: string }
    optionB: { id: string; index: number; output: string }
    winner?: { id: string; index: number }
    responses: RatingResponseData[]
}

type RatingSummary = {
    totalMatches: number
    completedMatches: number
    pendingMatches: number
    totalResponses: number
}

type RejectionReason = {
    id: string
    label: string
    description?: string
    sortOrder: number
}

type Configuration = {
    id: string
    name: string
    description: string | null
    promptTemplate: string
    modelProvider: string
    modelName: string
    apiKey?: string
    generationsPerInstance: number
    rubric: string | null
    status: string
    tags: string[]
    createdAt: string
    variables: Variable[]
    rejectionReasons: RejectionReason[]
    instances: Instance[]
    generationRuns: GenerationRun[]
    _count: { instances: number; ratingMatches: number }
}

export default function ConfigurationDetailPage({ params }: { params: { id: string } }) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<Configuration | null>(null)
    const [instances, setInstances] = useState<Instance[]>([])
    const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true')
    const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null)
    const [completions, setCompletions] = useState<Completion[]>([])
    const [loadingCompletions, setLoadingCompletions] = useState(false)
    const [ratings, setRatings] = useState<RatingMatchData[]>([])
    const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null)
    const [loadingRatings, setLoadingRatings] = useState(false)
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [executing, setExecuting] = useState(false)

    // Edit form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        promptTemplate: '',
        modelProvider: 'OPENAI',
        modelName: 'gpt-4',
        apiKey: '',
        generationsPerInstance: 2,
        rubric: '',
        tags: [] as string[],
        tagInput: '',
        variables: [{ key: '', label: '', description: '', required: true }] as { key: string; label: string; description: string; required: boolean }[],
        rejectionReasons: [{ label: '', description: '' }] as { label: string; description: string }[]
    })

    // Instance upload state
    const [jsonInput, setJsonInput] = useState('')
    const [dataPreview, setDataPreview] = useState<Record<string, string>[]>([])
    const [dataHeaders, setDataHeaders] = useState<string[]>([])
    const [jsonError, setJsonError] = useState<string | null>(null)

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

    // Fetch configuration
    const fetchConfig = useCallback(async () => {
        try {
            const configRes = await fetch(`/api/configs/${params.id}`)

            if (configRes.ok) {
                const data = await configRes.json()
                setConfig(data)
                setInstances(data.instances || [])
                
                // Initialize form data
                setFormData({
                    name: data.name,
                    description: data.description || '',
                    promptTemplate: data.promptTemplate,
                    modelProvider: data.modelProvider,
                    modelName: data.modelName,
                    apiKey: data.apiKey || '',
                    generationsPerInstance: data.generationsPerInstance,
                    rubric: data.rubric || '',
                    tags: data.tags || [],
                    tagInput: '',
                    variables: data.variables.length > 0 
                        ? data.variables.map((v: Variable) => ({ key: v.key, label: v.label, description: v.description || '', required: v.required }))
                        : [{ key: '', label: '', description: '', required: true }],
                    rejectionReasons: data.rejectionReasons.length > 0
                        ? data.rejectionReasons.map((r: RejectionReason) => ({ label: r.label, description: r.description || '' }))
                        : [{ label: '', description: '' }]
                })
            } else {
                toast({
                    title: "Error",
                    description: "Configuration not found",
                    variant: "destructive"
                })
                router.push('/admin/configs')
            }
        } catch (error) {
            console.error('Error fetching configuration:', error)
            toast({
                title: "Error",
                description: "Failed to load configuration",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [params.id, router, toast])

    useEffect(() => {
        if (session?.user?.tenantId) {
            fetchConfig()
        }
    }, [session, fetchConfig])

    // Fetch instances separately for refresh
    const fetchInstances = async () => {
        try {
            const res = await fetch(`/api/configs/${params.id}/instances`)
            if (res.ok) {
                const data = await res.json()
                setInstances(data)
            }
        } catch (error) {
            console.error('Error fetching instances:', error)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const response = await fetch(`/api/configs/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    promptTemplate: formData.promptTemplate,
                    modelProvider: formData.modelProvider,
                    modelName: formData.modelName,
                    apiKey: formData.apiKey,
                    generationsPerInstance: formData.generationsPerInstance,
                    rubric: formData.rubric,
                    tags: formData.tags,
                    variables: formData.variables.filter(v => v.key && v.label),
                    rejectionReasons: formData.rejectionReasons.filter(r => r.label)
                })
            })

            if (response.ok) {
                await fetchConfig()
                setIsEditing(false)
                toast({
                    title: "Success",
                    description: "Configuration saved successfully"
                })
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to save configuration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error saving configuration:', error)
            toast({
                title: "Error",
                description: "Failed to save configuration",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleJsonInputChange = (value: string) => {
        setJsonInput(value)
        setJsonError(null)
        setDataPreview([])
        setDataHeaders([])

        if (!value.trim()) return

        try {
            const data = JSON.parse(value)
            if (!Array.isArray(data)) {
                setJsonError('JSON must be an array of objects')
                return
            }
            if (data.length === 0) {
                setJsonError('JSON array is empty')
                return
            }
            
            // Get headers from first object
            const headers = Object.keys(data[0])
            setDataHeaders(headers)
            
            // Preview first 5 items
            const preview = data.slice(0, 5).map((item: Record<string, unknown>) => {
                const row: Record<string, string> = {}
                headers.forEach(key => {
                    const value = item[key]
                    row[key] = typeof value === 'string' ? value : JSON.stringify(value)
                })
                return row
            })
            setDataPreview(preview)
        } catch {
            setJsonError('Invalid JSON format')
        }
    }

    const handleUploadData = async () => {
        if (!jsonInput.trim()) return

        setUploading(true)
        try {
            const data = JSON.parse(jsonInput)
            if (!Array.isArray(data) || data.length === 0) {
                toast({
                    title: "Error",
                    description: "JSON must be a non-empty array",
                    variant: "destructive"
                })
                setUploading(false)
                return
            }

            const instances = data.map((item: Record<string, unknown>) => {
                const row: Record<string, string> = {}
                Object.keys(item).forEach(key => {
                    const value = item[key]
                    row[key] = typeof value === 'string' ? value : JSON.stringify(value)
                })
                return row
            })

            const response = await fetch(`/api/configs/${params.id}/instances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvData: instances })
            })

            if (response.ok) {
                const result = await response.json()
                toast({
                    title: "Success",
                    description: `Created ${result.created} instances${result.errors?.length > 0 ? ` (${result.errors.length} errors)` : ''}`
                })
                setIsUploadDialogOpen(false)
                setJsonInput('')
                setDataPreview([])
                setDataHeaders([])
                fetchInstances()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to create instances",
                    variant: "destructive"
                })
            }
        } catch {
            toast({
                title: "Error",
                description: "Invalid JSON format",
                variant: "destructive"
            })
        }
        setUploading(false)
    }

    const handleExecute = async () => {
        if (!config) return

        if (instances.length === 0) {
            toast({
                title: "Error",
                description: "No instances to process. Upload instances first.",
                variant: "destructive"
            })
            return
        }

        setExecuting(true)
        try {
            const response = await fetch(`/api/configs/${params.id}/execute`, {
                method: 'POST'
            })

            if (response.ok) {
                const result = await response.json()
                toast({
                    title: "Success",
                    description: `Generation run started. Processing ${result.totalInstances} instances.`
                })
                fetchConfig()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to start generation",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error executing configuration:', error)
            toast({
                title: "Error",
                description: "Failed to start generation",
                variant: "destructive"
            })
        } finally {
            setExecuting(false)
        }
    }

    const handleResetConfig = async (mode: 'soft' | 'hard' = 'soft') => {
        const message = mode === 'soft' 
            ? 'Reset configuration? This will cancel any running jobs and reset instance statuses to PENDING.'
            : 'HARD RESET: This will delete ALL completions, ratings, and runs. Are you sure?'
        
        if (!confirm(message)) return

        try {
            const response = await fetch(`/api/configs/${params.id}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            })

            const result = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: result.message
                })
                console.log('[Reset Result]', result.results)
                fetchConfig()
                fetchInstances()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to reset configuration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error resetting configuration:', error)
            toast({
                title: "Error",
                description: "Failed to reset configuration",
                variant: "destructive"
            })
        }
    }

    // Force complete configuration - create rating matches for ready instances
    const handleForceComplete = async () => {
        const message = 'Force Complete: This will mark stuck instances as ready (if they have 2+ completions), complete the configuration, and create rating matches. Continue?'
        
        if (!confirm(message)) return

        try {
            const response = await fetch(`/api/configs/${params.id}/force-complete`, {
                method: 'POST'
            })

            const result = await response.json()

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `Configuration completed! ${result.instancesMarkedReady} instances ready, ${result.ratingMatchesCreated} rating matches created.`
                })
                if (result.instancesSkipped > 0) {
                    toast({
                        title: "Note",
                        description: `${result.instancesSkipped} instance(s) skipped (not enough completions)`,
                        variant: "default"
                    })
                }
                fetchConfig()
                fetchInstances()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to force complete",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error force completing:', error)
            toast({
                title: "Error",
                description: "Failed to force complete configuration",
                variant: "destructive"
            })
        }
    }

    // Fetch completions for selected instance
    const fetchCompletions = async (instanceId: string) => {
        setLoadingCompletions(true)
        try {
            const response = await fetch(`/api/instances/${instanceId}/completions`)
            if (response.ok) {
                const data = await response.json()
                setCompletions(data.completions)
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch completions",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error fetching completions:', error)
        } finally {
            setLoadingCompletions(false)
        }
    }

    // Handle viewing an instance's completions
    const handleViewInstance = (instance: Instance) => {
        setSelectedInstance(instance)
        fetchCompletions(instance.id)
    }

    // Handle deleting a single instance
    const handleDeleteInstance = async (instanceId: string) => {
        if (!confirm('Are you sure you want to delete this instance? This will also delete its completions and ratings.')) {
            return
        }

        try {
            const response = await fetch(`/api/instances/${instanceId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Instance deleted successfully"
                })
                fetchInstances()
                fetchConfig()
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to delete instance",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error deleting instance:', error)
            toast({
                title: "Error",
                description: "Failed to delete instance",
                variant: "destructive"
            })
        }
    }

    // Fetch ratings for the configuration
    const fetchRatings = async () => {
        setLoadingRatings(true)
        try {
            const response = await fetch(`/api/configs/${params.id}/ratings`)
            if (response.ok) {
                const data = await response.json()
                setRatings(data.matches)
                setRatingSummary(data.summary)
            }
        } catch (error) {
            console.error('Error fetching ratings:', error)
        } finally {
            setLoadingRatings(false)
        }
    }

    const handleDeleteInstances = async () => {
        if (!confirm('Are you sure you want to delete all instances? This cannot be undone.')) return

        try {
            const response = await fetch(`/api/configs/${params.id}/instances`, {
                method: 'DELETE'
            })

            if (response.ok) {
                const result = await response.json()
                toast({
                    title: "Success",
                    description: `Deleted ${result.deleted} instances`
                })
                setInstances([])
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to delete instances",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error deleting instances:', error)
            toast({
                title: "Error",
                description: "Failed to delete instances",
                variant: "destructive"
            })
        }
    }

    const addVariable = () => {
        setFormData({
            ...formData,
            variables: [...formData.variables, { key: '', label: '', description: '', required: true }]
        })
    }

    const removeVariable = (index: number) => {
        setFormData({
            ...formData,
            variables: formData.variables.filter((_, i) => i !== index)
        })
    }

    const addRejectionReason = () => {
        setFormData({
            ...formData,
            rejectionReasons: [...formData.rejectionReasons, { label: '', description: '' }]
        })
    }

    const removeRejectionReason = (index: number) => {
        setFormData({
            ...formData,
            rejectionReasons: formData.rejectionReasons.filter((_, i) => i !== index)
        })
    }

    const addTag = () => {
        const tag = formData.tagInput.trim()
        if (tag && !formData.tags.includes(tag)) {
            setFormData({
                ...formData,
                tags: [...formData.tags, tag],
                tagInput: ''
            })
        }
    }

    const removeTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        })
    }

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500'
            case 'READY': return 'bg-blue-500'
            case 'EXECUTING': case 'RUNNING': return 'bg-yellow-500'
            case 'COMPLETED': return 'bg-green-500'
            case 'FAILED': return 'bg-red-500'
            case 'QUEUED': return 'bg-purple-500'
            default: return 'bg-gray-500'
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p>Configuration not found</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/admin/configs')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{config.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(config.status)}>{config.status}</Badge>
                            <span className="text-muted-foreground">
                                {config.modelProvider} / {config.modelName}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                            <Button 
                                variant="outline"
                                onClick={() => window.open(`/api/exports/${params.id}?format=json`, '_blank')}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button 
                                onClick={handleExecute} 
                                disabled={executing || config.status === 'EXECUTING'}
                            >
                                {executing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Play className="mr-2 h-4 w-4" />
                                Execute
                            </Button>
                        </>
                    )}
                    {/* Reset options - always visible for fixing stuck states */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleForceComplete}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Force Complete
                                <span className="ml-2 text-xs text-muted-foreground">
                                    (create ratings now)
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleResetConfig('soft')}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Soft Reset
                                <span className="ml-2 text-xs text-muted-foreground">
                                    (reset statuses only)
                                </span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => handleResetConfig('hard')}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hard Reset
                                <span className="ml-2 text-xs text-muted-foreground">
                                    (delete all data)
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Tabs defaultValue="details" onValueChange={(value) => {
                if (value === 'instances') {
                    fetchInstances()
                } else if (value === 'ratings') {
                    fetchRatings()
                }
            }}>
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="instances">
                        Instances ({instances.length})
                    </TabsTrigger>
                    <TabsTrigger value="runs">
                        Generation Runs ({config.generationRuns?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="ratings">
                        Ratings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                    {isEditing ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Edit Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Generations per Instance</Label>
                                        <Input
                                            type="number"
                                            min={2}
                                            max={10}
                                            value={formData.generationsPerInstance}
                                            onChange={(e) => setFormData({ ...formData, generationsPerInstance: parseInt(e.target.value) || 2 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Model Provider</Label>
                                        <Select
                                            value={formData.modelProvider}
                                            onValueChange={(value) => setFormData({ ...formData, modelProvider: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="OPENAI">OpenAI</SelectItem>
                                                <SelectItem value="GEMINI">Gemini</SelectItem>
                                                <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Model Name</Label>
                                        <Input
                                            value={formData.modelName}
                                            onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>API Key (optional - uses env var if not set)</Label>
                                    <Input
                                        type="password"
                                        value={formData.apiKey}
                                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                        placeholder="Leave empty to use environment variable"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Prompt Template</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Use {"{{variable_name}}"} syntax for variables
                                    </p>
                                    <MarkdownEditor
                                        value={formData.promptTemplate}
                                        onChange={(value) => setFormData({ ...formData, promptTemplate: value })}
                                        height={400}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Variables</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                                            <Plus className="h-3 w-3 mr-1" /> Add
                                        </Button>
                                    </div>
                                    {formData.variables.map((variable, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Key"
                                                value={variable.key}
                                                onChange={(e) => {
                                                    const newVars = [...formData.variables]
                                                    newVars[index].key = e.target.value
                                                    setFormData({ ...formData, variables: newVars })
                                                }}
                                            />
                                            <Input
                                                placeholder="Label"
                                                value={variable.label}
                                                onChange={(e) => {
                                                    const newVars = [...formData.variables]
                                                    newVars[index].label = e.target.value
                                                    setFormData({ ...formData, variables: newVars })
                                                }}
                                            />
                                            {formData.variables.length > 1 && (
                                                <Button variant="ghost" size="sm" onClick={() => removeVariable(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label>Rating Rubric</Label>
                                    <MarkdownEditor
                                        value={formData.rubric}
                                        onChange={(value) => setFormData({ ...formData, rubric: value })}
                                        height={300}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Rejection Reasons</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addRejectionReason}>
                                            <Plus className="h-3 w-3 mr-1" /> Add
                                        </Button>
                                    </div>
                                    {formData.rejectionReasons.map((reason, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Reason label"
                                                value={reason.label}
                                                onChange={(e) => {
                                                    const newReasons = [...formData.rejectionReasons]
                                                    newReasons[index].label = e.target.value
                                                    setFormData({ ...formData, rejectionReasons: newReasons })
                                                }}
                                            />
                                            {formData.rejectionReasons.length > 1 && (
                                                <Button variant="ghost" size="sm" onClick={() => removeRejectionReason(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label>Tags</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Type a tag and press Enter"
                                            value={formData.tagInput}
                                            onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                        <Button type="button" variant="outline" onClick={addTag}>
                                            Add
                                        </Button>
                                    </div>
                                    {formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.tags.map(tag => (
                                                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Configuration Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {config.description && (
                                        <div>
                                            <Label className="text-muted-foreground">Description</Label>
                                            <p>{config.description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">Model</Label>
                                            <p>{config.modelProvider} / {config.modelName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Generations/Instance</Label>
                                            <p>{config.generationsPerInstance}</p>
                                        </div>
                                    </div>
                                    {config.tags.length > 0 && (
                                        <div>
                                            <Label className="text-muted-foreground">Tags</Label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {config.tags.map(tag => (
                                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Prompt Template</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/50 p-4 rounded-md overflow-auto max-h-[400px]">
                                        <MarkdownPreview content={config.promptTemplate} />
                                    </div>
                                </CardContent>
                            </Card>

                            {config.variables.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Variables</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {config.variables.map(variable => (
                                                <div key={variable.id} className="flex items-center gap-2">
                                                    <code className="bg-muted px-2 py-1 rounded text-sm">
                                                        {`{{${variable.key}}}`}
                                                    </code>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span>{variable.label}</span>
                                                    {variable.required && <Badge variant="outline">Required</Badge>}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {config.rubric && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Rating Rubric</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <MarkdownPreview content={config.rubric} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {config.rejectionReasons.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Rejection Reasons</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc list-inside space-y-1">
                                            {config.rejectionReasons.map(reason => (
                                                <li key={reason.id}>{reason.label}</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="instances" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Instances</h3>
                            <p className="text-muted-foreground">{instances.length} instance{instances.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={fetchInstances}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                            {instances.length > 0 && (
                                <Button variant="outline" onClick={handleDeleteInstances}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete All
                                </Button>
                            )}
                            <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
                                setIsUploadDialogOpen(open)
                                if (!open) {
                                    setJsonInput('')
                                    setDataPreview([])
                                    setDataHeaders([])
                                    setJsonError(null)
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Instances
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add Instances</DialogTitle>
                                        <DialogDescription>
                                            Paste JSON array with keys matching your variables: <code className="bg-muted px-1 rounded">{config.variables.map(v => v.key).join(', ')}</code>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        {/* Example format */}
                                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                            <p className="font-medium mb-2">Example format:</p>
                                            <pre className="bg-background p-2 rounded text-xs overflow-auto">{`[
  {
    ${config.variables.map(v => `"${v.key}": "value here"`).join(',\n    ')}
  },
  {
    ${config.variables.map(v => `"${v.key}": "another value"`).join(',\n    ')}
  }
]`}</pre>
                                            <p className="mt-2 text-xs">💡 Supports markdown in values. Use <code>\n</code> for line breaks.</p>
                                        </div>

                                        {/* JSON textarea */}
                                        <div className="space-y-2">
                                            <Label>Paste JSON here</Label>
                                            <Textarea
                                                value={jsonInput}
                                                onChange={(e) => handleJsonInputChange(e.target.value)}
                                                placeholder={`[\n  {\n    ${config.variables.map(v => `"${v.key}": "..."`).join(',\n    ')}\n  }\n]`}
                                                className="font-mono text-sm min-h-[200px]"
                                            />
                                        </div>

                                        {/* JSON error */}
                                        {jsonError && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>Invalid JSON</AlertTitle>
                                                <AlertDescription>{jsonError}</AlertDescription>
                                            </Alert>
                                        )}
                                        
                                        {/* Data preview */}
                                        {dataPreview.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    Valid JSON - Preview (first 5 rows)
                                                </Label>
                                                <div className="border rounded-md overflow-auto max-h-[250px]">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                {dataHeaders.map(header => (
                                                                    <TableHead key={header}>{header}</TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {dataPreview.map((row, i) => (
                                                                <TableRow key={i}>
                                                                    {dataHeaders.map(header => (
                                                                        <TableCell key={header} className="max-w-[250px]">
                                                                            <div className="whitespace-pre-wrap text-xs max-h-[80px] overflow-auto">
                                                                                {row[header]}
                                                                            </div>
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleUploadData} disabled={!jsonInput.trim() || uploading || !!jsonError}>
                                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Instances
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {instances.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No instances</AlertTitle>
                            <AlertDescription>
                                Click "Add Instances" and paste your JSON data to get started.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {config.variables.map(v => (
                                                <TableHead key={v.key}>{v.label}</TableHead>
                                            ))}
                                            <TableHead>Status</TableHead>
                                            <TableHead>Completions</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {instances.slice(0, 50).map(instance => (
                                            <TableRow key={instance.id}>
                                                {config.variables.map(v => (
                                                    <TableCell key={v.key} className="max-w-[200px] truncate">
                                                        {instance.data[v.key] || '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell>
                                                    <Badge className={getStatusColor(instance.status)}>
                                                        {instance.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{instance._count?.completions || 0}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewInstance(instance)}
                                                            disabled={!instance._count?.completions}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteInstance(instance.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {instances.length > 50 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Showing 50 of {instances.length} instances
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="runs" className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Generation Runs</h3>
                        <p className="text-muted-foreground">History of generation executions</p>
                    </div>

                    {config.generationRuns?.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No generation runs</AlertTitle>
                            <AlertDescription>
                                Execute the configuration to start generating completions.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead>Progress</TableHead>
                                            <TableHead>Started</TableHead>
                                            <TableHead>Completed</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {config.generationRuns?.map(run => (
                                            <TableRow key={run.id}>
                                                <TableCell>
                                                    <Badge className={getStatusColor(run.status)}>
                                                        {run.status}
                                                    </Badge>
                                                    {run.errorMessage && (
                                                        <p className="text-xs text-red-500 mt-1">{run.errorMessage}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>{run.provider} / {run.modelName}</TableCell>
                                                <TableCell>
                                                    {run.processedCount} / {run.totalInstances}
                                                </TableCell>
                                                <TableCell>
                                                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {run.completedAt ? new Date(run.completedAt).toLocaleString() : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="ratings" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Rating Activity</h3>
                            <p className="text-muted-foreground">
                                {ratingSummary && (
                                    <span>
                                        {ratingSummary.completedMatches} of {ratingSummary.totalMatches} matches completed • {ratingSummary.totalResponses} total responses
                                    </span>
                                )}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchRatings}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>

                    {loadingRatings ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : ratings.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No ratings yet</AlertTitle>
                            <AlertDescription>
                                Rating activity will appear here once users start rating completions.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Instance</TableHead>
                                            <TableHead>Match</TableHead>
                                            <TableHead>Rated By</TableHead>
                                            <TableHead>Outcome</TableHead>
                                            <TableHead>Winner</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ratings.flatMap(match => 
                                            match.responses.length > 0 
                                                ? match.responses.map(response => (
                                                    <TableRow key={response.id}>
                                                        <TableCell className="max-w-[150px]">
                                                            <div className="text-xs">
                                                                {config?.variables.slice(0, 1).map(v => (
                                                                    <span key={v.key} className="truncate block">
                                                                        {(match.promptInstance.data as Record<string, string>)[v.key]?.substring(0, 30) || '-'}
                                                                        {((match.promptInstance.data as Record<string, string>)[v.key]?.length || 0) > 30 ? '...' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                R{match.round}: #{match.optionA.index + 1} vs #{match.optionB.index + 1}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{response.user.name || response.user.email}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                response.outcome === 'A_BETTER' ? 'bg-blue-500/20 text-blue-600' :
                                                                response.outcome === 'B_BETTER' ? 'bg-green-500/20 text-green-600' :
                                                                response.outcome === 'BOTH_GOOD' ? 'bg-purple-500/20 text-purple-600' :
                                                                'bg-red-500/20 text-red-600'
                                                            }>
                                                                {response.outcome === 'A_BETTER' ? 'A Better' :
                                                                 response.outcome === 'B_BETTER' ? 'B Better' :
                                                                 response.outcome === 'BOTH_GOOD' ? 'Both Good' : 'Neither Good'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {match.winner ? (
                                                                <span className="text-sm font-medium">
                                                                    Response #{match.winner.index + 1}
                                                                </span>
                                                            ) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {new Date(response.createdAt).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                                : [(
                                                    <TableRow key={match.id}>
                                                        <TableCell className="max-w-[150px]">
                                                            <div className="text-xs">
                                                                {config?.variables.slice(0, 1).map(v => (
                                                                    <span key={v.key} className="truncate block">
                                                                        {(match.promptInstance.data as Record<string, string>)[v.key]?.substring(0, 30) || '-'}
                                                                        {((match.promptInstance.data as Record<string, string>)[v.key]?.length || 0) > 30 ? '...' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                R{match.round}: #{match.optionA.index + 1} vs #{match.optionB.index + 1}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell colSpan={4} className="text-muted-foreground text-sm">
                                                            Pending - not yet rated
                                                        </TableCell>
                                                    </TableRow>
                                                )]
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Completions Modal */}
            <Dialog open={!!selectedInstance} onOpenChange={(open) => !open && setSelectedInstance(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Instance Completions</DialogTitle>
                        <DialogDescription>
                            {selectedInstance && (
                                <div className="mt-2 p-3 bg-muted rounded-md">
                                    <p className="font-medium mb-1">Instance Data:</p>
                                    {config?.variables.map(v => (
                                        <p key={v.key} className="text-sm">
                                            <span className="font-medium">{v.label}:</span>{' '}
                                            <span className="text-muted-foreground">
                                                {selectedInstance.data[v.key] || '-'}
                                            </span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {loadingCompletions ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : completions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No completions found for this instance.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {completions.map((completion, index) => (
                                <Card key={completion.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">
                                                Completion #{index + 1}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Badge variant="outline">
                                                    {completion.provider} / {completion.modelName}
                                                </Badge>
                                                {completion.tokensUsed && (
                                                    <span>{completion.tokensUsed} tokens</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm font-mono max-h-[300px] overflow-y-auto">
                                            {completion.output}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
