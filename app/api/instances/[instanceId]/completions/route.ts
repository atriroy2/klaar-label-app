import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET completions for an instance
export async function GET(
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

        // Verify instance belongs to tenant's configuration
        const instance = await prisma.promptInstance.findFirst({
            where: {
                id: instanceId,
                configuration: {
                    tenantId: session.user.tenantId
                }
            },
            include: {
                completions: {
                    orderBy: { index: 'asc' }
                },
                configuration: {
                    select: {
                        name: true,
                        promptTemplate: true
                    }
                }
            }
        })

        if (!instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
        }

        return NextResponse.json({
            instance: {
                id: instance.id,
                data: instance.data,
                status: instance.status
            },
            completions: instance.completions,
            configuration: instance.configuration
        })
    } catch (error) {
        console.error('Error fetching completions:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
