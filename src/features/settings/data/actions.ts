import prisma from '@/lib/prisma'
import type { AppSetting, UpsertSettingInput } from './schema'

/**
 * Fetch all settings for a given Tenant.
 * If `publicOnly` is true, only returns settings marked as public.
 */
export async function getSettings(
  tenantId: string,
  publicOnly = false
): Promise<AppSetting[]> {
  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (publicOnly) {
    where.is_public = true
  }

  const settings = await prisma.app_settings.findMany({
    where,
    orderBy: { key: 'asc' },
  })

  return settings.map((s: any) => ({
    id: s.id,
    key: s.key,
    value: s.value,
    group: s.group,
    is_public: s.is_public,
    tenant_id: s.tenant_id,
    created_by_user_id: s.created_by_user_id,
    updated_by_user_id: s.updated_by_user_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }))
}

/**
 * Fetch a single setting by key for a given Tenant.
 */
export async function getSettingByKey(
  tenantId: string,
  key: string
): Promise<AppSetting | null> {
  const setting = await prisma.app_settings.findUnique({
    where: {
      tenant_id_key: { tenant_id: tenantId, key },
    },
  })

  if (!setting) return null

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    group: setting.group,
    is_public: setting.is_public,
    tenant_id: setting.tenant_id,
    created_by_user_id: setting.created_by_user_id,
    updated_by_user_id: setting.updated_by_user_id,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  }
}

/**
 * Upsert a setting (create or update) for a given Tenant.
 */
export async function upsertSetting(
  tenantId: string,
  input: UpsertSettingInput,
  actorUserId?: string
): Promise<AppSetting> {
  const setting = await prisma.app_settings.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: input.key },
    },
    create: {
      key: input.key,
      value: input.value,
      group: input.group ?? null,
      is_public: input.is_public ?? true,
      tenant_id: tenantId,
      created_by_user_id: actorUserId ?? null,
      updated_by_user_id: actorUserId ?? null,
    },
    update: {
      value: input.value,
      group: input.group ?? undefined,
      is_public: input.is_public,
      updated_by_user_id: actorUserId ?? null,
      updated_at: new Date(),
    },
  })

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    group: setting.group,
    is_public: setting.is_public,
    tenant_id: setting.tenant_id,
    created_by_user_id: setting.created_by_user_id,
    updated_by_user_id: setting.updated_by_user_id,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  }
}

/**
 * Delete a setting by key for a given Tenant.
 */
export async function deleteSetting(
  tenantId: string,
  key: string
): Promise<void> {
  await prisma.app_settings.delete({
    where: {
      tenant_id_key: { tenant_id: tenantId, key },
    },
  })
}

/**
 * Initialize default settings for a new tenant if they don't exist.
 */
export async function initializeDefaultSettings(
  tenantId: string,
  defaults: Array<UpsertSettingInput>,
  actorUserId?: string
): Promise<void> {
  for (const setting of defaults) {
    const existing = await prisma.app_settings.findUnique({
      where: {
        tenant_id_key: { tenant_id: tenantId, key: setting.key },
      },
    })

    if (!existing) {
      await prisma.app_settings.create({
        data: {
          key: setting.key,
          value: setting.value,
          group: setting.group ?? null,
          is_public: setting.is_public ?? true,
          tenant_id: tenantId,
          created_by_user_id: actorUserId ?? null,
          updated_by_user_id: actorUserId ?? null,
        },
      })
    }
  }
}
