"use server"

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

export interface OpeningStockItemInput {
  productVariantId: string
  qty: number
  unitCost?: number
  batchNumber?: string
  expiryDate?: string
  serialNumbers?: string[]
}

export interface PostOpeningStockInput {
  storeId: string
  items: OpeningStockItemInput[]
}

/**
 * Posts opening-stock movements through the movement engine. Idempotent per
 * (variant, store): re-posting the same opening line replays the original
 * movement instead of double-counting. This replaces the old direct write of
 * product_variants.stock_quantity from the product wizard.
 */
export async function postOpeningStock(
  authUserId: string,
  input: PostOpeningStockInput
) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.storeId) {
    throw new ApiError('A store is required for opening stock.', 400)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError('Opening stock requires at least one item.', 400)
  }
  for (const item of input.items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (typeof item.qty !== 'number' || Number.isNaN(item.qty) || item.qty <= 0) {
      throw new ApiError('Each item requires a positive quantity.', 400)
    }
  }

  const movements = input.items.map((item) => ({
    tenant_id: tenantId,
    store_id: input.storeId,
    product_variant_id: item.productVariantId,
    movement_type: 'opening_stock',
    qty: item.qty,
    unit_cost: item.unitCost ?? 0,
    batch_number: item.batchNumber ?? null,
    expiry_date: item.expiryDate ?? null,
    serial_numbers: item.serialNumbers ?? null,
    reference_type: 'opening_stock',
    idempotency_key: `opening:${item.productVariantId}:${input.storeId}`,
    remarks: 'Opening stock',
    created_by: authUserId,
  }))

  const { data, error } = await supabaseAdmin.rpc('apply_inventory_movements', {
    p_movements: movements,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
