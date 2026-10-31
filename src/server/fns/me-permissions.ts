/**
 * src/server/fns/me-permissions.ts
 *
 * Server function to resolve current user's effective permissions,
 * ABAC scopes, accessible modules, screens, and action button states.
 */

'use server'

import prisma from '@/lib/prisma'
import { getDatabasePermissionNames } from '@/server/utils/auth'
import { permissionRegistry } from '@/lib/rbac/registry'
import { resolveUserDynamicNavigation } from '@/server/services/navigation-abac.service'
import { resolveTenantId } from '@/server/utils/tenant'

export interface MePermissionsData {
  userId: string
  tenantId: string | null
  tenantUserId: string | null
  roles: string[]
  isSuperAdmin: boolean
  isOwner: boolean
  permissions: string[]
  scopes: {
    tenantId: string
    branchIds: string[]
    warehouseIds: string[]
    storeIds: string[]
    ownRecordsOnly: boolean
  }
  modules: string[]
  screens: Record<string, boolean>
  buttons: Record<string, Record<string, 'visible' | 'hidden' | 'disabled'>>
}

export interface MePermissionsResponse {
  success: boolean
  data: MePermissionsData
}

export async function getMePermissions(params: {
  authUserId: string
  tenantId?: string | null
}): Promise<MePermissionsResponse> {
  const { authUserId } = params
  let tenantId = params.tenantId || null

  if (!authUserId) {
    return {
      success: true,
      data: {
        userId: '',
        tenantId: null,
        tenantUserId: null,
        roles: [],
        isSuperAdmin: false,
        isOwner: false,
        permissions: [],
        scopes: {
          tenantId: '',
          branchIds: [],
          warehouseIds: [],
          storeIds: [],
          ownRecordsOnly: false,
        },
        modules: [],
        screens: {},
        buttons: {},
      },
    }
  }

  // Fallback to user's default tenant if not specified
  if (!tenantId) {
    try {
      tenantId = await resolveTenantId(authUserId)
    } catch {
      tenantId = null
    }
  }

  // 1. Authoritative DB resolution
  const dbAccess = await getDatabasePermissionNames(
    authUserId,
    tenantId ?? undefined
  )

  const isBlocked = dbAccess.isBlocked
  const roleNames = [...new Set(dbAccess.roleNames)]
  const permissionNames = isBlocked ? [] : [...new Set(dbAccess.permissionNames)]
  const tenantUserId = dbAccess.tenantUserId

  const isSuperAdmin = Boolean(
    roleNames.includes('super_admin') ||
      roleNames.includes('system_owner')
  )

  // 2. Check ownership
  let isOwner = Boolean(
    roleNames.includes('owner') ||
      roleNames.includes('system_owner')
  )

  if (!isOwner && tenantId) {
    try {
      const ownedTenant = await prisma.tenants.findFirst({
        where: { id: tenantId, auth_user_id: authUserId },
        select: { id: true },
      })
      if (ownedTenant) {
        isOwner = true
      }
    } catch {
      // ignore
    }
  }

  // If user is blocked or has no tenant user record
  if (isBlocked) {
    return {
      success: true,
      data: {
        userId: authUserId,
        tenantId,
        tenantUserId: null,
        roles: [],
        isSuperAdmin: false,
        isOwner: false,
        permissions: [],
        scopes: {
          tenantId: tenantId || '',
          branchIds: [],
          warehouseIds: [],
          storeIds: [],
          ownRecordsOnly: false,
        },
        modules: [],
        screens: {},
        buttons: {},
      },
    }
  }

  // 3. Resolve ABAC scopes from companion tables
  let branchIds: string[] = []
  let warehouseIds: string[] = []
  let ownRecordsOnly = false

  if (tenantUserId && tenantId) {
    try {
      const [branches, warehouses] = await Promise.all([
        prisma.tenant_user_branches.findMany({
          where: { tenant_user_id: tenantUserId, tenant_id: tenantId },
          select: { branch_id: true },
        }),
        prisma.tenant_user_warehouses.findMany({
          where: { tenant_user_id: tenantUserId, tenant_id: tenantId },
          select: { warehouse_id: true },
        }),
      ])

      branchIds = branches.map((b) => b.branch_id).filter(Boolean)
      warehouseIds = warehouses.map((w) => w.warehouse_id).filter(Boolean)
    } catch {
      // ignore if companion lookup fails
    }

    if (branchIds.length === 0 && dbAccess.branchId) {
      branchIds.push(dbAccess.branchId)
    }
    if (warehouseIds.length === 0 && dbAccess.warehouseId) {
      warehouseIds.push(dbAccess.warehouseId)
    }

    try {
      const roles = await prisma.roles.findMany({
        where: {
          name: { in: roleNames },
          is_active: true,
          OR: [{ tenant_id: null }, { tenant_id: tenantId }],
        },
        select: { data_scope: true },
      })
      const scopes = roles.map((r) => r.data_scope).filter(Boolean)
      if (scopes.includes('OWN_RECORDS') && !scopes.includes('TENANT')) {
        ownRecordsOnly = true
      }
    } catch {
      // ignore
    }
  }

  // 4. Compute Access via Centralized Permission Registry
  const registryAccess = permissionRegistry.computeUserAccess(
    permissionNames,
    isSuperAdmin
  )

  // 5. Try merging with dynamic database navigation if available
  const mergedModules = [...registryAccess.modules]
  const mergedScreens = { ...registryAccess.screens }
  const mergedButtons = { ...registryAccess.buttons }

  if (tenantId) {
    try {
      const navResult = await resolveUserDynamicNavigation({
        authUserId,
        roleNames,
        permissionNames,
        tenantId,
      })

      for (const m of navResult.modules) {
        if (!mergedModules.includes(m.code)) {
          mergedModules.push(m.code)
        }
      }

      for (const [route, allowed] of Object.entries(navResult.screens)) {
        if (mergedScreens[route] === undefined) {
          mergedScreens[route] = allowed
        }
      }

      for (const [screenCode, screenBtns] of Object.entries(navResult.buttons)) {
        if (!mergedButtons[screenCode]) {
          mergedButtons[screenCode] = {}
        }
        for (const [btnCode, perm] of Object.entries(screenBtns)) {
          if (!mergedButtons[screenCode][btnCode]) {
            const hasPerm =
              isSuperAdmin ||
              permissionNames.includes('*') ||
              permissionNames.includes(perm)
            mergedButtons[screenCode][btnCode] = hasPerm ? 'visible' : 'hidden'
          }
        }
      }
    } catch {
      // If dynamic navigation fails (e.g. unseeded database in minimal tests), registryAccess is complete
    }
  }

  return {
    success: true,
    data: {
      userId: authUserId,
      tenantId,
      tenantUserId: tenantUserId ?? null,
      roles: roleNames,
      isSuperAdmin,
      isOwner,
      permissions: permissionNames,
      scopes: {
        tenantId: tenantId || '',
        branchIds,
        warehouseIds,
        storeIds: branchIds,
        ownRecordsOnly,
      },
      modules: mergedModules,
      screens: mergedScreens,
      buttons: mergedButtons,
    },
  }
}
