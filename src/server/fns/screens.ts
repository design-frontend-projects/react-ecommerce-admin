import prisma from '@/lib/prisma'
import { ensureAccessControlSeeded } from './access-control-seed'

const SCREEN_CODE_PATTERN = /^[a-z0-9_]+$/

export interface ScreenButtonDto {
  buttonId: string
  code: string
  permissionId: string
  permissionName: string
  isActive: boolean
}

export interface ScreenDto {
  id: string
  code: string
  name: string
  route: string
  description: string | null
  icon: string | null
  isSystem: boolean
  isActive: boolean
  sortOrder: number
  roleIds: string[]
  permissionIds: string[]
  buttons: ScreenButtonDto[]
}

export interface ModuleWithScreensDto {
  id: string
  code: string
  name: string
  sortOrder: number
  activityTypeCodes: string[]
  screens: ScreenDto[]
}

export interface CreateScreenInput {
  code: string
  name: string
  route: string
  description?: string | null
  icon?: string | null
  moduleId: string
  sortOrder?: number
}

export interface UpdateScreenInput {
  name?: string
  route?: string
  code?: string
  description?: string | null
  icon?: string | null
  moduleId?: string
  sortOrder?: number
  isActive?: boolean
}

type ModuleRow = {
  id: string
  code: string
  name: string
  sort_order: number
  module_activity_types: Array<{ business_activity_types: { code: string } }>
  app_screens: Array<{
    id: string
    code: string
    name: string
    route: string
    description: string | null
    icon: string | null
    is_system: boolean
    is_active: boolean
    sort_order: number
    screen_roles: Array<{ role_id: string }>
    screen_permissions: Array<{ permission_id: string }>
    screen_buttons: Array<{
      button_id: string
      permission_id: string
      is_active: boolean
      permission_buttons: { code: string }
      permissions: { name: string }
    }>
  }>
}

export async function getScreensWithAccess(): Promise<{ modules: ModuleWithScreensDto[] }> {
  await ensureAccessControlSeeded()

  const modules = (await prisma.app_modules.findMany({
    orderBy: { sort_order: 'asc' },
    include: {
      module_activity_types: {
        include: { business_activity_types: { select: { code: true } } },
      },
      app_screens: {
        orderBy: { sort_order: 'asc' },
        include: {
          screen_roles: { select: { role_id: true } },
          screen_permissions: { select: { permission_id: true } },
          screen_buttons: {
            include: {
              permission_buttons: { select: { code: true } },
              permissions: { select: { name: true } },
            },
          },
        },
      },
    },
  })) as ModuleRow[]

  return {
    modules: modules.map((module) => ({
      id: module.id,
      code: module.code,
      name: module.name,
      sortOrder: module.sort_order,
      activityTypeCodes: module.module_activity_types.map(
        (link) => link.business_activity_types.code
      ),
      screens: module.app_screens.map((screen) => ({
        id: screen.id,
        code: screen.code,
        name: screen.name,
        route: screen.route,
        description: screen.description,
        icon: screen.icon,
        isSystem: screen.is_system,
        isActive: screen.is_active,
        sortOrder: screen.sort_order,
        roleIds: screen.screen_roles.map((link) => link.role_id),
        permissionIds: screen.screen_permissions.map((link) => link.permission_id),
        buttons: screen.screen_buttons.map((link) => ({
          buttonId: link.button_id,
          code: link.permission_buttons.code,
          permissionId: link.permission_id,
          permissionName: link.permissions.name,
          isActive: link.is_active,
        })),
      })),
    })),
  }
}

export async function createScreen(input: CreateScreenInput) {
  const code = input.code.trim().toLowerCase()
  if (!SCREEN_CODE_PATTERN.test(code)) {
    throw new Error('Screen code must be snake_case with no dots (matches the permission resource segment).')
  }

  const route = input.route.trim()
  const [codeClash, routeClash] = await Promise.all([
    prisma.app_screens.findUnique({ where: { code } }),
    prisma.app_screens.findUnique({ where: { route } }),
  ])
  if (codeClash) throw new Error(`A screen with code "${code}" already exists.`)
  if (routeClash) throw new Error(`A screen with route "${route}" already exists.`)

  return prisma.app_screens.create({
    data: {
      code,
      name: input.name.trim(),
      route,
      description: input.description ?? null,
      icon: input.icon ?? null,
      module_id: input.moduleId,
      sort_order: input.sortOrder ?? 0,
      is_system: false,
    },
  })
}

export async function updateScreen(id: string, input: UpdateScreenInput) {
  const screen = (await prisma.app_screens.findUnique({
    where: { id },
  })) as { id: string; is_system: boolean } | null
  if (!screen) throw new Error('Screen not found.')

  // System screens: code and route are locked; only descriptive fields are mutable.
  const data: Record<string, unknown> = { updated_at: new Date() }
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.description !== undefined) data.description = input.description
  if (input.icon !== undefined) data.icon = input.icon
  if (input.sortOrder !== undefined) data.sort_order = input.sortOrder
  if (input.isActive !== undefined) data.is_active = input.isActive
  if (input.moduleId !== undefined) data.module_id = input.moduleId

  if (!screen.is_system) {
    if (input.code !== undefined) {
      const code = input.code.trim().toLowerCase()
      if (!SCREEN_CODE_PATTERN.test(code)) {
        throw new Error('Screen code must be snake_case with no dots.')
      }
      data.code = code
    }
    if (input.route !== undefined) data.route = input.route.trim()
  }

  return prisma.app_screens.update({ where: { id }, data })
}

export async function deleteScreen(id: string) {
  const screen = (await prisma.app_screens.findUnique({
    where: { id },
  })) as { is_system: boolean } | null
  if (!screen) throw new Error('Screen not found.')
  if (screen.is_system) throw new Error('System screens cannot be deleted.')

  await prisma.app_screens.delete({ where: { id } })
  return { success: true }
}

export async function setScreenRoles(screenId: string, roleIds: string[]) {
  await prisma.screen_roles.deleteMany({ where: { screen_id: screenId } })
  if (roleIds.length > 0) {
    await prisma.screen_roles.createMany({
      data: roleIds.map((roleId) => ({ screen_id: screenId, role_id: roleId })),
      skipDuplicates: true,
    })
  }
  return { success: true }
}

export async function setScreenPermissions(screenId: string, permissionIds: string[]) {
  await prisma.screen_permissions.deleteMany({ where: { screen_id: screenId } })
  if (permissionIds.length > 0) {
    await prisma.screen_permissions.createMany({
      data: permissionIds.map((permissionId) => ({
        screen_id: screenId,
        permission_id: permissionId,
      })),
      skipDuplicates: true,
    })
  }
  return { success: true }
}
