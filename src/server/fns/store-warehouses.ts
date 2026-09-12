'use server'

import { randomUUID } from 'node:crypto'
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
    // 1. Fetch store info (including branch_id)
    const store = await prisma.stores.findFirst({
      where: { store_id: storeId, tenant_id: tenantId },
      select: { store_id: true, name: true, branch_id: true },
    })

    // 2. Fetch all direct store_warehouses records for this store
    const links = await prisma.store_warehouses.findMany({
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
            allow_negative_stock: true,
            cities: { select: { id: true, name: true } },
            branches: { select: { id: true, name: true } },
          },
        },
      },
    })

    const existingWhIds = new Set(links.map((l) => l.warehouse_id))
    const synthesized: any[] = []

    // 3. If store is associated with a branch, include all warehouses from that same branch
    if (store?.branch_id) {
      const branchWarehouses = await prisma.warehouses.findMany({
        where: {
          branch_id: store.branch_id,
          tenant_id: tenantId,
          ...(existingWhIds.size > 0 ? { id: { notIn: Array.from(existingWhIds) } } : {}),
        },
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          is_active: true,
          allow_negative_stock: true,
          cities: { select: { id: true, name: true } },
          branches: { select: { id: true, name: true } },
        },
      })

      for (let idx = 0; idx < branchWarehouses.length; idx++) {
        const bw = branchWarehouses[idx]
        existingWhIds.add(bw.id)
        synthesized.push({
          id: randomUUID(),
          tenant_id: tenantId,
          store_id: storeId,
          warehouse_id: bw.id,
          is_default: links.length === 0 && synthesized.length === 0 && idx === 0,
          priority: links.length + synthesized.length + 1,
          allow_fulfillment: true,
          allow_replenishment: true,
          allow_returns: true,
          lead_time_days: 1,
          distance_km: null,
          transit_cost: null,
          is_active: bw.is_active,
          notes: 'Associated via branch',
          created_at: new Date(),
          updated_at: new Date(),
          created_by_user_id: null,
          updated_by_user_id: null,
          warehouses: bw,
        })
      }
    }

    // 4. Also include warehouses where stock balances exist for this store
    const stockBalances = await prisma.stock_balances.findMany({
      where: {
        store_id: storeId,
        tenant_id: tenantId,
        warehouse_id: { not: null, notIn: Array.from(existingWhIds) },
      },
      select: {
        warehouse_id: true,
        warehouses: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            is_active: true,
            allow_negative_stock: true,
            cities: { select: { id: true, name: true } },
            branches: { select: { id: true, name: true } },
          },
        },
      },
      distinct: ['warehouse_id'],
    })

    for (let idx = 0; idx < stockBalances.length; idx++) {
      const sb = stockBalances[idx]
      if (sb.warehouses && sb.warehouse_id && !existingWhIds.has(sb.warehouse_id)) {
        existingWhIds.add(sb.warehouse_id)
        synthesized.push({
          id: randomUUID(),
          tenant_id: tenantId,
          store_id: storeId,
          warehouse_id: sb.warehouse_id,
          is_default: links.length === 0 && synthesized.length === 0,
          priority: links.length + synthesized.length + 1,
          allow_fulfillment: true,
          allow_replenishment: true,
          allow_returns: true,
          lead_time_days: 1,
          distance_km: null,
          transit_cost: null,
          is_active: sb.warehouses.is_active,
          notes: 'Associated via stock balances',
          created_at: new Date(),
          updated_at: new Date(),
          created_by_user_id: null,
          updated_by_user_id: null,
          warehouses: sb.warehouses,
        })
      }
    }

    // 5. Fallback for unlinked stores: include tenant's default warehouse so order fulfillment isn't blocked
    if (links.length === 0 && synthesized.length === 0) {
      const defaultWarehouses = await prisma.warehouses.findMany({
        where: {
          tenant_id: tenantId,
          is_default: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          is_active: true,
          allow_negative_stock: true,
          cities: { select: { id: true, name: true } },
          branches: { select: { id: true, name: true } },
        },
      })

      for (let idx = 0; idx < defaultWarehouses.length; idx++) {
        const dw = defaultWarehouses[idx]
        synthesized.push({
          id: randomUUID(),
          tenant_id: tenantId,
          store_id: storeId,
          warehouse_id: dw.id,
          is_default: idx === 0,
          priority: idx + 1,
          allow_fulfillment: true,
          allow_replenishment: true,
          allow_returns: true,
          lead_time_days: 1,
          distance_km: null,
          transit_cost: null,
          is_active: dw.is_active,
          notes: 'Default tenant warehouse',
          created_at: new Date(),
          updated_at: new Date(),
          created_by_user_id: null,
          updated_by_user_id: null,
          warehouses: dw,
        })
      }
    }

    return [...links, ...synthesized]
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
