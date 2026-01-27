import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET ratings for a configuration
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

        // Verify configuration belongs to tenant
        const config = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: { variables: true }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        // Get all rating matches with responses
        const matches = await prisma.ratingMatch.findMany({
            where: { configurationId: id },
            include: {
                promptInstance: true,
                optionA: true,
                optionB: true,
                winner: true,
                responses: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Calculate summary
        const summary = {
            totalMatches: matches.length,
            completedMatches: matches.filter(m => m.isComplete).length,
            pendingMatches: matches.filter(m => !m.isComplete).length,
            totalResponses: matches.reduce((sum, m) => sum + m.responses.length, 0)
        }

        return NextResponse.json({
            matches,
            summary,
            variables: config.variables
        })
    } catch (error) {
        console.error('Error fetching ratings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
