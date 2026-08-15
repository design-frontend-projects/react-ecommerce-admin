import prisma from '@/lib/prisma'
import {
  hasAnyPermission,
  normalizeRoleName,
  resolveEffectivePermissions,
} from '@/features/users/data/rbac'

export interface NavigationContext {
  authUserId: string
  roleNames: string[]
  permissionNames: string[]
  tenantId?: string | null
}

interface ScreenRow {
  id: string
  code: string
  name: string
  route: string
  icon: string | null
  sort_order: number
  screen_roles: Array<{ roles: { name: string } }>
  screen_permissions: Array<{ permissions: { name: string } }>
  screen_buttons: Array<{
    permission_buttons: { code: string }
    permissions: { name: string }
  }>
}

interface TenantUserRow {
  primary_module: string | null
  modules: string[] | null
  is_active: boolean | null
  user_permissions?: Array<{
    is_granted: boolean
    permissions: {
      name: string
    }
  }>
}

interface ModuleRow {
  id: string
  code: string
  name: string
  sort_order: number
  module_activity_types: Array<{
    activity_type_id: string
    business_activity_types?: { code: string }
  }>
  app_screens: ScreenRow[]
}

export interface DynamicNavigationResult {
  modules: Array<{
    code: string
    name: string
    sortOrder: number
    screens: Array<{
      code: string
      name: string
      route: string
      icon: string | null
      sortOrder: number
    }>
  }>
  screens: Record<string, boolean>
  buttons: Record<string, Record<string, string>>
}

/**
 * Resolves the dynamic navigation catalog for the authenticated user
 * by evaluating both RBAC (roles & permissions) and ABAC (tenant capabilities,
 * active business activities, user module assignments, and system ownership).
 */
export async function resolveUserDynamicNavigation(
  ctx: NavigationContext
): Promise<DynamicNavigationResult> {
  const { authUserId, roleNames, permissionNames, tenantId } = ctx

  // 1. Fetch tenant-user attributes in parallel
  const [tenantUser, tenantActivityTypes, rawModules] =
    await Promise.all([
      (tenantId
        ? prisma.tenant_users.findFirst({
            where: { auth_user_id: authUserId, tenant_id: tenantId },
            select: {
              primary_module: true,
              modules: true,
              is_active: true,
              user_permissions: {
                select: {
                  is_granted: true,
                  permissions: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve(null)) as Promise<TenantUserRow | null>,
      (tenantId
        ? prisma.tenant_activity_types.findMany({
            where: { tenant_id: tenantId, is_active: true },
            select: { activity_type_id: true },
          })
        : Promise.resolve([])) as Promise<Array<{ activity_type_id: string }>>,
      prisma.app_modules.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          sort_order: true,
          module_activity_types: {
            select: {
              activity_type_id: true,
            },
          },
          app_screens: {
            where: { is_active: true },
            orderBy: { sort_order: 'asc' },
            select: {
              id: true,
              code: true,
              name: true,
              route: true,
              icon: true,
              sort_order: true,
              screen_roles: { select: { roles: { select: { name: true } } } },
              screen_permissions: {
                select: { permissions: { select: { name: true } } },
              },
              screen_buttons: {
                where: { is_active: true },
                select: {
                  permission_buttons: { select: { code: true } },
                  permissions: { select: { name: true } },
                },
              },
            },
          },
        },
      }) as Promise<ModuleRow[]>,
    ])

  const callerRoleNames = roleNames.map(normalizeRoleName)
  const isSuperAdminOwner = callerRoleNames.includes('super_admin')
  const isSystemOwner = isSuperAdminOwner || callerRoleNames.includes('system_owner')

  // 2. Compute effective permissions incorporating any user direct overrides
  let effectivePermissions = permissionNames
  if (tenantUser?.user_permissions && tenantUser.user_permissions.length > 0) {
    const directGrants = tenantUser.user_permissions
      .filter((p) => p.is_granted)
      .map((p) => p.permissions.name)
    const directDenies = tenantUser.user_permissions
      .filter((p) => !p.is_granted)
      .map((p) => p.permissions.name)

    effectivePermissions = resolveEffectivePermissions(
      permissionNames,
      directGrants,
      directDenies
    )
  }

  const activeActivityIds = new Set(
    tenantActivityTypes.map((t) => t.activity_type_id)
  )

  // 3. ABAC & RBAC Screen Evaluator
  const isScreenAllowed = (moduleCode: string, screen: ScreenRow): boolean => {
    // Super Admin Owner bypasses all access restrictions
    if (isSuperAdminOwner) return true

    // The system module is strictly reserved for system owners
    if (moduleCode === 'system' && !isSystemOwner) return false

    const roleLinks = screen.screen_roles.map((link) =>
      normalizeRoleName(link.roles.name)
    )
    const permissionLinks = screen.screen_permissions.map(
      (link) => link.permissions.name
    )

    // No roles or permissions specified -> accessible by all authenticated users
    if (roleLinks.length === 0 && permissionLinks.length === 0) return true

    // Check role match
    if (roleLinks.some((name) => callerRoleNames.includes(name))) return true

    // Check permission match
    return hasAnyPermission(effectivePermissions, permissionLinks)
  }

  // 4. ABAC Module Filter
  const isModuleAllowed = (module: ModuleRow): boolean => {
    if (isSuperAdminOwner) return true

    // System module ABAC check
    if (module.code === 'system') return isSystemOwner

    // ABAC: Check tenant active activity types if module has activity requirements
    if (module.module_activity_types.length > 0 && tenantId) {
      const hasMatchingActivity = module.module_activity_types.some((mat) =>
        activeActivityIds.has(mat.activity_type_id)
      )
      if (!hasMatchingActivity && !isSystemOwner) return false
    }

    // ABAC: Check user assigned modules (e.g. inventory vs restaurant)
    if (
      tenantUser &&
      tenantUser.modules &&
      tenantUser.modules.length > 0 &&
      !isSystemOwner
    ) {
      const userModuleStrings = tenantUser.modules.map(String)
      if (
        (module.code === 'restaurant' && !userModuleStrings.includes('restaurant')) ||
        (module.code === 'inventory' && !userModuleStrings.includes('inventory'))
      ) {
        return false
      }
    }

    return true
  }

  const screensByRoute: Record<string, boolean> = {}
  const buttonsByScreen: Record<string, Record<string, string>> = {}

  const visibleModules = rawModules
    .filter(isModuleAllowed)
    .map((module) => {
      const screens = module.app_screens.map((screen) => {
        const allowed = isScreenAllowed(module.code, screen)
        screensByRoute[screen.route] = allowed

        if (screen.screen_buttons.length > 0) {
          buttonsByScreen[screen.code] = Object.fromEntries(
            screen.screen_buttons.map((link) => [
              link.permission_buttons.code,
              link.permissions.name,
            ])
          )
        }
        return { screen, allowed }
      })

      return {
        code: module.code,
        name: module.name,
        sortOrder: module.sort_order,
        screens: screens
          .filter((entry) => entry.allowed)
          .map(({ screen }) => ({
            code: screen.code,
            name: screen.name,
            route: screen.route,
            icon: screen.icon,
            sortOrder: screen.sort_order,
          })),
      }
    })
    .filter((module) => module.screens.length > 0)

  return {
    modules: visibleModules,
    screens: screensByRoute,
    buttons: buttonsByScreen,
  }
}
