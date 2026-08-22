'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateLookupValueInput {
  code: string
  name: string
  nameAr?: string | null
  description?: string | null
  color?: string | null
  icon?: string | null
  metadata?: Record<string, unknown> | null
  isDefault?: boolean
  sortOrder?: number
}

export type UpdateLookupValueInput = Partial<CreateLookupValueInput> & {
  isActive?: boolean
}

function assertRequiredText(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(message, 400)
  }
}

/**
 * List all registered lookup types with counts of available values
 */
export async function listLookupTypes(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const types = await prisma.lookup_types.findMany({
    where: { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    include: {
      lookup_values: {
        where: {
          OR: [
            { tenant_id: tenantId },
            { tenant_id: null },
          ],
          is_active: true,
        },
        select: { id: true, is_system: true, tenant_id: true },
      },
    },
  })

  return types.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    description: t.description,
    is_system: t.is_system,
    is_active: t.is_active,
    sort_order: t.sort_order,
    values_count: t.lookup_values.length,
    custom_count: t.lookup_values.filter((v) => v.tenant_id === tenantId).length,
    system_count: t.lookup_values.filter((v) => v.tenant_id === null).length,
  }))
}

/**
 * List values for a specific lookup type in Union Mode (Tenant values + Global System defaults)
 */
export async function listLookupValues(
  authUserId: string,
  typeCode: string,
  includeInactive = false
) {
  const tenantId = await requireTenantId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  const values = await prisma.lookup_values.findMany({
    where: {
      lookup_type_id: lookupType.id,
      OR: [
        { tenant_id: tenantId },
        { tenant_id: null },
      ],
      ...(includeInactive ? {} : { is_active: true }),
    },
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
  })

  return {
    lookupType: {
      id: lookupType.id,
      code: lookupType.code,
      name: lookupType.name,
      description: lookupType.description,
      is_system: lookupType.is_system,
    },
    values: values.map((v) => ({
      id: v.id,
      lookup_type_id: v.lookup_type_id,
      tenant_id: v.tenant_id,
      code: v.code,
      name: v.name,
      name_ar: v.name_ar,
      description: v.description,
      color: v.color,
      icon: v.icon,
      metadata: v.metadata,
      is_default: v.is_default,
      is_system: v.is_system || v.tenant_id === null,
      is_active: v.is_active,
      is_tenant_custom: v.tenant_id === tenantId,
      sort_order: v.sort_order,
      created_at: v.created_at,
      updated_at: v.updated_at,
    })),
  }
}

/**
 * Create a new tenant-specific lookup value
 */
export async function createLookupValue(
  authUserId: string,
  typeCode: string,
  input: CreateLookupValueInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  assertRequiredText(input.code, 'A code is required.')
  assertRequiredText(input.name, 'A display name is required.')

  const normalizedCode = input.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

  // Check code uniqueness within this tenant & lookup type
  const duplicate = await prisma.lookup_values.findFirst({
    where: {
      lookup_type_id: lookupType.id,
      tenant_id: tenantId,
      code: normalizedCode,
    },
  })

  if (duplicate) {
    throw new ApiError(
      `A lookup value with code '${normalizedCode}' already exists in your account.`,
      409
    )
  }

  // If set as default, unset other defaults for this tenant
  if (input.isDefault) {
    await prisma.lookup_values.updateMany({
      where: { lookup_type_id: lookupType.id, tenant_id: tenantId },
      data: { is_default: false },
    })
  }

  return prisma.lookup_values.create({
    data: {
      lookup_type_id: lookupType.id,
      tenant_id: tenantId,
      code: normalizedCode,
      name: input.name.trim(),
      name_ar: input.nameAr?.trim() || null,
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      icon: input.icon?.trim() || null,
      metadata: input.metadata ? (input.metadata as any) : {},
      is_default: input.isDefault ?? false,
      is_system: false,
      is_active: true,
      sort_order: input.sortOrder ?? 0,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })
}

/**
 * Update an existing lookup value
 */
export async function updateLookupValue(
  authUserId: string,
  id: string,
  input: UpdateLookupValueInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  // If it's a global system record (tenant_id == null), tenant can only clone or customize non-destructive flags
  if (existing.tenant_id === null) {
    if (input.code !== undefined && input.code !== existing.code) {
      throw new ApiError('System default codes cannot be modified.', 403)
    }
  } else if (existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (input.name !== undefined) {
    assertRequiredText(input.name, 'A display name is required.')
  }

  if (input.isDefault && existing.tenant_id === tenantId) {
    await prisma.lookup_values.updateMany({
      where: { lookup_type_id: existing.lookup_type_id, tenant_id: tenantId },
      data: { is_default: false },
    })
  }

  const data: any = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.nameAr !== undefined ? { name_ar: input.nameAr?.trim() || null } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.color !== undefined ? { color: input.color?.trim() || null } : {}),
    ...(input.icon !== undefined ? { icon: input.icon?.trim() || null } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
    updated_by_user_id: tenantUserId,
  }

  return prisma.lookup_values.update({
    where: { id },
    data,
  })
}

/**
 * Soft delete / deactivate lookup value (or hard delete if custom and unreferenced)
 */
export async function deleteLookupValue(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (existing.tenant_id === null || existing.is_system) {
    throw new ApiError(
      'System default values cannot be deleted. You can deactivate them instead.',
      403
    )
  }

  if (existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  // Soft delete / deactivate by default to preserve historical integrity
  return prisma.lookup_values.update({
    where: { id },
    data: { is_active: false },
  })
}

/**
 * Toggle active status
 */
export async function toggleLookupValueActive(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.lookup_values.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new ApiError('Lookup value not found.', 404)
  }

  if (existing.tenant_id !== null && existing.tenant_id !== tenantId) {
    throw new ApiError('Lookup value not found.', 404)
  }

  return prisma.lookup_values.update({
    where: { id },
    data: {
      is_active: !existing.is_active,
      updated_by_user_id: tenantUserId,
    },
  })
}

/**
 * Batch reorder values within a lookup type
 */
export async function reorderLookupValues(
  authUserId: string,
  typeCode: string,
  orderedIds: string[]
) {
  const tenantId = await requireTenantId(authUserId)

  const lookupType = await prisma.lookup_types.findUnique({
    where: { code: typeCode },
  })

  if (!lookupType) {
    throw new ApiError(`Lookup type '${typeCode}' not found.`, 404)
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lookup_values.updateMany({
        where: {
          id,
          lookup_type_id: lookupType.id,
          OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        },
        data: { sort_order: index + 1 },
      })
    )
  )

  return { success: true }
}
