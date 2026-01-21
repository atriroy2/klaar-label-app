import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // For TENANT_ADMIN or SUPER_ADMIN with tenantId, get users of their tenant
        if ((session.user.role === Role.TENANT_ADMIN || 
             (session.user.role === Role.SUPER_ADMIN && session.user.tenantId)) && 
            session.user.tenantId) {
            const tenantId = session.user.tenantId
            const users = await prisma.user.findMany({
                where: { tenantId },
            })
            const transformedUsers = users.map(user => ({
                ...user,
                status: user.isActive ? 'Active' : 'Inactive',
            }))
            return NextResponse.json(transformedUsers)
        }

        // For SUPER_ADMIN without tenantId, get all users
        if (session.user.role === Role.SUPER_ADMIN) {
            const users = await prisma.user.findMany({
                include: {
                    tenant: { select: { name: true } },
                },
            })
            const transformedUsers = users.map(user => ({
                ...user,
                status: user.isActive ? 'Active' : 'Inactive',
            }))
            return NextResponse.json(transformedUsers)
        }

        // Regular users can't access this endpoint
        return new NextResponse('Forbidden', { status: 403 })
    } catch (error) {
        console.error('Error fetching users:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || (session.user.role !== Role.TENANT_ADMIN && session.user.role !== Role.SUPER_ADMIN)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await request.json()
        const { name, email, role } = body

        // Validate required fields
        if (!email || !role) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return new NextResponse('User already exists', { status: 409 })
        }

        // For tenant admin or super admin with tenantId, create user in their tenant
        if (session.user.role === Role.TENANT_ADMIN || 
            (session.user.role === Role.SUPER_ADMIN && session.user.tenantId)) {
            if (!session.user.tenantId) {
                return new NextResponse('Tenant ID not found', { status: 400 })
            }
            const tenantId = session.user.tenantId

            // Tenant admins and super admins managing a tenant can't create super admin users
            if (role === Role.SUPER_ADMIN) {
                return new NextResponse('Cannot create super admin users', { status: 403 })
            }

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    role,
                    tenantId,
                },
            })

            return NextResponse.json(user)
        } else {
            // For super admin without tenantId, create user without tenant restriction
            // (platform-wide user creation)
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    role,
                },
            })

            return NextResponse.json(user)
        }
    } catch (error) {
        console.error('Error creating user:', error)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return new NextResponse('User with this email already exists', { status: 409 })
            }
            return new NextResponse(`Database error: ${error.message}`, { status: 400 })
        }
        return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || (session.user.role !== Role.TENANT_ADMIN && session.user.role !== Role.SUPER_ADMIN)) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await request.json()
        const { id, name, email, role, isActive } = body

        console.log('Update request:', { id, name, email, role, isActive })

        // Validate required fields
        if (!id) {
            return new NextResponse('Missing user ID', { status: 400 })
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { tenant: true },
        })

        if (!existingUser) {
            return new NextResponse('User not found', { status: 404 })
        }

        // For tenant admin, ensure they can only modify users in their tenant
        if (session.user.role === Role.TENANT_ADMIN) {
            if (!session.user.tenantId) {
                return new NextResponse('Tenant ID not found', { status: 400 })
            }
            const tenantId = session.user.tenantId
            if (existingUser.tenantId !== tenantId) {
                return new NextResponse('Cannot modify users from other tenants', { status: 403 })
            }

            // Tenant admins can't modify super admin users
            if (existingUser.role === Role.SUPER_ADMIN) {
                return new NextResponse('Cannot modify super admin users', { status: 403 })
            }

            // If trying to deactivate a tenant admin (including themselves), check if they're the last one
            if (typeof isActive === 'boolean' && !isActive && existingUser.role === Role.TENANT_ADMIN && existingUser.tenantId) {
                // Count active tenant admins in the tenant
                const activeTenantAdmins = await prisma.user.count({
                    where: {
                        tenantId: existingUser.tenantId,
                        role: Role.TENANT_ADMIN,
                        isActive: true,
                        NOT: {
                            id: existingUser.id // Exclude the current user
                        }
                    }
                })
//something here
                if (activeTenantAdmins === 0) {
                    return new NextResponse('Cannot deactivate the only Tenant Admin', { status: 400 })
                }
            }

            // Tenant admins can't change user roles to super admin (but can assign tenant admin)
            if (role && role !== existingUser.role && role === Role.SUPER_ADMIN) {
                return new NextResponse('Cannot assign super admin role', { status: 403 })
            }
        }

        // Prepare update data
        const updateData = {
            ...(name && { name }),
            ...(email && { email }),
            ...(role && { role }),
            ...(typeof isActive === 'boolean' && { isActive }),
        }

        console.log('Update data:', updateData)

        // Update user
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        })

        // Transform the response to include status
        const transformedUser = {
            ...user,
            status: user.isActive ? 'Active' : 'Inactive',
        }

        return NextResponse.json(transformedUser)
    } catch (error) {
        console.error('Error updating user:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
} 