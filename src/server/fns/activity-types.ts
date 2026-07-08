"use server"

import prisma from '@/lib/prisma'
import { ensureAccessControlSeeded } from './access-control-seed'

export interface TenantActivityTypesResult {
  activityTypeCodes: string[]
  /** Global module→activity map. Modules absent from the map are activity-agnostic. */
  moduleActivityMap: Record<string, string[]>
}

/** user_module enum values that mirror activity-type codes. */
const MODULE_ACTIVITY_CODES = ['inventory', 'restaurant'] as const

async function resolveTenantId(authUserId: string): Promise<string | null> {
  const tenantUser = (await prisma.tenant_users.findUnique({
    where: { auth_user_id: authUserId },
    select: { parent_tenant_id: true },
  })) as { parent_tenant_id: string | null } | null
  if (tenantUser?.parent_tenant_id) return tenantUser.parent_tenant_id

  const subscription = (await prisma.tenant_subscriptions.findFirst({
    where: { auth_user_id: authUserId },
    select: { id: true },
  })) as { id: string } | null
  return subscription?.id ?? null
}

async function getModuleActivityMap(): Promise<Record<string, string[]>> {
  const modules = (await prisma.app_modules.findMany({
    include: {
      module_activity_types: {
        include: { business_activity_types: { select: { code: true } } },
      },
    },
  })) as Array<{
    code: string
    module_activity_types: Array<{ business_activity_types: { code: string } }>
  }>

  const map: Record<string, string[]> = {}
  for (const module of modules) {
    if (module.module_activity_types.length > 0) {
      map[module.code] = module.module_activity_types.map(
        (link) => link.business_activity_types.code
      )
    }
  }
  return map
}

async function getActiveActivityCodes(tenantId: string): Promise<string[]> {
  const rows = (await prisma.tenant_activity_types.findMany({
    where: { tenant_id: tenantId, is_active: true },
    include: { business_activity_types: { select: { code: true } } },
  })) as Array<{ business_activity_types: { code: string } }>
  return rows.map((row) => row.business_activity_types.code)
}

export async function getTenantActivityTypes(
  authUserId: string
): Promise<TenantActivityTypesResult> {
  await ensureAccessControlSeeded()

  const tenantId = await resolveTenantId(authUserId)
  const moduleActivityMap = await getModuleActivityMap()
  const activityTypeCodes = tenantId ? await getActiveActivityCodes(tenantId) : []

  return { activityTypeCodes, moduleActivityMap }
}

/**
 * Replace the tenant's activity types and refresh the derived `tenant_users.modules`
 * mirrors for all of the tenant's users.
 */
export async function setTenantActivityTypes(
  authUserId: string,
  activityTypeCodes: string[]
): Promise<TenantActivityTypesResult> {
  await ensureAccessControlSeeded()

  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId) {
    throw new Error('Unable to resolve the caller tenant.')
  }

  const requestedCodes = [...new Set(activityTypeCodes.map((code) => code.trim()).filter(Boolean))]
  const activityTypes = (await prisma.business_activity_types.findMany({
    where: { code: { in: requestedCodes } },
    select: { id: true, code: true },
  })) as Array<{ id: string; code: string }>

  // Replace tenant_activity_types (delete-then-createMany).
  await prisma.tenant_activity_types.deleteMany({ where: { tenant_id: tenantId } })
  if (activityTypes.length > 0) {
    await prisma.tenant_activity_types.createMany({
      data: activityTypes.map((activity) => ({
        tenant_id: tenantId,
        activity_type_id: activity.id,
        is_active: true,
      })),
      skipDuplicates: true,
    })
  }

  // Refresh the legacy per-user module mirrors (kept as derived data).
  const moduleValues = activityTypes
    .map((activity) => activity.code)
    .filter((code): code is (typeof MODULE_ACTIVITY_CODES)[number] =>
      (MODULE_ACTIVITY_CODES as readonly string[]).includes(code)
    )
  await prisma.tenant_users.updateMany({
    where: { parent_tenant_id: tenantId },
    data: {
      modules: moduleValues,
      primary_module: moduleValues[0] ?? null,
      updated_at: new Date(),
    },
  })

  return {
    activityTypeCodes: activityTypes.map((activity) => activity.code),
    moduleActivityMap: await getModuleActivityMap(),
  }
}
