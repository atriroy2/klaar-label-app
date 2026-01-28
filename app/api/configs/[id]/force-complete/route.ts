import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, ConfigurationStatus, GenerationRunStatus, PromptInstanceStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// POST - Force complete a configuration
// This will:
// 1. Mark stuck instances (GENERATING with enough completions) as READY_FOR_RATING
// 2. Skip instances without enough completions
// 3. Mark the configuration as COMPLETED
// 4. Create rating matches for ready instances
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

        // Verify configuration belongs to tenant
        const config = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const results = {
            instancesMarkedReady: 0,
            instancesSkipped: 0,
            ratingMatchesCreated: 0,
            errors: [] as string[]
        }

        // Get all instances that are stuck (PENDING or GENERATING)
        const stuckInstances = await prisma.promptInstance.findMany({
            where: {
                configurationId: id,
                status: { in: [PromptInstanceStatus.PENDING, PromptInstanceStatus.GENERATING] }
            },
            include: {
                completions: true
            }
        })

        // Process stuck instances
        for (const instance of stuckInstances) {
            const completionCount = instance.completions.length
            
            // Need at least 2 completions for rating
            if (completionCount >= 2) {
                await prisma.promptInstance.update({
                    where: { id: instance.id },
                    data: { status: PromptInstanceStatus.READY_FOR_RATING }
                })
                results.instancesMarkedReady++
            } else {
                // Skip this instance - not enough completions
                results.instancesSkipped++
                results.errors.push(
                    `Instance skipped: only ${completionCount} completion(s), needs at least 2`
                )
            }
        }

        // Mark any running generation runs as completed
        await prisma.generationRun.updateMany({
            where: {
                configurationId: id,
                status: { in: [GenerationRunStatus.QUEUED, GenerationRunStatus.RUNNING] }
            },
            data: {
                status: GenerationRunStatus.COMPLETED,
                completedAt: new Date()
            }
        })

        // Mark configuration as completed
        await prisma.configuration.update({
            where: { id },
            data: { status: ConfigurationStatus.COMPLETED }
        })

        // Create rating matches for all ready instances
        const readyInstances = await prisma.promptInstance.findMany({
            where: {
                configurationId: id,
                status: PromptInstanceStatus.READY_FOR_RATING
            },
            include: {
                completions: {
                    orderBy: { index: 'asc' }
                }
            }
        })

        for (const instance of readyInstances) {
            const completions = instance.completions
            
            if (completions.length < 2) continue

            // Check if matches already exist
            const existingMatches = await prisma.ratingMatch.count({
                where: { promptInstanceId: instance.id }
            })

            if (existingMatches > 0) continue // Already has matches

            // Create tournament matches based on number of completions
            if (completions.length === 2) {
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId: id,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
                results.ratingMatchesCreated++
            } else if (completions.length === 3) {
                // A vs B, then winner vs C
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId: id,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
                results.ratingMatchesCreated++
            } else if (completions.length >= 4) {
                // Tournament: A vs B, C vs D, then winners
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId: id,
                        round: 1,
                        optionACompletionId: completions[0].id,
                        optionBCompletionId: completions[1].id
                    }
                })
                await prisma.ratingMatch.create({
                    data: {
                        promptInstanceId: instance.id,
                        configurationId: id,
                        round: 1,
                        optionACompletionId: completions[2].id,
                        optionBCompletionId: completions[3].id
                    }
                })
                results.ratingMatchesCreated += 2
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Configuration force completed',
            ...results
        })
    } catch (error) {
        console.error('Error force completing configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
