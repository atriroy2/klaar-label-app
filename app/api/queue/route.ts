import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, GenerationRunStatus, PromptInstanceStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET queue status for the tenant
export async function GET() {
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

        // Get all generation runs for this tenant
        const runs = await prisma.generationRun.findMany({
            where: {
                configuration: {
                    tenantId: session.user.tenantId
                }
            },
            include: {
                configuration: {
                    select: {
                        id: true,
                        name: true,
                        generationsPerInstance: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Get instance counts by status for running/queued configs
        const activeConfigIds = runs
            .filter(r => r.status === 'QUEUED' || r.status === 'RUNNING')
            .map(r => r.configurationId)

        const instanceStats = await prisma.promptInstance.groupBy({
            by: ['configurationId', 'status'],
            where: {
                configurationId: { in: activeConfigIds }
            },
            _count: true
        })

        // Format instance stats by config
        const instanceStatsByConfig: Record<string, Record<string, number>> = {}
        for (const stat of instanceStats) {
            if (!instanceStatsByConfig[stat.configurationId]) {
                instanceStatsByConfig[stat.configurationId] = {}
            }
            instanceStatsByConfig[stat.configurationId][stat.status] = stat._count
        }

        // Enhance runs with instance stats
        const enhancedRuns = runs.map(run => ({
            ...run,
            instanceStats: instanceStatsByConfig[run.configurationId] || {},
            totalInstances: run.totalInstances,
            processedCount: run.processedCount,
            progress: run.totalInstances > 0 
                ? Math.round((run.processedCount / run.totalInstances) * 100) 
                : 0
        }))

        // Summary stats
        const summary = {
            queuedRuns: runs.filter(r => r.status === 'QUEUED').length,
            runningRuns: runs.filter(r => r.status === 'RUNNING').length,
            completedRuns: runs.filter(r => r.status === 'COMPLETED').length,
            failedRuns: runs.filter(r => r.status === 'FAILED').length,
            totalPendingInstances: instanceStats
                .filter(s => s.status === 'PENDING')
                .reduce((sum, s) => sum + s._count, 0),
            totalGeneratingInstances: instanceStats
                .filter(s => s.status === 'GENERATING')
                .reduce((sum, s) => sum + s._count, 0)
        }

        return NextResponse.json({
            runs: enhancedRuns,
            summary
        })
    } catch (error) {
        console.error('Error fetching queue:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - trigger worker manually
export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isAdmin = session.user.role === Role.TENANT_ADMIN || 
            (session.user.role === Role.SUPER_ADMIN && session.user.tenantId)
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Trigger the worker
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/worker/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })

        const result = await response.json()
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error triggering worker:', error)
        return NextResponse.json({ error: 'Failed to trigger worker' }, { status: 500 })
    }
}
