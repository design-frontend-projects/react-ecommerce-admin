import prisma from '@/lib/prisma'
import type { AppSetting, UpsertSettingInput } from './schema'

/**
 * Fetch all settings for a given clerk user.
 * If `publicOnly` is true, only returns settings marked as public.
 */
export async function getSettings(
  clerkUserId: string,
  publicOnly = false
): Promise<AppSetting[]> {
  const where: Record<string, unknown> = { clerk_user_id: clerkUserId }
  if (publicOnly) {
    where.is_public = true
  }

  const settings = await prisma.app_settings.findMany({
    where,
    orderBy: { key: 'asc' },
  })

  return settings.map((s) => ({
    id: s.id,
    key: s.key,
    value: s.value,
    group: s.group,
    is_public: s.is_public,
    clerk_user_id: s.clerk_user_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }))
}

/**
 * Fetch a single setting by key for a given clerk user.
 */
export async function getSettingByKey(
  clerkUserId: string,
  key: string
): Promise<AppSetting | null> {
  const setting = await prisma.app_settings.findUnique({
    where: {
      clerk_user_id_key: { clerk_user_id: clerkUserId, key },
    },
  })

  if (!setting) return null

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    group: setting.group,
    is_public: setting.is_public,
    clerk_user_id: setting.clerk_user_id,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  }
}

/**
 * Upsert a setting (create or update) for a given clerk user.
 */
export async function upsertSetting(
  clerkUserId: string,
  input: UpsertSettingInput
): Promise<AppSetting> {
  const setting = await prisma.app_settings.upsert({
    where: {
      clerk_user_id_key: { clerk_user_id: clerkUserId, key: input.key },
    },
    create: {
      key: input.key,
      value: input.value,
      group: input.group ?? null,
      is_public: input.is_public ?? true,
      clerk_user_id: clerkUserId,
    },
    update: {
      value: input.value,
      group: input.group ?? undefined,
      is_public: input.is_public,
      updated_at: new Date(),
    },
  })

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    group: setting.group,
    is_public: setting.is_public,
    clerk_user_id: setting.clerk_user_id,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  }
}

/**
 * Delete a setting by key for a given clerk user.
 */
export async function deleteSetting(
  clerkUserId: string,
  key: string
): Promise<void> {
  await prisma.app_settings.delete({
    where: {
      clerk_user_id_key: { clerk_user_id: clerkUserId, key },
    },
  })
}

/**
 * Initialize default settings for a new tenant if they don't exist.
 */
export async function initializeDefaultSettings(
  clerkUserId: string,
  defaults: Array<UpsertSettingInput>
): Promise<void> {
  for (const setting of defaults) {
    const existing = await prisma.app_settings.findUnique({
      where: {
        clerk_user_id_key: { clerk_user_id: clerkUserId, key: setting.key },
      },
    })

    if (!existing) {
      await prisma.app_settings.create({
        data: {
          key: setting.key,
          value: setting.value,
          group: setting.group ?? null,
          is_public: setting.is_public ?? true,
          clerk_user_id: clerkUserId,
        },
      })
    }
  }
}
