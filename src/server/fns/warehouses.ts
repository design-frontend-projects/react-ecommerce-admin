'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface WarehouseInput {
  branchId?: string | null
  storeId?: string | null
  countryId?: string | null
  cityId?: string | null
  warehouseTypeId?: string | null
  code: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  allowNegativeStock?: boolean
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
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.warehouses.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: {
        store_warehouses: {
          include: {
            stores: { select: { store_id: true, name: true } },
          },
          orderBy: { priority: 'asc' },
        },
        branches: { select: { id: true, name: true } },
        countries: { select: { id: true, name: true, code: true } },
        cities: { select: { id: true, name: true } },
        _count: { select: { warehouse_locations: true, stock_balances: true } },
      },
    })
  })
}

export async function createWarehouse(
  authUserId: string,
  input: WarehouseInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  if (!input.code?.trim() || !input.name?.trim()) {
    throw new ApiError('Code and name are required.', 400)
  }
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouses.create({
        data: {
          tenant_id: tenantId,
          branch_id: input.branchId ?? null,
          country_id: input.countryId ?? null,
          city_id: input.cityId ?? null,
          warehouse_type_id: input.warehouseTypeId ?? null,
          code: input.code.trim(),
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          address: input.address?.trim() || null,
          notes: input.notes?.trim() || null,
          allow_negative_stock: input.allowNegativeStock ?? false,
          is_default: input.isDefault ?? false,
          is_active: input.isActive ?? true,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      if (input.storeId) {
        await tx.store_warehouses.create({
          data: {
            tenant_id: tenantId,
            store_id: input.storeId,
            warehouse_id: warehouse.id,
            is_default: true,
            priority: 1,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }

      return tx.warehouses.findUniqueOrThrow({
        where: { id: warehouse.id },
        include: {
          store_warehouses: {
            include: {
              stores: { select: { store_id: true, name: true } },
            },
            orderBy: { priority: 'asc' },
          },
          branches: { select: { id: true, name: true } },
          countries: { select: { id: true, name: true, code: true } },
          cities: { select: { id: true, name: true } },
          _count: { select: { warehouse_locations: true } },
        },
      })
    })
  })
}

export async function updateWarehouse(
  authUserId: string,
  id: string,
  input: Partial<WarehouseInput>
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.warehouses.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!existing) {
    throw new ApiError('Warehouse not found.', 404)
  }
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.$transaction(async (tx) => {
      if (input.storeId) {
        // Link to store via store_warehouses
        const exists = await tx.store_warehouses.findFirst({
          where: { tenant_id: tenantId, warehouse_id: id, store_id: input.storeId },
        })
        if (!exists) {
          await tx.store_warehouses.create({
            data: {
              tenant_id: tenantId,
              store_id: input.storeId,
              warehouse_id: id,
              is_default: false,
              priority: 1,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })
        }
      }

      return tx.warehouses.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code.trim() } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.branchId !== undefined ? { branch_id: input.branchId } : {}),
          ...(input.countryId !== undefined ? { country_id: input.countryId } : {}),
          ...(input.cityId !== undefined ? { city_id: input.cityId } : {}),
          ...(input.warehouseTypeId !== undefined
            ? { warehouse_type_id: input.warehouseTypeId }
            : {}),
          ...(input.phone !== undefined
            ? { phone: input.phone?.trim() || null }
            : {}),
          ...(input.email !== undefined
            ? { email: input.email?.trim() || null }
            : {}),
          ...(input.address !== undefined
            ? { address: input.address?.trim() || null }
            : {}),
          ...(input.notes !== undefined
            ? { notes: input.notes?.trim() || null }
            : {}),
          ...(input.allowNegativeStock !== undefined
            ? { allow_negative_stock: input.allowNegativeStock }
            : {}),
          ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          updated_by_user_id: tenantUserId,
        },
        include: {
          store_warehouses: {
            include: {
              stores: { select: { store_id: true, name: true } },
            },
            orderBy: { priority: 'asc' },
          },
          branches: { select: { id: true, name: true } },
          countries: { select: { id: true, name: true, code: true } },
          cities: { select: { id: true, name: true } },
          _count: { select: { warehouse_locations: true } },
        },
      })
    })
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
  const tenantUserId = await resolveTenantUserId(authUserId)
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
      warehouse_id: warehouseId,
      parent_id: input.parentId ?? null,
      location_type: input.locationType,
      code: input.code.trim(),
      name: input.name ?? null,
      path,
      is_pickable: input.isPickable ?? true,
      is_receivable: input.isReceivable ?? true,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function updateLocation(
  authUserId: string,
  id: string,
  input: Partial<LocationInput>
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
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
      updated_by_user_id: tenantUserId,
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
