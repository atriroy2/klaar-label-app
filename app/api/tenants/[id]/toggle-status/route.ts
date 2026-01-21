import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, Role } from '@/lib'
import prisma from '@/lib/prisma'

type TenantResult = {
    id: string;
    name: string;
    domain: string | null;
    isActive: boolean;
}

class TenantNotFoundError extends Error {
    constructor() {
        super('Tenant not found')
        this.name = 'TenantNotFoundError'
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Begin transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update tenant status
            const [updatedTenant] = await tx.$queryRaw<TenantResult[]>`
                UPDATE "Tenant"
                SET "isActive" = NOT "isActive"
                WHERE id = ${params.id}
                RETURNING id, name, domain, "isActive"
            `

            if (!updatedTenant) {
                throw new TenantNotFoundError()
            }

            // If deactivating, delete all sessions for users of this tenant
            await tx.$executeRaw`
                DELETE FROM "Session"
                WHERE "userId" IN (
                    SELECT id FROM "User"
                    WHERE "tenantId" = ${params.id}
                )
            `

            return updatedTenant
        })

        return NextResponse.json({
            message: `Tenant ${result.isActive ? 'activated' : 'deactivated'} successfully`,
            tenant: {
                id: result.id,
                name: result.name,
                domain: result.domain,
                isActive: result.isActive
            }
        })
    } catch (error) {
        console.error('Error toggling tenant status:', error)
        if (error instanceof TenantNotFoundError) {
            return new NextResponse('Not Found', { status: 404 })
        }
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
