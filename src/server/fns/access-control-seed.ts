import prisma from '@/lib/prisma'
import {
  ACTIVITY_TYPE_SEEDS,
  BUTTON_SEEDS,
  MODULE_SEEDS,
  SCREEN_BUTTON_SEEDS,
  SCREEN_SEEDS,
  SEED_VERSION,
} from '@/features/access-control/data/seed-data'
import { ensureBasePermissionsSeeded } from './rbac'

const SEED_SETTING_KEY = 'rbac_seed_version'
// Nil UUID marker for system-authored settings rows (app_settings.auth_user_id is NOT NULL).
const SYSTEM_AUTH_USER_ID = '00000000-0000-0000-0000-000000000000'

async function isCurrentSeedVersion(): Promise<boolean> {
  const row = await prisma.app_settings.findFirst({
    where: { key: SEED_SETTING_KEY },
  })
  if (!row) return false
  const value = typeof row.value === 'string' ? row.value : String(row.value)
  return value === SEED_VERSION
}

async function markSeedVersion(): Promise<void> {
  const row = await prisma.app_settings.findFirst({
    where: { key: SEED_SETTING_KEY },
  })
  if (row) {
    await prisma.app_settings.update({
      where: { id: row.id },
      data: { value: SEED_VERSION, updated_at: new Date() },
    })
    return
  }
  await prisma.app_settings.create({
    data: {
      key: SEED_SETTING_KEY,
      value: SEED_VERSION,
      group: 'rbac',
      is_public: false,
      auth_user_id: SYSTEM_AUTH_USER_ID,
    },
  })
}

function generatedButtonPermissionName(screenCode: string, buttonCode: string) {
  return `${screenCode}.${buttonCode}`
}

/**
 * Lazily seed the screen/module registry, permission buttons, and business activity
 * types. Idempotent: catalog rows are always upserted; mapping rows (screen_roles,
 * screen_permissions, screen_buttons, role grants) are only created when the parent
 * has none — admin customisations are never overwritten. Guarded by an `app_settings`
 * version key so steady-state catalog reads short-circuit.
 *
 * Sibling of `ensureBasePermissionsSeeded()` — which it calls first so base roles and
 * permissions exist before screen mappings reference them.
 */
