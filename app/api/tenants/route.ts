import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, Role } from '@/lib'
import prisma from '@/lib/prisma'
import { Tenant, User } from '@prisma/client'

type TenantWithUsers = Tenant & {
    users: Pick<User, 'email'>[];
    _count: {
        users: number;
    };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
            return NextResponse.json(
                { error: 'Unauthorized - Only Super Admins can view tenants' },
                { status: 401 }
            )
        }

        const tenants = await prisma.tenant.findMany({
            include: {
                users: {
                    where: {
                        OR: [
                            { role: Role.TENANT_ADMIN },
                            { role: Role.SUPER_ADMIN, tenantId: { not: null } } // Include super admins assigned to tenants
                        ]
                    },
                    select: {
                        email: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        users: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        }) as TenantWithUsers[]

        const formattedTenants = tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            isActive: tenant.isActive,
            userCount: tenant._count.users,
            // Get the first admin email (either TENANT_ADMIN or SUPER_ADMIN with tenantId)
            adminEmail: tenant.users[0]?.email || null,
            createdAt: tenant.createdAt.toISOString()
        }))

        return NextResponse.json(formattedTenants)
    } catch (error) {
        console.error('Error fetching tenants:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    let adminEmail: string | undefined
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
            return NextResponse.json(
                { error: 'Unauthorized - Only Super Admins can create tenants' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { name, domain, adminEmail: email, adminName } = body
        adminEmail = email

        if (!name || !adminEmail || !adminName) {
            return NextResponse.json(
                { error: 'Bad Request - Missing required fields' },
                { status: 400 }
            )
        }

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        let tenant
        let wasSuperAdmin = false
        if (existingUser) {
            // If user exists, check if they're a super admin
            if (existingUser.role === Role.SUPER_ADMIN) {
                wasSuperAdmin = true
                // Super admin can be assigned to a tenant - create tenant and associate them
                tenant = await prisma.tenant.create({
                    data: {
                        name,
                        domain,
                        isActive: true,
                    }
                })

                // Update the super admin to be associated with this tenant
                // Keep their SUPER_ADMIN role so they retain platform-wide access
                // They can manage both tenants (as super admin) and their assigned tenant (as tenant admin)
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        tenantId: tenant.id,
                        name: adminName || existingUser.name, // Update name if provided
                        // Keep role as SUPER_ADMIN - don't change it
                    }
                })
            } else if (existingUser.role === Role.TENANT_ADMIN && existingUser.tenantId) {
                // User is already a tenant admin of another tenant
                return NextResponse.json(
                    { error: `A tenant admin with email ${adminEmail} already exists and is assigned to another tenant. Please use a different email address.` },
                    { status: 409 }
                )
            } else {
                // User exists but is a regular USER - they can't be assigned as tenant admin
                return NextResponse.json(
                    { error: `A user with email ${adminEmail} already exists with role ${existingUser.role}. Only super admins can be assigned as tenant admins.` },
                    { status: 409 }
                )
            }
        } else {
            // User doesn't exist - create tenant and new tenant admin user
            tenant = await prisma.tenant.create({
            data: {
                name,
                domain,
                isActive: true,
                users: {
                    create: {
                        name: adminName,
                        email: adminEmail,
                        role: Role.TENANT_ADMIN
                    }
                }
            }
        })
        }

        return NextResponse.json({
            message: wasSuperAdmin 
                ? 'Tenant created successfully. The super admin has been assigned to this tenant and can manage it while retaining super admin privileges.'
                : 'Tenant created successfully',
            tenant: {
                id: tenant.id,
                name: tenant.name,
                domain: tenant.domain
            }
        })
    } catch (error: any) {
        console.error('Error creating tenant:', error)
        if (error.code === 'P2002') {
            // Check which field caused the unique constraint violation
            const target = error.meta?.target as string[] | undefined
            if (target && target.includes('email')) {
                return NextResponse.json(
                    { error: `A user with email ${adminEmail || 'this email'} already exists. Please use a different email address.` },
                    { status: 409 }
                )
            }
            return NextResponse.json(
                { error: 'A record with these values already exists. Please check the tenant name, domain, or admin email.' },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
