import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, PromptInstanceStatus, ConfigurationStatus, GenerationRunStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// POST - Reset a configuration (clear completions, reset instances, cancel runs)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params
        const body = await request.json().catch(() => ({}))
        const { mode = 'soft' } = body // 'soft' = reset statuses only, 'hard' = also delete completions

        // Verify configuration belongs to tenant
        const config = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const results: Record<string, number | boolean> = {}

        // Cancel any queued or running generation runs
        const cancelledRuns = await prisma.generationRun.updateMany({
            where: {
                configurationId: id,
                status: { in: [GenerationRunStatus.QUEUED, GenerationRunStatus.RUNNING] }
            },
            data: {
                status: GenerationRunStatus.FAILED,
                completedAt: new Date()
            }
        })
        results.cancelledRuns = cancelledRuns.count

        // Reset all instances to PENDING
        const resetInstances = await prisma.promptInstance.updateMany({
            where: {
                configurationId: id,
                status: { not: PromptInstanceStatus.PENDING }
            },
            data: { status: PromptInstanceStatus.PENDING }
        })
        results.resetInstances = resetInstances.count

        // Reset configuration status to DRAFT
        await prisma.configuration.update({
            where: { id },
            data: { status: ConfigurationStatus.DRAFT }
        })
        results.configReset = true

        if (mode === 'hard') {
            // Delete all completions
            const deletedCompletions = await prisma.completion.deleteMany({
                where: {
                    promptInstance: { configurationId: id }
                }
            })
            results.deletedCompletions = deletedCompletions.count

            // Delete all rating matches
            const deletedMatches = await prisma.ratingMatch.deleteMany({
                where: { configurationId: id }
            })
            results.deletedMatches = deletedMatches.count

            // Delete all final winners
            const deletedWinners = await prisma.finalWinner.deleteMany({
                where: {
                    promptInstance: { configurationId: id }
                }
            })
            results.deletedWinners = deletedWinners.count

            // Delete all generation runs
            const deletedRuns = await prisma.generationRun.deleteMany({
                where: { configurationId: id }
            })
            results.deletedRuns = deletedRuns.count
        }

        console.log(`[RESET] Configuration ${id} reset with mode=${mode}:`, results)

        return NextResponse.json({
            message: `Configuration reset (${mode} mode)`,
            results
        })
    } catch (error) {
        console.error('Error resetting configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
