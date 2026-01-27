import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, GenerationRunStatus, PromptInstanceStatus, ConfigurationStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET single run details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ runId: string }> }
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

        const { runId } = await params

        const run = await prisma.generationRun.findFirst({
            where: {
                id: runId,
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
                },
                completions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        // Get instance breakdown
        const instanceStats = await prisma.promptInstance.groupBy({
            by: ['status'],
            where: { configurationId: run.configurationId },
            _count: true
        })

        return NextResponse.json({
            ...run,
            instanceStats: Object.fromEntries(
                instanceStats.map(s => [s.status, s._count])
            )
        })
    } catch (error) {
        console.error('Error fetching run:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH - cancel a run
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ runId: string }> }
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

        const { runId } = await params
        const body = await request.json()
        const { action } = body

        // Verify run belongs to tenant
        const run = await prisma.generationRun.findFirst({
            where: {
                id: runId,
                configuration: {
                    tenantId: session.user.tenantId
                }
            }
        })

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        if (action === 'cancel') {
            // Cancel the run
            await prisma.generationRun.update({
                where: { id: runId },
                data: {
                    status: GenerationRunStatus.FAILED,
                    completedAt: new Date()
                }
            })

            // Reset any GENERATING instances back to PENDING
            await prisma.promptInstance.updateMany({
                where: {
                    configurationId: run.configurationId,
                    status: PromptInstanceStatus.GENERATING
                },
                data: { status: PromptInstanceStatus.PENDING }
            })

            // Reset configuration status
            await prisma.configuration.update({
                where: { id: run.configurationId },
                data: { status: ConfigurationStatus.DRAFT }
            })

            return NextResponse.json({ message: 'Run cancelled' })
        }

        if (action === 'retry') {
            // Retry a failed run by setting it back to QUEUED
            await prisma.generationRun.update({
                where: { id: runId },
                data: {
                    status: GenerationRunStatus.QUEUED,
                    startedAt: null,
                    completedAt: null
                }
            })

            // Reset configuration status
            await prisma.configuration.update({
                where: { id: run.configurationId },
                data: { status: ConfigurationStatus.EXECUTING }
            })

            return NextResponse.json({ message: 'Run queued for retry' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Error updating run:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE - delete a run and its completions
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ runId: string }> }
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

        const { runId } = await params

        // Verify run belongs to tenant
        const run = await prisma.generationRun.findFirst({
            where: {
                id: runId,
                configuration: {
                    tenantId: session.user.tenantId
                }
            }
        })

        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        // Delete completions first (due to FK constraint)
        await prisma.completion.deleteMany({
            where: { generationRunId: runId }
        })

        // Delete the run
        await prisma.generationRun.delete({
            where: { id: runId }
        })

        // If no more runs, reset config status
        const remainingRuns = await prisma.generationRun.count({
            where: { configurationId: run.configurationId }
        })

        if (remainingRuns === 0) {
            await prisma.configuration.update({
                where: { id: run.configurationId },
                data: { status: ConfigurationStatus.DRAFT }
            })
        }

        return NextResponse.json({ message: 'Run deleted' })
    } catch (error) {
        console.error('Error deleting run:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
