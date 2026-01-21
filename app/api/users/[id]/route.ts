import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const userId = params.id

        // Users can see their own data, admins can see any user in their tenant
        if (session.user.role === Role.USER && userId !== session.user.id) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return new NextResponse('User not found', { status: 404 })
        }

        // Verify tenant access
        if (session.user.role !== Role.SUPER_ADMIN) {
            if (!session.user.tenantId) {
                return new NextResponse('Tenant ID not found', { status: 400 })
            }
            const tenantId = session.user.tenantId
            if (user.tenantId !== tenantId) {
            return new NextResponse('Forbidden', { status: 403 })
            }
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error fetching user:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

