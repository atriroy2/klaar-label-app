import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET - Export configuration results
export async function GET(
    request: Request,
    { params }: { params: Promise<{ configId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isAdmin = session.user.role === Role.TENANT_ADMIN || 
            (session.user.role === Role.SUPER_ADMIN && session.user.tenantId)
        
        if (!isAdmin || !session.user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { configId } = await params
        const url = new URL(request.url)
        const format = url.searchParams.get('format') || 'json'

        // Get configuration with all related data
        const config = await prisma.configuration.findFirst({
            where: { 
                id: configId,
                tenantId: session.user.tenantId
            },
            include: {
                variables: true
            }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        // Get all instances with completions, matches, and final winners
        const instances = await prisma.promptInstance.findMany({
            where: { configurationId: configId },
            include: {
                completions: {
                    orderBy: { index: 'asc' }
                },
                ratingMatches: {
                    include: {
                        optionA: true,
                        optionB: true,
                        winner: true,
                        responses: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        }
                    },
                    orderBy: { round: 'asc' }
                },
                finalWinner: {
                    include: {
                        winningCompletion: true
                    }
                }
            }
        })

        // Build export data
        const exportData = {
            configuration: {
                id: config.id,
                name: config.name,
                description: config.description,
                promptTemplate: config.promptTemplate,
                modelProvider: config.modelProvider,
                modelName: config.modelName,
                generationsPerInstance: config.generationsPerInstance,
                status: config.status,
                tags: config.tags,
                variables: config.variables.map(v => ({
                    key: v.key,
                    label: v.label
                })),
                createdAt: config.createdAt.toISOString()
            },
            instances: instances.map(instance => ({
                id: instance.id,
                data: instance.data,
                status: instance.status,
                completions: instance.completions.map(c => ({
                    id: c.id,
                    index: c.index,
                    output: c.output,
                    provider: c.provider,
                    modelName: c.modelName,
                    tokensUsed: c.tokensUsed
                })),
                ratingMatches: instance.ratingMatches.map(m => ({
                    id: m.id,
                    round: m.round,
                    optionA: {
                        id: m.optionA.id,
                        index: m.optionA.index,
                        outputPreview: m.optionA.output.substring(0, 200) + (m.optionA.output.length > 200 ? '...' : '')
                    },
                    optionB: {
                        id: m.optionB.id,
                        index: m.optionB.index,
                        outputPreview: m.optionB.output.substring(0, 200) + (m.optionB.output.length > 200 ? '...' : '')
                    },
                    outcome: m.outcome,
                    winner: m.winner ? {
                        id: m.winner.id,
                        index: m.winner.index
                    } : null,
                    isComplete: m.isComplete,
                    responses: m.responses.map(r => ({
                        userId: r.user.id,
                        userName: r.user.name,
                        userEmail: r.user.email,
                        outcome: r.outcome,
                        reasons: r.reasons,
                        notes: r.notes,
                        createdAt: r.createdAt.toISOString()
                    }))
                })),
                finalWinner: instance.finalWinner ? {
                    completionId: instance.finalWinner.winningCompletionId,
                    completionIndex: instance.finalWinner.winningCompletion.index,
                    outputPreview: instance.finalWinner.winningCompletion.output.substring(0, 200) + 
                        (instance.finalWinner.winningCompletion.output.length > 200 ? '...' : ''),
                    determinedAt: instance.finalWinner.determinedAt.toISOString()
                } : null
            })),
            exportedAt: new Date().toISOString(),
            totalInstances: instances.length,
            totalCompletions: instances.reduce((acc, i) => acc + i.completions.length, 0),
            totalMatches: instances.reduce((acc, i) => acc + i.ratingMatches.length, 0),
            completedMatches: instances.reduce((acc, i) => acc + i.ratingMatches.filter(m => m.isComplete).length, 0)
        }

        if (format === 'csv') {
            // Convert to CSV format
            const csvRows: string[] = []
            
            // Header
            const variableHeaders = config.variables.map(v => v.key)
            const headers = [
                'instance_id',
                ...variableHeaders,
                'instance_status',
                'completion_count',
                'match_count',
                'final_winner_index',
                'final_winner_output_preview'
            ]
            csvRows.push(headers.join(','))

            // Data rows
            for (const instance of exportData.instances) {
                const instanceData = instance.data as Record<string, string>
                const row = [
                    instance.id,
                    ...variableHeaders.map(h => `"${(instanceData[h] || '').replace(/"/g, '""')}"`),
                    instance.status,
                    instance.completions.length.toString(),
                    instance.ratingMatches.length.toString(),
                    instance.finalWinner?.completionIndex?.toString() || '',
                    instance.finalWinner ? `"${instance.finalWinner.outputPreview.replace(/"/g, '""')}"` : ''
                ]
                csvRows.push(row.join(','))
            }

            const csv = csvRows.join('\n')

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv"`
                }
            })
        }

        // JSON format (default)
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${config.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`
            }
        })

    } catch (error) {
        console.error('Error exporting configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