export async function ensureAccessControlSeeded(): Promise<void> {
  if (await isCurrentSeedVersion()) return

  await ensureBasePermissionsSeeded()

  // 1. Activity types
  await Promise.all(
    ACTIVITY_TYPE_SEEDS.map((activity) =>
      prisma.business_activity_types.upsert({
        where: { code: activity.code },
        update: { name: activity.name, description: activity.description, updated_at: new Date() },
        create: { code: activity.code, name: activity.name, description: activity.description },
      })
    )
  )
  const activityTypes = (await prisma.business_activity_types.findMany({
    select: { id: true, code: true },
  })) as Array<{ id: string; code: string }>
  const activityIdByCode = new Map(activityTypes.map((a) => [a.code, a.id]))

  // 2. Modules + module_activity_types
  await Promise.all(
    MODULE_SEEDS.map((module) =>
      prisma.app_modules.upsert({
        where: { code: module.code },
        update: {
          name: module.name,
          description: module.description,
          sort_order: module.sortOrder,
          updated_at: new Date(),
        },
        create: {
          code: module.code,
          name: module.name,
          description: module.description,
          sort_order: module.sortOrder,
        },
      })
    )
  )
  const modules = (await prisma.app_modules.findMany({
    select: { id: true, code: true, module_activity_types: { select: { activity_type_id: true } } },
  })) as Array<{ id: string; code: string; module_activity_types: Array<{ activity_type_id: string }> }>
  const moduleIdByCode = new Map(modules.map((m) => [m.code, m.id]))

  for (const module of modules) {
    const seed = MODULE_SEEDS.find((m) => m.code === module.code)
    if (!seed || seed.activityTypeCodes.length === 0) continue
    if (module.module_activity_types.length > 0) continue // mappings only when empty
    const data = seed.activityTypeCodes
      .map((code) => activityIdByCode.get(code))
      .filter((id): id is string => Boolean(id))
      .map((activityTypeId) => ({ module_id: module.id, activity_type_id: activityTypeId }))
    if (data.length > 0) {
      await prisma.module_activity_types.createMany({ data, skipDuplicates: true })
    }
  }

  // 3. Buttons
  await Promise.all(
    BUTTON_SEEDS.map((button) =>
      prisma.permission_buttons.upsert({
        where: { code: button.code },
        update: { name: button.name, description: button.description, updated_at: new Date() },
        create: { code: button.code, name: button.name, description: button.description, is_system: true },
      })
    )
  )
  const buttons = (await prisma.permission_buttons.findMany({
    select: { id: true, code: true },
  })) as Array<{ id: string; code: string }>
  const buttonIdByCode = new Map(buttons.map((b) => [b.code, b.id]))

  // 4. Screens (catalog upsert; is_system locked)
  for (const screen of SCREEN_SEEDS) {
    const moduleId = moduleIdByCode.get(screen.moduleCode)
    if (!moduleId) continue
    await prisma.app_screens.upsert({
      where: { code: screen.code },
      update: {
        name: screen.name,
        route: screen.route,
        description: screen.description ?? null,
        icon: screen.icon ?? null,
        module_id: moduleId,
        is_system: true,
        updated_at: new Date(),
      },
      create: {
        code: screen.code,
        name: screen.name,
        route: screen.route,
        description: screen.description ?? null,
        icon: screen.icon ?? null,
        module_id: moduleId,
        is_system: true,
      },
    })
  }

  // Resolve role and permission id maps once for the mapping steps.
  const roles = (await prisma.roles.findMany({
    select: { id: true, name: true },
  })) as Array<{ id: string; name: string }>
  const roleIdByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]))
  const permissions = (await prisma.permissions.findMany({
    select: { id: true, name: true },
  })) as Array<{ id: string; name: string }>
  const permissionIdByName = new Map(permissions.map((p) => [p.name, p.id]))

  type ScreenRecord = {
    id: string
    code: string
    screen_roles: Array<{ role_id: string }>
    screen_permissions: Array<{ permission_id: string }>
    screen_buttons: Array<{ button_id: string }>
  }
  const screens = (await prisma.app_screens.findMany({
    select: {
      id: true,
      code: true,
      screen_roles: { select: { role_id: true } },
      screen_permissions: { select: { permission_id: true } },
      screen_buttons: { select: { button_id: true } },
    },
  })) as ScreenRecord[]
  const screenByCode = new Map<string, ScreenRecord>(screens.map((s) => [s.code, s]))

  // 5. Default screen_roles + screen_permissions (only when the screen has none).
  for (const screen of SCREEN_SEEDS) {
    const record = screenByCode.get(screen.code)
    if (!record) continue

    if (record.screen_roles.length === 0 && screen.roles.length > 0) {
      const roleData = screen.roles
        .map((name) => roleIdByName.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id))
        .map((roleId) => ({ screen_id: record.id, role_id: roleId }))
      if (roleData.length > 0) {
        await prisma.screen_roles.createMany({ data: roleData, skipDuplicates: true })
      }
    }

    if (record.screen_permissions.length === 0 && screen.permissions.length > 0) {
      const permData = screen.permissions
        .map((name) => permissionIdByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ screen_id: record.id, permission_id: permissionId }))
      if (permData.length > 0) {
        await prisma.screen_permissions.createMany({ data: permData, skipDuplicates: true })
      }
    }
  }

  // 6. Default screen_buttons (only when the screen has no buttons yet). Each mapping
  //    upserts its generated `<screen>.<button>` permission and grants it to the roles.
  for (const seed of SCREEN_BUTTON_SEEDS) {
    const record = screenByCode.get(seed.screenCode)
    const buttonId = buttonIdByCode.get(seed.buttonCode)
    if (!record || !buttonId) continue
    if (record.screen_buttons.length > 0) continue // mappings only when empty

    const permissionName = generatedButtonPermissionName(seed.screenCode, seed.buttonCode)
    const permission = await prisma.permissions.upsert({
      where: { name: permissionName },
      update: { resource: seed.screenCode, action: seed.buttonCode, updated_at: new Date() },
      create: {
        name: permissionName,
        description: `${seed.buttonCode} on the ${seed.screenCode} screen`,
        resource: seed.screenCode,
        action: seed.buttonCode,
      },
    })

    await prisma.screen_buttons.upsert({
      where: { screen_id_button_id: { screen_id: record.id, button_id: buttonId } },
      update: { permission_id: permission.id, is_active: true, updated_at: new Date() },
      create: { screen_id: record.id, button_id: buttonId, permission_id: permission.id },
    })

    const grantData = seed.roles
      .map((name) => roleIdByName.get(name.toLowerCase()))
      .filter((id): id is string => Boolean(id))
      .map((roleId) => ({ role_id: roleId, permission_id: permission.id }))
    if (grantData.length > 0) {
      await prisma.role_permissions.createMany({ data: grantData, skipDuplicates: true })
    }
  }

  await markSeedVersion()
}
