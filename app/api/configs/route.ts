import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// GET all configurations for the tenant
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user has admin access
        const isAdmin = session.user.role === Role.TENANT_ADMIN || 
            (session.user.role === Role.SUPER_ADMIN && session.user.tenantId)
        
        if (!isAdmin || !session.user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const configurations = await prisma.configuration.findMany({
            where: { tenantId: session.user.tenantId },
            include: {
                variables: true,
                _count: {
                    select: {
                        instances: true,
                        generationRuns: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(configurations)
    } catch (error) {
        console.error('Error fetching configurations:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST create new configuration
export async function POST(request: Request) {
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

        const body = await request.json()
        const { 
            name, 
            description, 
            promptTemplate, 
            modelProvider, 
            modelName, 
            apiKey,
            generationsPerInstance, 
            rubric,
            variables,
            tags,
            rejectionReasons
        } = body

        if (!name || !promptTemplate) {
            return NextResponse.json(
                { error: 'Name and prompt template are required' }, 
                { status: 400 }
            )
        }

        const configuration = await prisma.configuration.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                description,
                promptTemplate,
                modelProvider: modelProvider || 'OPENAI',
                modelName: modelName || 'gpt-4',
                apiKey,
                generationsPerInstance: generationsPerInstance || 2,
                rubric,
                tags: tags || [],
                createdById: session.user.id,
                // Create variables if provided
                variables: variables ? {
                    create: variables.map((v: { key: string; label: string; description?: string; required?: boolean }) => ({
                        key: v.key,
                        label: v.label,
                        description: v.description,
                        required: v.required ?? true
                    }))
                } : undefined,
                // Create rejection reasons if provided
                rejectionReasons: rejectionReasons ? {
                    create: rejectionReasons.map((r: { label: string; description?: string }, index: number) => ({
                        label: r.label,
                        description: r.description,
                        sortOrder: index
                    }))
                } : undefined
            },
            include: {
                variables: true,
                rejectionReasons: true
            }
        })

        return NextResponse.json(configuration, { status: 201 })
    } catch (error) {
        console.error('Error creating configuration:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
