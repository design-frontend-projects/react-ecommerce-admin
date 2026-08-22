'use server'

import type {
  adjustment_reason_enum,
  adjustment_status_enum,
  adjustment_type_enum,
} from '@/generated/prisma/client'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import {
  resolveAdjustmentItem,
  type AdjustmentType,
  type AdjustmentReason,
} from './adjustment-logic'

export type { AdjustmentType, AdjustmentReason }

export interface AdjustmentItemInput {
  productVariantId: string
  locationId?: string | null
  /**
   * Interpretation depends on the adjustment type:
   * - `stocktake`: the physical counted quantity (absolute).
   * - `manual`: a signed delta (+increase / -decrease).
   * - `damage`: a positive quantity to write off (applied as a decrease).
   */
  qty: number
  reason?: AdjustmentReason
  unitCost?: number
  batchId?: string | null
}

export interface CreateAdjustmentInput {
  warehouseId?: string | null
  storeId?: string | null
  type: AdjustmentType
  notes?: string | null
  items: AdjustmentItemInput[]
}

function assertItems(items: AdjustmentItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('An adjustment must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (typeof item.qty !== 'number' || Number.isNaN(item.qty)) {
      throw new ApiError('Each item requires a numeric quantity.', 400)
    }
  }
}

/** Snapshot current on-hand for the warehouse/store's variants (qty_before at entry time). */
async function snapshotBalances(
  locationFilter: { warehouseId?: string | null; storeId?: string | null },
  variantIds: string[]
): Promise<Map<string, number>> {
  const whereClause: Record<string, any> = {
    product_variant_id: { in: variantIds },
  }
  if (locationFilter.warehouseId) {
    whereClause.warehouse_id = locationFilter.warehouseId
  } else if (locationFilter.storeId) {
    whereClause.store_id = locationFilter.storeId
  }

  const balances = (await prisma.stock_balances.findMany({
    where: whereClause,
    select: { product_variant_id: true, qty_on_hand: true },
  })) as Array<{ product_variant_id: string; qty_on_hand: unknown }>
  const map = new Map<string, number>()
  for (const balance of balances) {
    map.set(balance.product_variant_id, Number(balance.qty_on_hand))
  }
  return map
}

export async function listAdjustments(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.stock_adjustments.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })
}

export async function getAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const adjustment = await prisma.stock_adjustments.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!adjustment) {
    throw new ApiError('Adjustment not found.', 404)
  }
  const items = await prisma.stock_adjustment_items.findMany({
    where: { stock_adjustment_id: id },
  })
  return {
    ...adjustment,
    stock_adjustment_items: items,
  }
}

export async function createAdjustment(
  authUserId: string,
  input: CreateAdjustmentInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const whId = input.warehouseId || input.storeId
  if (!whId) {
    throw new ApiError('A warehouse or store is required.', 400)
  }
  if (!['manual', 'damage', 'stocktake'].includes(input.type)) {
    throw new ApiError('Invalid adjustment type.', 400)
  }
  assertItems(input.items)

  const variantIds = input.items.map((item) => item.productVariantId)
  const snapshot = await snapshotBalances(
    { warehouseId: input.warehouseId, storeId: input.storeId },
    variantIds
  )

  const resolved = input.items.map((item) =>
    resolveAdjustmentItem(
      input.type,
      item,
      snapshot.get(item.productVariantId) ?? 0
    )
  )

  return prisma.$transaction(async (tx: any) => {
    const created = await tx.stock_adjustments.create({
      data: {
        tenant_id: tenantId,
        warehouse_id: input.warehouseId ?? null,
        store_id: input.storeId ?? null,
        type: input.type as adjustment_type_enum,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft' as adjustment_status_enum,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (resolved.length > 0) {
      await tx.stock_adjustment_items.createMany({
        data: resolved.map((item, idx) => ({
          stock_adjustment_id: created.id,
          product_variant_id: item.product_variant_id,
          location_id: input.items[idx]?.locationId ?? null,
          qty_before: item.qty_before,
          qty_after: item.qty_after,
          qty_adjusted: item.qty_adjusted,
          unit_cost: item.unit_cost,
          reason: (item.reason ?? 'other') as adjustment_reason_enum,
          batch_id: input.items[idx]?.batchId ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.stock_adjustment_items.findMany({
      where: { stock_adjustment_id: created.id },
    })

    return {
      ...created,
      stock_adjustment_items: items,
    }
  })
}

export async function approveAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  // Call Supabase RPC to record movements and balance adjustments
  const { error } = await supabaseAdmin.rpc('apply_stock_adjustment', {
    p_adjustment_id: id,
  })
  if (error) {
    console.warn('RPC apply_stock_adjustment warning:', error.message)
  }

  return prisma.stock_adjustments.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'approved' as adjustment_status_enum,
      approved_by: authUserId,
      approved_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function cancelAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.stock_adjustments.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Adjustment not found.', 404)
  }
  if (existing.status === 'approved') {
    throw new ApiError('An approved adjustment cannot be cancelled.', 409)
  }
  return prisma.stock_adjustments.update({
    where: { id },
    data: {
      status: 'cancelled' as adjustment_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function applyAdjustment(authUserId: string, id: string) {
  return approveAdjustment(authUserId, id)
}
