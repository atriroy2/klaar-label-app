'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft, Trash2, Plus, X } from "lucide-react"
import MarkdownEditor from "@/components/MarkdownEditor"

export default function NewConfigurationPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [creating, setCreating] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        promptTemplate: '',
        modelProvider: 'OPENAI',
        modelName: 'gpt-4',
        generationsPerInstance: 2,
        rubric: '',
        variables: [{ key: '', label: '' }],
        tags: [] as string[],
        tagInput: '',
        rejectionReasons: [{ label: '' }]
    })

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

    const handleCreate = async () => {
        if (!formData.name || !formData.promptTemplate) {
            toast({
                title: "Error",
                description: "Name and prompt template are required",
                variant: "destructive"
            })
            return
        }

        setCreating(true)
        try {
            const response = await fetch('/api/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description,
                    promptTemplate: formData.promptTemplate,
                    modelProvider: formData.modelProvider,
                    modelName: formData.modelName,
                    generationsPerInstance: formData.generationsPerInstance,
                    rubric: formData.rubric,
                    tags: formData.tags,
                    variables: formData.variables.filter(v => v.key && v.label),
                    rejectionReasons: formData.rejectionReasons.filter(r => r.label)
                })
            })

            if (response.ok) {
                const newConfig = await response.json()
                toast({
                    title: "Success",
                    description: "Configuration created successfully"
                })
                router.push(`/admin/configs/${newConfig.id}`)
            } else {
                const error = await response.json()
                toast({
                    title: "Error",
                    description: error.error || "Failed to create configuration",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error creating configuration:', error)
            toast({
                title: "Error",
                description: "Failed to create configuration",
                variant: "destructive"
            })
        } finally {
            setCreating(false)
        }
    }

    const addVariable = () => {
        setFormData({
            ...formData,
            variables: [...formData.variables, { key: '', label: '' }]
        })
    }

    const removeVariable = (index: number) => {
        setFormData({
            ...formData,
            variables: formData.variables.filter((_, i) => i !== index)
        })
    }

    const updateVariable = (index: number, field: 'key' | 'label', value: string) => {
        const newVariables = [...formData.variables]
        newVariables[index][field] = value
        setFormData({ ...formData, variables: newVariables })
    }

    const addRejectionReason = () => {
        setFormData({
            ...formData,
            rejectionReasons: [...formData.rejectionReasons, { label: '' }]
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

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/admin/configs')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">New Configuration</h1>
                        <p className="text-muted-foreground">
                            Create a new labeling configuration
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreate} disabled={creating}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Configuration
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>
                            Name and description for this configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., OKR Generation"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="generationsPerInstance">Generations per Instance</Label>
                                <Input
                                    id="generationsPerInstance"
                                    type="number"
                                    min={2}
                                    max={10}
                                    value={formData.generationsPerInstance}
                                    onChange={(e) => setFormData({ ...formData, generationsPerInstance: parseInt(e.target.value) || 2 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what this configuration is for..."
                            />
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

                {/* Model Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Model Settings</CardTitle>
                        <CardDescription>
                            Configure the AI model to use for generation
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                <Label htmlFor="modelName">Model Name</Label>
                                <Input
                                    id="modelName"
                                    value={formData.modelName}
                                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                    placeholder="e.g., gpt-4, gemini-pro"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Prompt Template */}
                <Card>
                    <CardHeader>
                        <CardTitle>Prompt Template *</CardTitle>
                        <CardDescription>
                            The prompt that will be sent to the AI. Use {"{{variable_name}}"} syntax for variables.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MarkdownEditor
                            value={formData.promptTemplate}
                            onChange={(value) => setFormData({ ...formData, promptTemplate: value })}
                            placeholder="Write your prompt template here. Use {{variable_name}} for placeholders..."
                            height={400}
                        />
                    </CardContent>
                </Card>

                {/* Variables */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Variables</CardTitle>
                                <CardDescription>
                                    Define variables used in your prompt template
                                </CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                                <Plus className="h-4 w-4 mr-1" /> Add Variable
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {formData.variables.map((variable, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder="Variable key (e.g., role_name)"
                                    value={variable.key}
                                    onChange={(e) => updateVariable(index, 'key', e.target.value)}
                                    className="font-mono"
                                />
                                <Input
                                    placeholder="Display label (e.g., Role Name)"
                                    value={variable.label}
                                    onChange={(e) => updateVariable(index, 'label', e.target.value)}
                                />
                                {formData.variables.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeVariable(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Rating Rubric */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rating Rubric</CardTitle>
                        <CardDescription>
                            Guidelines for users when rating the generated outputs
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MarkdownEditor
                            value={formData.rubric}
                            onChange={(value) => setFormData({ ...formData, rubric: value })}
                            placeholder="Write guidelines for rating responses..."
                            height={300}
                        />
                    </CardContent>
                </Card>

                {/* Rejection Reasons */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Rejection Reasons</CardTitle>
                                <CardDescription>
                                    Options users can select when a response is not good
                                </CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addRejectionReason}>
                                <Plus className="h-4 w-4 mr-1" /> Add Reason
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {formData.rejectionReasons.map((reason, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder="e.g., Too vague, Incorrect format, Off-topic"
                                    value={reason.label}
                                    onChange={(e) => {
                                        const newReasons = [...formData.rejectionReasons]
                                        newReasons[index].label = e.target.value
                                        setFormData({ ...formData, rejectionReasons: newReasons })
                                    }}
                                />
                                {formData.rejectionReasons.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeRejectionReason(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => router.push('/admin/configs')}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating} size="lg">
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Configuration
                    </Button>
                </div>
            </div>
        </div>
    )
}
