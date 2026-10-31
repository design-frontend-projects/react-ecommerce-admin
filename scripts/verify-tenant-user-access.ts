/**
 * scripts/verify-tenant-user-access.ts
 *
 * Automated verification test ensuring all screens, roles, and permissions
 * are fully enabled and accessible for tenant user e1f2f7ad-ec16-4683-a24b-4a87223a474a.
 *
 * Run with: npx tsx scripts/verify-tenant-user-access.ts
 */

import prisma from '../src/lib/prisma'
import { getDatabasePermissionNames } from '../src/server/utils/auth'
import { getMePermissions } from '../src/server/fns/me-permissions'
import { resolveUserDynamicNavigation } from '../src/server/services/navigation-abac.service'

const TARGET_AUTH_USER_ID = 'e1f2f7ad-ec16-4683-a24b-4a87223a474a'

async function main() {
  console.log(`[Verification] Running verification for user: ${TARGET_AUTH_USER_ID}...\n`)

  let failedChecks = 0

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`)
    } else {
      console.error(`  ❌ FAIL: ${message}`)
      failedChecks++
    }
  }

  // 1. Authoritative DB permission check
  console.log('--- 1. Authoritative Database Permissions Check ---')
  const dbAccess = await getDatabasePermissionNames(TARGET_AUTH_USER_ID)
  
  assert(!dbAccess.isBlocked, 'User is NOT blocked (isBlocked === false)')
  assert(dbAccess.tenantId !== null, `Tenant ID is resolved (${dbAccess.tenantId})`)
  assert(dbAccess.tenantUserId !== null, `Tenant User ID is resolved (${dbAccess.tenantUserId})`)
  assert(dbAccess.roleNames.includes('super_admin'), 'roleNames includes "super_admin"')
  assert(dbAccess.roleNames.includes('Administrator'), 'roleNames includes "Administrator"')
  
  const totalDbPermissionsCount = await (prisma as any).permissions.count()
  assert(
    dbAccess.permissionNames.length >= totalDbPermissionsCount,
    `All ${totalDbPermissionsCount} database permissions granted (has: ${dbAccess.permissionNames.length})`
  )

  // 2. getMePermissions API check
  console.log('\n--- 2. Me Permissions API Check ---')
  const mePermsResponse = await getMePermissions({ authUserId: TARGET_AUTH_USER_ID })
  
  assert(mePermsResponse.success === true, 'getMePermissions returns success === true')
  const meData = mePermsResponse.data
  assert(meData.isSuperAdmin === true, 'isSuperAdmin is TRUE')
  assert(meData.isOwner === true, 'isOwner is TRUE')
  assert(meData.permissions.length >= totalDbPermissionsCount, `API returns all ${totalDbPermissionsCount} permissions`)
  assert(meData.modules.length > 0, `Accessible modules returned (count: ${meData.modules.length})`)

  // Check screens in me permissions
  const screenKeys = Object.keys(meData.screens)
  const trueScreens = screenKeys.filter((k) => meData.screens[k] === true)
  assert(screenKeys.length > 0, `Total screens evaluated: ${screenKeys.length}`)
  assert(
    trueScreens.length === screenKeys.length,
    `100% of evaluated screens are accessible (true: ${trueScreens.length}/${screenKeys.length})`
  )

  // 3. Dynamic Navigation ABAC check
  console.log('\n--- 3. Dynamic Navigation ABAC Check ---')
  const navResult = await resolveUserDynamicNavigation({
    authUserId: TARGET_AUTH_USER_ID,
    roleNames: dbAccess.roleNames,
    permissionNames: dbAccess.permissionNames,
    tenantId: dbAccess.tenantId,
  })

  assert(navResult.modules.length > 0, `Navigation returned active modules (count: ${navResult.modules.length})`)
  const totalNavScreens = navResult.modules.reduce((acc, m) => acc + m.screens.length, 0)
  assert(totalNavScreens > 0, `Navigation contains screens (count: ${totalNavScreens})`)

  // Check specific high-priority routes
  const criticalScreens = [
    '/products',
    '/inventory',
    '/sales-orders',
    '/purchase-orders',
    '/pos',
    '/respos/cashier',
    '/users',
    '/roles',
    '/permissions',
    '/access-control/screens',
    '/system/audit-logs',
  ]

  console.log('\n--- 4. Critical Route Access Verification ---')
  for (const route of criticalScreens) {
    const isAccessible = meData.screens[route] === true
    assert(isAccessible, `Screen '${route}' is accessible`)
  }

  // Final summary
  console.log('\n=============================================')
  if (failedChecks === 0) {
    console.log(`🎉 ALL VERIFICATION CHECKS PASSED (0 failures)!`)
  } else {
    console.error(`❌ VERIFICATION COMPLETED WITH ${failedChecks} FAILURES.`)
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error('❌ Verification script crashed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await (prisma as any).$disconnect?.()
  })

