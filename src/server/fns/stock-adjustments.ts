"use server"

import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import {
  resolveAdjustmentItem,
  type AdjustmentType,
  type AdjustmentReason,
} from './adjustment-logic'

export type { AdjustmentType, AdjustmentReason }

export interface AdjustmentItemInput {
  productVariantId: string
  /**
   * Interpretation depends on the adjustment type:
   * - `stocktake`: the physical counted quantity (absolute).
   * - `manual`: a signed delta (+increase / -decrease).
   * - `damage`: a positive quantity to write off (applied as a decrease).
   */
  qty: number
  reason?: AdjustmentReason
  unitCost?: number
}

export interface CreateAdjustmentInput {
  storeId: string
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

/** Snapshot current on-hand for the store's variants (qty_before at entry time). */
async function snapshotBalances(
  storeId: string,
  variantIds: string[]
): Promise<Map<string, number>> {
  const balances = (await prisma.stock_balances.findMany({
    where: { store_id: storeId, product_variant_id: { in: variantIds } },
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
    include: {
      stores: { select: { store_id: true, name: true } },
      _count: { select: { stock_adjustment_items: true } },
    },
  })
}

export async function getAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const adjustment = await prisma.stock_adjustments.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: { select: { store_id: true, name: true } },
      stock_adjustment_items: {
        include: { product_variants: { select: { id: true, sku: true } } },
      },
    },
  })
  if (!adjustment) {
    throw new ApiError('Adjustment not found.', 404)
  }
  return adjustment
}

export async function createAdjustment(
  authUserId: string,
  input: CreateAdjustmentInput
) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.storeId) {
    throw new ApiError('A store is required.', 400)
  }
  if (!['manual', 'damage', 'stocktake'].includes(input.type)) {
    throw new ApiError('Invalid adjustment type.', 400)
  }
  assertItems(input.items)

  const variantIds = input.items.map((item) => item.productVariantId)
  const snapshot = await snapshotBalances(input.storeId, variantIds)

  const resolved = input.items.map((item) =>
    resolveAdjustmentItem(
      input.type,
      item,
      snapshot.get(item.productVariantId) ?? 0
    )
  )

  return prisma.stock_adjustments.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      store_id: input.storeId,
      type: input.type,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft',
      stock_adjustment_items: {
        create: resolved.map((item) => ({
          product_variant_id: item.product_variant_id,
          qty_before: item.qty_before,
          qty_after: item.qty_after,
          qty_adjusted: item.qty_adjusted,
          unit_cost: item.unit_cost,
          reason: item.reason,
        })),
      },
    },
    include: { stock_adjustment_items: true },
  })
}

export async function cancelAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
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
    data: { status: 'cancelled' },
  })
}

export async function applyAdjustment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.stock_adjustments.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Adjustment not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc('apply_stock_adjustment', {
    p_adjustment_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
