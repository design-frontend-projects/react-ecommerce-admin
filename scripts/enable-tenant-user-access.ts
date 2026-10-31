/**
 * scripts/enable-tenant-user-access.ts
 *
 * Idempotent provisioning script to enable all screens, roles, and permissions
 * for tenant user e1f2f7ad-ec16-4683-a24b-4a87223a474a.
 *
 * Run with: npx tsx scripts/enable-tenant-user-access.ts
 */

import prisma from '../src/lib/prisma'
import { invalidatePermissionCache } from '../src/server/utils/auth'

const TARGET_AUTH_USER_ID = 'e1f2f7ad-ec16-4683-a24b-4a87223a474a'

async function main() {
  console.log(`[Provisioning] Starting RBAC provisioning for user ${TARGET_AUTH_USER_ID}...`)

  const p = prisma as any

  // 1. Locate tenant user
  const tenantUser = await p.tenant_users.findFirst({
    where: { auth_user_id: TARGET_AUTH_USER_ID },
  })

  if (!tenantUser) {
    throw new Error(`Tenant user with auth_user_id ${TARGET_AUTH_USER_ID} not found in tenant_users.`)
  }

  console.log(`[Provisioning] Found tenant_user: ${tenantUser.id} (${tenantUser.email})`)

  // 2. Locate tenant
  let tenant = await p.tenants.findFirst({
    where: {
      OR: [
        { auth_user_id: TARGET_AUTH_USER_ID },
        { id: tenantUser.tenant_id ?? undefined },
      ],
    },
  })

  if (!tenant) {
    tenant = await p.tenants.findFirst()
  }

  if (!tenant) {
    throw new Error('No tenant found in the database.')
  }

  console.log(`[Provisioning] Target tenant: ${tenant.id} (${tenant.name})`)

  // 3. Find super_admin and Administrator roles
  const superAdminRole = await p.roles.findFirst({
    where: { name: 'super_admin' },
  })
  if (!superAdminRole) {
    throw new Error('Role "super_admin" not found in database.')
  }

  let adminRole = await p.roles.findFirst({
    where: {
      name: 'Administrator',
      OR: [{ tenant_id: tenant.id }, { tenant_id: null }],
    },
  })
  if (!adminRole) {
    adminRole = await p.roles.findFirst({
      where: { name: 'admin' },
    })
  }

  console.log(`[Provisioning] super_admin role ID: ${superAdminRole.id}`)
  if (adminRole) {
    console.log(`[Provisioning] Administrator role ID: ${adminRole.id}`)
  }

  // 4. Fetch all permissions, screens, business activity types, branches, warehouses
  const allPermissions = await p.permissions.findMany({ select: { id: true, name: true } })
  const allScreens = await p.app_screens.findMany({ select: { id: true, code: true } })
  const allActivityTypes = await p.business_activity_types.findMany({ select: { id: true, code: true } })
  const tenantBranches = await p.branches.findMany({ where: { tenant_id: tenant.id }, select: { id: true } })
  const tenantWarehouses = await p.warehouses.findMany({ where: { tenant_id: tenant.id }, select: { id: true } })

  console.log(`[Provisioning] Total permissions in DB: ${allPermissions.length}`)
  console.log(`[Provisioning] Total screens in DB: ${allScreens.length}`)
  console.log(`[Provisioning] Total business activity types: ${allActivityTypes.length}`)
  console.log(`[Provisioning] Tenant branches: ${tenantBranches.length}, warehouses: ${tenantWarehouses.length}`)

  const targetRoles = [superAdminRole]
  if (adminRole && adminRole.id !== superAdminRole.id) {
    targetRoles.push(adminRole)
  }

  // 5. Execute all database updates inside an atomic transaction with generous timeout
  await p.$transaction(
    async (tx: any) => {
      // 5.1 Normalize tenant_users record
      await tx.tenant_users.update({
        where: { id: tenantUser.id },
        data: {
          tenant_id: tenant.id,
          default_role: 'super_admin',
          is_active: true,
          is_blocked: false,
          deleted_at: null,
          deleted_by: null,
          onboarding_complete: true,
          is_restuarant_user: true,
          modules: ['inventory', 'restaurant'],
          primary_module: 'inventory',
        },
      })
      console.log(`[Provisioning] Updated tenant_users with tenant_id, default_role, and active flags.`)

      // 5.2 Assign user roles
      const userRolesData = targetRoles.map((role) => ({
        tenant_user_id: tenantUser.id,
        role_id: role.id,
      }))
      await tx.user_roles.createMany({
        data: userRolesData,
        skipDuplicates: true,
      })
      console.log(`[Provisioning] Assigned user_roles: ${targetRoles.map((r) => r.name).join(', ')}`)

      // 5.3 Ensure all permissions are mapped to target roles in role_permissions
      const rolePermsData: Array<{ role_id: string; permission_id: string }> = []
      for (const role of targetRoles) {
        for (const perm of allPermissions) {
          rolePermsData.push({
            role_id: role.id,
            permission_id: perm.id,
          })
        }
      }
      await tx.role_permissions.createMany({
        data: rolePermsData,
        skipDuplicates: true,
      })
      console.log(`[Provisioning] Linked all ${allPermissions.length} permissions to roles in role_permissions.`)

      // 5.4 Ensure all permissions are granted directly in user_permissions
      const userPermsData = allPermissions.map((perm: any) => ({
        tenant_user_id: tenantUser.id,
        permission_id: perm.id,
        is_granted: true,
      }))
      await tx.user_permissions.createMany({
        data: userPermsData,
        skipDuplicates: true,
      })
      console.log(`[Provisioning] Granted all ${allPermissions.length} permissions in user_permissions.`)

      // 5.5 Map all screens in screen_roles to both roles
      const screenRolesData: Array<{ screen_id: string; role_id: string }> = []
      for (const role of targetRoles) {
        for (const screen of allScreens) {
          screenRolesData.push({
            screen_id: screen.id,
            role_id: role.id,
          })
        }
      }
      await tx.screen_roles.createMany({
        data: screenRolesData,
        skipDuplicates: true,
      })
      console.log(`[Provisioning] Mapped all ${allScreens.length} screens to roles in screen_roles.`)

      // 5.6 Enable all business activity types for tenant
      const tenantActivityData = allActivityTypes.map((act: any) => ({
        tenant_id: tenant.id,
        activity_type_id: act.id,
        is_active: true,
      }))
      await tx.tenant_activity_types.createMany({
        data: tenantActivityData,
        skipDuplicates: true,
      })
      console.log(`[Provisioning] Enabled all ${allActivityTypes.length} activity types in tenant_activity_types.`)

      // 5.7 Link tenant user to all tenant branches
      if (tenantBranches.length > 0) {
        const branchData = tenantBranches.map((branch: any) => ({
          tenant_id: tenant.id,
          tenant_user_id: tenantUser.id,
          branch_id: branch.id,
          is_primary: true,
        }))
        await tx.tenant_user_branches.createMany({
          data: branchData,
          skipDuplicates: true,
        })
        console.log(`[Provisioning] Linked user to ${tenantBranches.length} branches in tenant_user_branches.`)
      }

      // 5.8 Link tenant user to all tenant warehouses
      if (tenantWarehouses.length > 0) {
        const warehouseData = tenantWarehouses.map((warehouse: any) => ({
          tenant_id: tenant.id,
          tenant_user_id: tenantUser.id,
          warehouse_id: warehouse.id,
          is_primary: true,
        }))
        await tx.tenant_user_warehouses.createMany({
          data: warehouseData,
          skipDuplicates: true,
        })
        console.log(`[Provisioning] Linked user to ${tenantWarehouses.length} warehouses in tenant_user_warehouses.`)
      }
    },
    {
      timeout: 60000,
      maxWait: 15000,
    }
  )

  // 6. Invalidate in-memory permission cache
  invalidatePermissionCache()
  invalidatePermissionCache({
    authUserId: TARGET_AUTH_USER_ID,
    tenantId: tenant.id,
  })
  console.log(`[Provisioning] In-memory permission cache invalidated successfully.`)

  console.log(`\n🎉 [SUCCESS] All screens, roles, and permissions successfully enabled for user ${TARGET_AUTH_USER_ID}!`)
}

main()
  .catch((err) => {
    console.error('❌ [Provisioning Failed]:', err)
    process.exit(1)
  })
  .finally(async () => {
    await (prisma as any).$disconnect?.()
  })
