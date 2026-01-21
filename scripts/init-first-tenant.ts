/**
 * Initialize the first tenant and a super admin user.
 *
 * Usage:
 *   npx ts-node scripts/init-first-tenant.ts
 *   # or
 *   npx tsx scripts/init-first-tenant.ts
 *
 * Ensure DATABASE_URL is set in your environment before running.
 */

import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function initFirstTenant() {
  // Change these to match your setup
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com'
  const tenantName = process.env.DEFAULT_TENANT_NAME || 'Default Tenant'

  try {
    console.log('Starting initialization...')

    // Find or create tenant
    let tenant = await prisma.tenant.findFirst({ where: { name: tenantName } })
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          isActive: true,
        },
      })
      console.log(`✓ Created tenant: ${tenant.name} (ID: ${tenant.id})`)
    } else {
      console.log(`Tenant "${tenant.name}" already exists (ID: ${tenant.id})`)
    }

    // Find or create super admin
    let user = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: superAdminEmail,
          name: 'Super Admin',
          role: Role.SUPER_ADMIN,
          tenantId: tenant.id,
          isActive: true,
        },
      })
      console.log(`✓ Created super admin user: ${user.email} (ID: ${user.id})`)
    } else {
      // Ensure role and tenant
      const updates: { role?: Role; tenantId?: string; isActive?: boolean } = {}
      if (user.role !== Role.SUPER_ADMIN) updates.role = Role.SUPER_ADMIN
      if (!user.tenantId) updates.tenantId = tenant.id
      if (user.isActive === false) updates.isActive = true

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        })
        console.log('✓ Updated existing user to super admin and linked to tenant')
      } else {
        console.log('User already configured as super admin')
      }
    }

    console.log('\n✓ Initialization complete!')
    console.log(`You can now log in with: ${superAdminEmail}`)
    console.log('Ensure Google OAuth is configured to allow this email as a tester/user.')
  } catch (error) {
    console.error('Initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initFirstTenant()
