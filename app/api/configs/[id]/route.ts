import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET single configuration
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

        const configuration = await prisma.configuration.findFirst({
            where: { 
                id,
                tenantId: session.user.tenantId 
            },
            include: {
                variables: true,
                rejectionReasons: {
                    orderBy: { sortOrder: 'asc' }
                },
                instances: {
                    take: 100,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: {
                                completions: true,
                                ratingMatches: true
                            }
                        }
                    }
                },
                generationRuns: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: {
                    select: {
                        instances: true,
                        ratingMatches: true
                    }
                }
            }
        })

        if (!configuration) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        return NextResponse.json(configuration)
    } catch (error) {
        console.error('Error fetching configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH update configuration
export async function PATCH(
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
        const body = await request.json()

        // Verify configuration belongs to tenant
        const existing = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const { 
            name, 
            description, 
            promptTemplate, 
            modelProvider, 
            modelName, 
            apiKey,
            generationsPerInstance, 
            rubric,
            status,
            tags,
            variables,
            rejectionReasons
        } = body

        // Build update data
        const updateData: Record<string, unknown> = {}
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (promptTemplate !== undefined) updateData.promptTemplate = promptTemplate
        if (modelProvider !== undefined) updateData.modelProvider = modelProvider
        if (modelName !== undefined) updateData.modelName = modelName
        if (apiKey !== undefined) updateData.apiKey = apiKey
        if (generationsPerInstance !== undefined) updateData.generationsPerInstance = generationsPerInstance
        if (rubric !== undefined) updateData.rubric = rubric
        if (status !== undefined) updateData.status = status
        if (tags !== undefined) updateData.tags = tags

        // Update configuration
        await prisma.configuration.update({
            where: { id },
            data: updateData
        })

        // Update variables if provided
        if (variables !== undefined) {
            // Delete existing and recreate
            await prisma.promptVariable.deleteMany({ where: { configurationId: id } })
            if (variables.length > 0) {
                await prisma.promptVariable.createMany({
                    data: variables.map((v: { key: string; label: string; description?: string; required?: boolean }) => ({
                        configurationId: id,
                        key: v.key,
                        label: v.label,
                        description: v.description,
                        required: v.required ?? true
                    }))
                })
            }
        }

        // Update rejection reasons if provided
        if (rejectionReasons !== undefined) {
            await prisma.rejectionReason.deleteMany({ where: { configurationId: id } })
            if (rejectionReasons.length > 0) {
                await prisma.rejectionReason.createMany({
                    data: rejectionReasons.map((r: { label: string; description?: string }, index: number) => ({
                        configurationId: id,
                        label: r.label,
                        description: r.description,
                        sortOrder: index
                    }))
                })
            }
        }

        // Fetch updated configuration
        const updated = await prisma.configuration.findUnique({
            where: { id },
            include: {
                variables: true,
                rejectionReasons: {
                    orderBy: { sortOrder: 'asc' }
                }
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE configuration
export async function DELETE(
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
        const existing = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        await prisma.configuration.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
