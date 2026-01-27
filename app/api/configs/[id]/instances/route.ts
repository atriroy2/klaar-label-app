import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

// Increase body size limit to 2MB for large JSON uploads
export const maxDuration = 60 // seconds
export const dynamic = 'force-dynamic'

// GET instances for a configuration
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
            where: { id, tenantId: session.user.tenantId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const instances = await prisma.promptInstance.findMany({
            where: { configurationId: id },
            include: {
                _count: {
                    select: {
                        completions: true,
                        ratingMatches: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(instances)
    } catch (error) {
        console.error('Error fetching instances:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST create instances (single or batch from CSV)
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
            where: { id, tenantId: session.user.tenantId },
            include: { variables: true }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const body = await request.json()
        const { instances, csvData } = body

        // Handle CSV data upload
        if (csvData && Array.isArray(csvData)) {
            // csvData is an array of objects where keys are variable names
            const variableKeys = config.variables.map(v => v.key)
            
            // Validate that CSV has all required variables
            const requiredKeys = config.variables.filter(v => v.required).map(v => v.key)
            
            const createdInstances = []
            const errors: string[] = []

            for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i]
                
                // Check required fields
                const missingKeys = requiredKeys.filter(key => !row[key] || row[key].toString().trim() === '')
                if (missingKeys.length > 0) {
                    errors.push(`Row ${i + 1}: Missing required fields: ${missingKeys.join(', ')}`)
                    continue
                }

                // Filter to only include defined variables
                const data: Record<string, string> = {}
                for (const key of variableKeys) {
                    if (row[key] !== undefined) {
                        data[key] = row[key].toString()
                    }
                }

                try {
                    const instance = await prisma.promptInstance.create({
                        data: {
                            configurationId: id,
                            data
                        }
                    })
                    createdInstances.push(instance)
                } catch (err) {
                    errors.push(`Row ${i + 1}: Failed to create instance`)
                }
            }

            return NextResponse.json({
                created: createdInstances.length,
                errors,
                instances: createdInstances
            }, { status: 201 })
        }

        // Handle single or array of instances
        if (instances && Array.isArray(instances)) {
            const createdInstances = await prisma.promptInstance.createMany({
                data: instances.map((data: Record<string, string>) => ({
                    configurationId: id,
                    data
                }))
            })

            return NextResponse.json({ created: createdInstances.count }, { status: 201 })
        }

        // Single instance
        if (body.data) {
            const instance = await prisma.promptInstance.create({
                data: {
                    configurationId: id,
                    data: body.data
                }
            })

            return NextResponse.json(instance, { status: 201 })
        }

        return NextResponse.json({ error: 'No instance data provided' }, { status: 400 })
    } catch (error) {
        console.error('Error creating instances:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE all instances for a configuration
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
        const config = await prisma.configuration.findFirst({
            where: { id, tenantId: session.user.tenantId }
        })

        if (!config) {
            return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
        }

        const deleted = await prisma.promptInstance.deleteMany({
            where: { configurationId: id }
        })

        return NextResponse.json({ deleted: deleted.count })
    } catch (error) {
        console.error('Error deleting instances:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
