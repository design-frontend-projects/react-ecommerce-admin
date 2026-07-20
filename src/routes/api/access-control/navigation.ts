import { createFileRoute } from '@tanstack/react-router'
import { ensureAccessControlSeeded } from '@/server/fns/access-control-seed'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { hasAnyPermission, normalizeRoleName } from '@/features/users/data/rbac'

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

interface ModuleRow {
  id: string
  code: string
  name: string
  sort_order: number
  app_screens: ScreenRow[]
}

/**
 * Navigation catalog for the signed-in user: active modules and screens from
 * the access-control catalog, with per-screen visibility resolved
 * SERVER-SIDE against the caller's roles/permissions. Screens with no
 * linked roles/permissions are visible to any authenticated user (matches
 * the seed model). The `screens` map (route -> allowed) covers ALL active
 * screens — including denied ones — so the client route guard can
 * distinguish "denied" from "not in catalog".
 */
const GET = withAuth(null, async ({ auth }) => {
  await ensureAccessControlSeeded()

  const [modules, ownerProfile] = await Promise.all([
    prisma.app_modules.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        sort_order: true,
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
    prisma.profiles.findFirst({
      where: { auth_user_id: auth.userId },
      select: { system_owner: true },
    }) as Promise<{ system_owner: boolean | null } | null>,
  ])

  const isSystemOwner = ownerProfile?.system_owner === true
  const callerRoleNames = auth.roleNames.map(normalizeRoleName)

  const isScreenAllowed = (moduleCode: string, screen: ScreenRow): boolean => {
    // The platform-admin module is reserved for system owners regardless of
    // catalog links.
    if (moduleCode === 'system' && !isSystemOwner) return false

    const roleLinks = screen.screen_roles.map((link) =>
      normalizeRoleName(link.roles.name)
    )
    const permissionLinks = screen.screen_permissions.map(
      (link) => link.permissions.name
    )

    if (roleLinks.length === 0 && permissionLinks.length === 0) return true
    if (roleLinks.some((name) => callerRoleNames.includes(name))) return true
    return hasAnyPermission(auth.permissionNames, permissionLinks)
  }

  const screensByRoute: Record<string, boolean> = {}
  // screen code -> button code -> required permission name (from the
  // screen_buttons catalog), consumed by the CanAction component.
  const buttonsByScreen: Record<string, Record<string, string>> = {}
  const visibleModules = modules
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

  return Response.json({
    success: true,
    data: {
      modules: visibleModules,
      screens: screensByRoute,
      buttons: buttonsByScreen,
    },
  })
})

export const Route = createFileRoute('/api/access-control/navigation')({
  server: {
    handlers: {
      GET,
    },
  },
})
