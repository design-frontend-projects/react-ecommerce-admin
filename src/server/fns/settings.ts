'use server'

import { createServerFn } from '@tanstack/react-start'
import type { z } from 'zod'
import prisma from '@/lib/prisma'
import {
  getSettings,
  getSettingByKey,
  upsertSetting,
  deleteSetting,
} from '@/features/settings/data/actions'
import { withServerFnAuth } from '@/server/utils/with-server-fn-auth'
import type { UpsertSettingSchema } from '@/features/settings/data/schema'

export interface GetSettingsParams {
  publicOnly?: boolean
}

export interface SettingKeyParams {
  key: string
}

export interface SettingGroupParams {
  group: string
}

/**
 * Fetch all settings for the caller's active tenant.
 */
export const getTenantSettingsServerFn = createServerFn({ method: 'GET' })
  .validator((params: GetSettingsParams = {}) => params)
  .handler(
    withServerFnAuth(
      { resourceType: 'app_settings', actionName: 'read' },
      async (params, ctx) => {
        return getSettings(ctx.tenantId, params?.publicOnly ?? false)
      }
    )
  )

/**
 * Fetch a single setting by key for the caller's active tenant.
 */
export const getSettingByKeyServerFn = createServerFn({ method: 'GET' })
  .validator((params: SettingKeyParams) => params)
  .handler(
    withServerFnAuth(
      { resourceType: 'app_settings', actionName: 'read' },
      async (params, ctx) => {
        return getSettingByKey(ctx.tenantId, params.key)
      }
    )
  )

/**
 * Fetch settings by group for the caller's active tenant.
 */
export const getSettingsByGroupServerFn = createServerFn({ method: 'GET' })
  .validator((params: SettingGroupParams) => params)
  .handler(
    withServerFnAuth(
      { resourceType: 'app_settings', actionName: 'read' },
      async (params, ctx) => {
        const settings = await prisma.app_settings.findMany({
          where: {
            tenant_id: ctx.tenantId,
            group: params.group,
          },
          orderBy: { key: 'asc' },
        })

        return settings.map((s) => ({
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
    )
  )

/**
 * Upsert a setting for the caller's active tenant.
 * Uses Prisma unique constraint @@unique([tenant_id, key]).
 */
export const upsertSettingServerFn = createServerFn({ method: 'POST' })
  .validator(
    (
      input: z.infer<typeof UpsertSettingSchema> & {
        tenant_id?: string
      }
    ) => input
  )
  .handler(
    withServerFnAuth(
      { resourceType: 'app_settings', actionName: 'write' },
      async (input, ctx) => {
        const targetTenantId = input.tenant_id || ctx.tenantId
        const actorUserId = ctx.tenantUserId || ctx.user.userId
        return upsertSetting(targetTenantId, input, actorUserId)
      }
    )
  )

/**
 * Delete a setting by key for the caller's active tenant.
 */
export const deleteSettingServerFn = createServerFn({ method: 'POST' })
  .validator((params: SettingKeyParams) => params)
  .handler(
    withServerFnAuth(
      { resourceType: 'app_settings', actionName: 'delete' },
      async (params, ctx) => {
        return deleteSetting(ctx.tenantId, params.key)
      }
    )
  )
