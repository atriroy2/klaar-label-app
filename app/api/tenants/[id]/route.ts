import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, Role } from '@/lib'
import prisma from '@/lib/prisma'

type TenantResult = {
    id: string;
    name: string;
    domain: string | null;
    isActive: boolean;
    createdAt: Date;
    user_count: number;
    admin_emails: string[];
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const [tenant] = await prisma.$queryRaw<TenantResult[]>`
            SELECT t.*, 
                   COUNT(u.id) as user_count,
                   JSON_AGG(CASE WHEN u.role = 'TENANT_ADMIN' THEN u.email END) FILTER (WHERE u.role = 'TENANT_ADMIN') as admin_emails
            FROM "Tenant" t
            LEFT JOIN "User" u ON t.id = u."tenantId"
            WHERE t.id = ${params.id}
            GROUP BY t.id
        `

        if (!tenant) {
            return new NextResponse('Not Found', { status: 404 })
        }

        return NextResponse.json({
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            isActive: tenant.isActive,
            userCount: tenant.user_count,
            adminEmail: tenant.admin_emails[0] || null,
            createdAt: tenant.createdAt.toISOString()
        })
    } catch (error) {
        console.error('Error fetching tenant:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        await prisma.$executeRaw`
            DELETE FROM "Tenant"
            WHERE id = ${params.id}
        `

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error('Error deleting tenant:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
