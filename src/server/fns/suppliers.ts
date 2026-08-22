'use server'

import { ApiError } from '@/server/utils/api-error'
import {
  resolveTenantId,
  requireTenantId,
  resolveTenantUserId,
  isValidUuid,
} from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateSupplierInput {
  name: string
  code?: string | null
  supplierCategoryId?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  taxNumber?: string | null
  paymentTermsDays?: number
  address?: string | null
  website?: string | null
  notes?: string | null
  isActive?: boolean
  cityId?: string | null
  isPreferred?: boolean
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>

function assertName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError('A supplier name is required.', 400)
  }
}

export async function listSuppliers(authUserId: string) {
  const tenantId = await resolveTenantId(authUserId)
  if (!tenantId || !isValidUuid(tenantId)) {
    return []
  }

  return prisma.suppliers.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: true,
          purchase_orders: true,
        },
      },
    },
  })
}

export async function getSupplier(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  if (!isValidUuid(id)) {
    throw new ApiError('Invalid supplier id.', 400)
  }

  const supplier = await prisma.suppliers.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!supplier) {
    throw new ApiError('Supplier not found.', 404)
  }
  return supplier
}

export async function createSupplier(
  authUserId: string,
  input: CreateSupplierInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  assertName(input.name)

  const cityId = input.cityId && isValidUuid(input.cityId) ? input.cityId : null
  const supplierCategoryId =
    input.supplierCategoryId && isValidUuid(input.supplierCategoryId)
      ? input.supplierCategoryId
      : null

  return prisma.suppliers.create({
    data: {
      tenant_id: tenantId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      supplier_category_id: supplierCategoryId,
      contact_person: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      tax_number: input.taxNumber?.trim() || null,
      payment_terms_days: input.paymentTermsDays ?? 0,
      address: input.address?.trim() || null,
      website: input.website?.trim() || null,
      notes: input.notes?.trim() || null,
      is_active: input.isActive ?? true,
      city_id: cityId,
      is_preferred: input.isPreferred ?? false,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function updateSupplier(
  authUserId: string,
  id: string,
  input: UpdateSupplierInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Invalid supplier id.', 400)
  }

  const existing = await prisma.suppliers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Supplier not found.', 404)
  }

  if (input.name !== undefined) {
    assertName(input.name)
  }

  const cityId =
    input.cityId !== undefined
      ? input.cityId && isValidUuid(input.cityId)
        ? input.cityId
        : null
      : undefined

  const supplierCategoryId =
    input.supplierCategoryId !== undefined
      ? input.supplierCategoryId && isValidUuid(input.supplierCategoryId)
        ? input.supplierCategoryId
        : null
      : undefined

  const data: Record<string, unknown> = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
    ...(supplierCategoryId !== undefined
      ? { supplier_category_id: supplierCategoryId }
      : {}),
    ...(input.contactPerson !== undefined
      ? { contact_person: input.contactPerson?.trim() || null }
      : {}),
    ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
    ...(input.taxNumber !== undefined
      ? { tax_number: input.taxNumber?.trim() || null }
      : {}),
    ...(input.paymentTermsDays !== undefined
      ? { payment_terms_days: input.paymentTermsDays }
      : {}),
    ...(input.address !== undefined
      ? { address: input.address?.trim() || null }
      : {}),
    ...(input.website !== undefined
      ? { website: input.website?.trim() || null }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(cityId !== undefined ? { city_id: cityId } : {}),
    ...(input.isPreferred !== undefined
      ? { is_preferred: input.isPreferred }
      : {}),
    updated_by_user_id: tenantUserId,
  }

  return prisma.suppliers.update({
    where: { id },
    data,
  })
}

export async function deleteSupplier(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  if (!isValidUuid(id)) {
    throw new ApiError('Invalid supplier id.', 400)
  }

  const existing = await prisma.suppliers.findFirst({
    where: { id, tenant_id: tenantId },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
          purchase_orders: true,
        },
      },
    },
  })
  if (!existing) {
    throw new ApiError('Supplier not found.', 404)
  }

  if (existing._count.purchase_orders > 0) {
    throw new ApiError(
      `This supplier is referenced by ${existing._count.purchase_orders} purchase order(s) and cannot be deleted.`,
      409
    )
  }

  if (existing._count.products > 0) {
    throw new ApiError(
      `This supplier is assigned to ${existing._count.products} product(s) and cannot be deleted.`,
      409
    )
  }

  return prisma.suppliers.delete({
    where: { id },
  })
}
