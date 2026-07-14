'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface WarehouseInput {
  branchId?: string | null
  storeId?: string | null
  code: string
  name: string
  address?: string | null
  notes?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export interface LocationInput {
  parentId?: string | null
  locationType: 'zone' | 'rack' | 'shelf' | 'bin'
  code: string
  name?: string | null
  isPickable?: boolean
  isReceivable?: boolean
  isActive?: boolean
}

export async function listWarehouses(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.warehouses.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      stores: { select: { store_id: true, name: true } },
      branches: { select: { id: true, name: true } },
      _count: { select: { warehouse_locations: true } },
    },
  })
}

export async function createWarehouse(
  authUserId: string,
  input: WarehouseInput
) {
  const tenantId = await requireTenantId(authUserId)
  if (!input.code?.trim() || !input.name?.trim()) {
    throw new ApiError('Code and name are required.', 400)
  }
  return prisma.warehouses.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      branch_id: input.branchId ?? null,
      store_id: input.storeId ?? null,
      code: input.code.trim(),
      name: input.name.trim(),
      address: input.address ?? null,
      notes: input.notes ?? null,
      is_default: input.isDefault ?? false,
    },
  })
}

export async function updateWarehouse(
  authUserId: string,
  id: string,
  input: Partial<WarehouseInput>
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.warehouses.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Warehouse not found.', 404)
  }
  return prisma.warehouses.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.branchId !== undefined ? { branch_id: input.branchId } : {}),
      ...(input.storeId !== undefined ? { store_id: input.storeId } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    },
  })
}

export async function deleteWarehouse(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.warehouses.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Warehouse not found.', 404)
  }
  const stockRows = await prisma.stock_by_location.count({
    where: { warehouse_id: id },
  })
  if (stockRows > 0) {
    throw new ApiError(
      'Warehouse still holds stock and cannot be deleted.',
      409
    )
  }
  return prisma.warehouses.delete({ where: { id } })
}

export async function listLocations(authUserId: string, warehouseId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.warehouse_locations.findMany({
    where: { warehouse_id: warehouseId, tenant_id: tenantId },
    orderBy: { path: 'asc' },
  })
}

export async function createLocation(
  authUserId: string,
  warehouseId: string,
  input: LocationInput
) {
  const tenantId = await requireTenantId(authUserId)
  const warehouse = await prisma.warehouses.findFirst({
    where: { id: warehouseId, tenant_id: tenantId },
    select: { id: true },
  })
  if (!warehouse) {
    throw new ApiError('Warehouse not found.', 404)
  }
  if (!input.code?.trim()) {
    throw new ApiError('Location code is required.', 400)
  }

  let path = `/${input.code.trim()}`
  if (input.parentId) {
    const parent = (await prisma.warehouse_locations.findFirst({
      where: { id: input.parentId, warehouse_id: warehouseId },
      select: { path: true },
    })) as { path: string | null } | null
    if (!parent) {
      throw new ApiError('Parent location not found.', 404)
    }
    path = `${parent.path ?? ''}/${input.code.trim()}`
  }

  return prisma.warehouse_locations.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      warehouse_id: warehouseId,
      parent_id: input.parentId ?? null,
      location_type: input.locationType,
      code: input.code.trim(),
      name: input.name ?? null,
      path,
      is_pickable: input.isPickable ?? true,
      is_receivable: input.isReceivable ?? true,
    },
  })
}

export async function updateLocation(
  authUserId: string,
  id: string,
  input: Partial<LocationInput>
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.warehouse_locations.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Location not found.', 404)
  }
  return prisma.warehouse_locations.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.locationType !== undefined
        ? { location_type: input.locationType }
        : {}),
      ...(input.isPickable !== undefined
        ? { is_pickable: input.isPickable }
        : {}),
      ...(input.isReceivable !== undefined
        ? { is_receivable: input.isReceivable }
        : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    },
  })
}

export async function deleteLocation(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await prisma.warehouse_locations.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Location not found.', 404)
  }
  const [stockRows, children] = await Promise.all([
    prisma.stock_by_location.count({ where: { warehouse_location_id: id } }),
    prisma.warehouse_locations.count({ where: { parent_id: id } }),
  ])
  if (stockRows > 0) {
    throw new ApiError('Location still holds stock and cannot be deleted.', 409)
  }
  if (children > 0) {
    throw new ApiError('Delete child locations first.', 409)
  }
  return prisma.warehouse_locations.delete({ where: { id } })
}
