import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function backfillTenantIds() {
  console.log('Starting backfill of tenant_id in tenant_users...')

  // Find all tenant_users where tenant_id is NULL
  const usersWithNullTenantId = await prisma.tenant_users.findMany({
    where: {
      tenant_id: null,
    },
    select: {
      id: true,
      auth_user_id: true,
      parent_tenant_id: true,
      email: true,
    },
  })

  console.log(`Found ${usersWithNullTenantId.length} tenant_users records with NULL tenant_id.`)

  let updatedCount = 0
  let failedCount = 0

  for (const user of usersWithNullTenantId) {
    let resolvedTenantId: string | null = user.parent_tenant_id

    if (!resolvedTenantId && user.auth_user_id) {
      // 1. Check if user is a tenant owner via tenant_subscriptions
      const sub = await prisma.tenant_subscriptions.findFirst({
        where: { auth_user_id: user.auth_user_id },
        select: { tenant_id: true, id: true },
      })
      resolvedTenantId = sub?.tenant_id ?? sub?.id ?? null

      // 2. Check if user created a tenant
      if (!resolvedTenantId) {
        const tenantCreated = await prisma.tenants.findFirst({
          where: { created_by: user.auth_user_id },
          select: { id: true },
        })
        resolvedTenantId = tenantCreated?.id ?? null
      }

      // 3. Check profile parent_auth_user_id
      if (!resolvedTenantId) {
        const profile = await prisma.profiles.findFirst({
          where: { auth_user_id: user.auth_user_id },
          select: { parent_auth_user_id: true },
        })
        if (profile?.parent_auth_user_id) {
          const parentSub = await prisma.tenant_subscriptions.findFirst({
            where: { auth_user_id: profile.parent_auth_user_id },
            select: { tenant_id: true, id: true },
          })
          resolvedTenantId = parentSub?.tenant_id ?? parentSub?.id ?? null
        }
      }
    }

    if (resolvedTenantId) {
      await prisma.tenant_users.update({
        where: { id: user.id },
        data: {
          tenant_id: resolvedTenantId,
          ...(user.parent_tenant_id === null ? { parent_tenant_id: resolvedTenantId } : {}),
        },
      })
      updatedCount++
      console.log(`[Success] Updated user ${user.email || user.id} -> tenant_id: ${resolvedTenantId}`)
    } else {
      failedCount++
      console.warn(`[Warning] Could not resolve tenant_id for user ${user.email || user.id}`)
    }
  }

  console.log(`\nBackfill complete! Updated: ${updatedCount}, Unresolved: ${failedCount}`)
}

backfillTenantIds()
  .catch((err) => {
    console.error('Error executing backfill script:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
