import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Leaderboard: users in the same tenant, sorted by SharthokBucks (sartokBucks) descending
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const tenantId = session.user.tenantId
        if (!tenantId) {
            return NextResponse.json({ error: 'No tenant associated' }, { status: 400 })
        }

        const users = await prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                sartokBucks: true,
            },
            orderBy: {
                sartokBucks: 'desc',
            },
        })

        return NextResponse.json({ leaderboard: users })
    } catch (error) {
        console.error('Error fetching leaderboard:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
