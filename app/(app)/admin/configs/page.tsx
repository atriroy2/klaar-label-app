'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, FileText, Edit, Eye } from "lucide-react"

type Configuration = {
    id: string
    name: string
    description: string | null
    promptTemplate: string
    modelProvider: string
    modelName: string
    generationsPerInstance: number
    status: string
    tags: string[]
    createdAt: string
    variables: { id: string; key: string; label: string }[]
    _count?: { instances: number; generationRuns: number }
}

export default function ConfigurationsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [configurations, setConfigurations] = useState<Configuration[]>([])

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

    // Fetch configurations
    useEffect(() => {
        const fetchData = async () => {
            try {
                const configsRes = await fetch('/api/configs')
                
                if (configsRes.ok) {
                    const data = await configsRes.json()
                    setConfigurations(data)
                }
            } catch (error) {
                console.error('Error fetching data:', error)
                toast({
                    title: "Error",
                    description: "Failed to load configurations",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.tenantId) {
            fetchData()
        }
    }, [session, toast])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500'
            case 'READY': return 'bg-blue-500'
            case 'EXECUTING': return 'bg-yellow-500'
            case 'COMPLETED': return 'bg-green-500'
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configurations</h1>
                    <p className="text-muted-foreground">
                        Manage your labeling configurations, prompts, and instances
                    </p>
                </div>
                <Button onClick={() => router.push('/admin/configs/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Configuration
                </Button>
            </div>

            {configurations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No configurations yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Create your first configuration to start generating and labeling data
                        </p>
                        <Button onClick={() => router.push('/admin/configs/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Configuration
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>All Configurations</CardTitle>
                        <CardDescription>
                            {configurations.length} configuration{configurations.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Gen/Instance</TableHead>
                                    <TableHead>Instances</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configurations.map(config => (
                                    <TableRow key={config.id}>
                                        <TableCell className="font-medium">
                                            {config.name}
                                            {config.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {config.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{config.modelProvider}</span>
                                            <p className="text-xs text-muted-foreground">{config.modelName}</p>
                                        </TableCell>
                                        <TableCell>{config.generationsPerInstance}</TableCell>
                                        <TableCell>{config._count?.instances ?? 0}</TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(config.status)}>
                                                {config.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {config.tags.slice(0, 3).map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {config.tags.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{config.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/configs/${config.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/configs/${config.id}?edit=true`)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
