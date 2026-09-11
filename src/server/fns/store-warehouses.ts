'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export interface StoreWarehouseInput {
  storeId: string
  warehouseId: string
  isDefault?: boolean
  priority?: number
  allowFulfillment?: boolean
  allowReplenishment?: boolean
  allowReturns?: boolean
  leadTimeDays?: number | null
  distanceKm?: number | null
  transitCost?: number | null
  isActive?: boolean
  notes?: string | null
}

export interface StoreWarehouseUpdateInput {
  isDefault?: boolean
  priority?: number
  allowFulfillment?: boolean
  allowReplenishment?: boolean
  allowReturns?: boolean
  leadTimeDays?: number | null
  distanceKm?: number | null
  transitCost?: number | null
  isActive?: boolean
  notes?: string | null
}

export async function listStoreWarehouses(authUserId: string, storeId: string) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.store_warehouses.findMany({
      where: { store_id: storeId, tenant_id: tenantId },
      orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
      include: {
        warehouses: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            is_active: true,
            cities: { select: { id: true, name: true } },
            branches: { select: { id: true, name: true } },
          },
        },
      },
    })
  })
}

export async function listWarehouseStores(authUserId: string, warehouseId: string) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.store_warehouses.findMany({
      where: { warehouse_id: warehouseId, tenant_id: tenantId },
      orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
      include: {
        stores: {
          select: {
            store_id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            status: true,
            cities: { select: { id: true, name: true } },
            branches: { select: { id: true, name: true } },
          },
        },
      },
    })
  })
}

export async function assignStoreWarehouse(
  authUserId: string,
  input: StoreWarehouseInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.storeId || !input.warehouseId) {
    throw new ApiError('Store ID and Warehouse ID are required.', 400)
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // Check if relation already exists
    const existing = await prisma.store_warehouses.findFirst({
      where: {
        tenant_id: tenantId,
        store_id: input.storeId,
        warehouse_id: input.warehouseId,
      },
      select: { id: true },
    })

    if (existing) {
      throw new ApiError('This warehouse is already linked to the selected store.', 409)
    }

    // Determine priority if not specified
    let targetPriority = input.priority
    if (!targetPriority || targetPriority < 1) {
      const highest = await prisma.store_warehouses.findFirst({
        where: { tenant_id: tenantId, store_id: input.storeId },
        orderBy: { priority: 'desc' },
        select: { priority: true },
      })
      targetPriority = (highest?.priority ?? 0) + 1
    }

    const shouldBeDefault = input.isDefault ?? false

    return prisma.$transaction(async (tx) => {
      // If setting as default, clear existing default for this store
      if (shouldBeDefault) {
        await tx.store_warehouses.updateMany({
          where: { tenant_id: tenantId, store_id: input.storeId, is_default: true },
          data: { is_default: false },
        })
      }

      return tx.store_warehouses.create({
        data: {
          tenant_id: tenantId,
          store_id: input.storeId,
          warehouse_id: input.warehouseId,
          is_default: shouldBeDefault,
          priority: targetPriority,
          allow_fulfillment: input.allowFulfillment ?? true,
          allow_replenishment: input.allowReplenishment ?? true,
          allow_returns: input.allowReturns ?? true,
          lead_time_days: input.leadTimeDays ?? 1,
          distance_km: input.distanceKm ?? null,
          transit_cost: input.transitCost ?? null,
          is_active: input.isActive ?? true,
          notes: input.notes?.trim() || null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
        include: {
          warehouses: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
              phone: true,
              cities: { select: { id: true, name: true } },
            },
          },
          stores: {
            select: {
              store_id: true,
              name: true,
            },
          },
        },
      })
    })
  })
}

export async function updateStoreWarehouse(
  authUserId: string,
  id: string,
  input: StoreWarehouseUpdateInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await prisma.store_warehouses.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, store_id: true },
    })

    if (!existing) {
      throw new ApiError('Store-Warehouse link not found.', 404)
    }

    return prisma.$transaction(async (tx) => {
      // If marking as default, unset other defaults for the store
      if (input.isDefault === true) {
        await tx.store_warehouses.updateMany({
          where: {
            tenant_id: tenantId,
            store_id: existing.store_id,
            id: { not: id },
            is_default: true,
          },
          data: { is_default: false },
        })
      }

      return tx.store_warehouses.update({
        where: { id },
        data: {
          ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.allowFulfillment !== undefined
            ? { allow_fulfillment: input.allowFulfillment }
            : {}),
          ...(input.allowReplenishment !== undefined
            ? { allow_replenishment: input.allowReplenishment }
            : {}),
          ...(input.allowReturns !== undefined
            ? { allow_returns: input.allowReturns }
            : {}),
          ...(input.leadTimeDays !== undefined
            ? { lead_time_days: input.leadTimeDays }
            : {}),
          ...(input.distanceKm !== undefined ? { distance_km: input.distanceKm } : {}),
          ...(input.transitCost !== undefined
            ? { transit_cost: input.transitCost }
            : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          ...(input.notes !== undefined
            ? { notes: input.notes?.trim() || null }
            : {}),
          updated_by_user_id: tenantUserId,
        },
        include: {
          warehouses: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
              phone: true,
              cities: { select: { id: true, name: true } },
            },
          },
        },
      })
    })
  })
}

export async function reorderStoreWarehouses(
  authUserId: string,
  storeId: string,
  orderedIds: string[]
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.store_warehouses.updateMany({
          where: {
            id: orderedIds[i],
            store_id: storeId,
            tenant_id: tenantId,
          },
          data: { priority: i + 1 },
        })
      }

      return tx.store_warehouses.findMany({
        where: { store_id: storeId, tenant_id: tenantId },
        orderBy: { priority: 'asc' },
        include: {
          warehouses: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      })
    })
  })
}

export async function removeStoreWarehouse(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await prisma.store_warehouses.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    })

    if (!existing) {
      throw new ApiError('Store-Warehouse link not found.', 404)
    }

    return prisma.store_warehouses.delete({ where: { id } })
  })
}
