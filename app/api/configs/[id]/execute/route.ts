import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, ConfigurationStatus, GenerationRunStatus, PromptInstanceStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

// POST - Start a generation run
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

        // Get configuration with instances
        const config = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: {
                instances: {
                    where: {
                        status: {
                            in: [PromptInstanceStatus.PENDING, PromptInstanceStatus.GENERATING]
                        }
                    }
                }
            }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        // Check if there are any instances to process
        const pendingInstances = await prisma.promptInstance.count({
            where: {
                configurationId: id,
                status: PromptInstanceStatus.PENDING
            }
        })

        if (pendingInstances === 0) {
            return NextResponse.json({ 
                error: 'No pending instances to process. Upload instances or check if they are already processed.' 
            }, { status: 400 })
        }

        // Check for existing running generation
        const runningRun = await prisma.generationRun.findFirst({
            where: {
                configurationId: id,
                status: {
                    in: [GenerationRunStatus.QUEUED, GenerationRunStatus.RUNNING]
                }
            }
        })

        if (runningRun) {
            return NextResponse.json({ 
                error: 'A generation run is already in progress for this configuration' 
            }, { status: 400 })
        }

        // Create generation run
        const generationRun = await prisma.generationRun.create({
            data: {
                configurationId: id,
                provider: config.modelProvider,
                modelName: config.modelName,
                totalInstances: pendingInstances,
                status: GenerationRunStatus.QUEUED
            }
        })

        // Update configuration status
        await prisma.configuration.update({
            where: { id },
            data: { status: ConfigurationStatus.EXECUTING }
        })

        return NextResponse.json({
            success: true,
            runId: generationRun.id,
            totalInstances: pendingInstances,
            message: 'Generation run queued successfully'
        })
    } catch (error) {
        console.error('Error starting generation run:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET - Get status of generation runs
export async function GET(
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

        const runs = await prisma.generationRun.findMany({
            where: {
                configurationId: id,
                configuration: {
                    tenantId: session.user.tenantId
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })

        return NextResponse.json(runs)
    } catch (error) {
        console.error('Error fetching generation runs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
