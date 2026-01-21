import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, Role } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ isActive: true }, { status: 200 })
        }

        const body = await request.json()
        const { tenantId } = body

        if (!tenantId) {
            return NextResponse.json({ isActive: true }, { status: 200 })
        }

        // Super admins can access any tenant
        if (session.user.role === Role.SUPER_ADMIN) {
            return NextResponse.json({ isActive: true }, { status: 200 })
        }

        // Verify that the user belongs to the tenant they're checking
        if (session.user.tenantId !== tenantId) {
            return NextResponse.json({ isActive: false }, { status: 403 })
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { isActive: true }
        })

        if (!tenant) {
            return NextResponse.json({ isActive: false }, { status: 404 })
        }

        return NextResponse.json({
            isActive: tenant.isActive
        })
    } catch (error) {
        console.error('Error checking tenant status:', error)
        // Default to allowing access on error, middleware will handle subsequent requests
        return NextResponse.json({ isActive: true }, { status: 200 })
    }
} 