import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// DELETE - Delete a single instance
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ instanceId: string }> }
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

        const { instanceId } = await params

        // Get instance with its configuration
        const instance = await prisma.promptInstance.findFirst({
            where: { id: instanceId },
            include: {
                configuration: {
                    select: { id: true, tenantId: true }
                }
            }
        })

        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        // Verify tenant ownership
        if (instance.configuration.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete the instance (cascades to completions, rating matches, etc.)
        await prisma.promptInstance.delete({
            where: { id: instanceId }
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Instance deleted successfully',
            configurationId: instance.configurationId
        })
    } catch (error) {
        console.error('Error deleting instance:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// GET - Get a single instance with details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ instanceId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { instanceId } = await params

        const instance = await prisma.promptInstance.findFirst({
            where: { id: instanceId },
            include: {
                configuration: {
                    select: { id: true, tenantId: true, name: true }
                },
                completions: {
                    orderBy: { index: 'asc' }
                },
                _count: {
                    select: {
                        completions: true,
                        ratingMatches: true
                    }
                }
            }
        })

        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        // Verify tenant access
        if (instance.configuration.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json(instance)
    } catch (error) {
        console.error('Error fetching instance:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
