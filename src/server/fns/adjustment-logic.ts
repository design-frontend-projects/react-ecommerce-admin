/**
 * Pure adjustment-item math — no DB/Supabase imports so it is unit-testable in
 * isolation. Mirrors the delta semantics the apply_stock_adjustment() RPC uses.
 */

export type AdjustmentType = 'manual' | 'damage' | 'stocktake'
export type AdjustmentReason =
  | 'damage'
  | 'expired'
  | 'theft'
  | 'data_entry_error'
  | 'stocktake_discrepancy'
  | 'other'

export interface RawAdjustmentItem {
  productVariantId: string
  qty: number
  reason?: AdjustmentReason
  unitCost?: number
}

export interface ResolvedAdjustmentItem {
  product_variant_id: string
  qty_before: number
  qty_after: number
  qty_adjusted: number
  unit_cost: number
  reason: AdjustmentReason
}

export function defaultReason(type: AdjustmentType): AdjustmentReason {
  if (type === 'stocktake') return 'stocktake_discrepancy'
  if (type === 'damage') return 'damage'
  return 'data_entry_error'
}

/**
 * Resolve a line item to (before, after, delta) given the snapshot on-hand.
 * - stocktake: `qty` is the physical count (absolute) → delta = count − before
 * - damage:    `qty` is a positive write-off amount → delta = −|qty|
 * - manual:    `qty` is a signed delta
 */
export function resolveAdjustmentItem(
  type: AdjustmentType,
  item: RawAdjustmentItem,
  before: number
): ResolvedAdjustmentItem {
  let qtyAfter: number
  let qtyAdjusted: number

  if (type === 'stocktake') {
    qtyAfter = item.qty
    qtyAdjusted = item.qty - before
  } else if (type === 'damage') {
    qtyAdjusted = -Math.abs(item.qty)
    qtyAfter = before + qtyAdjusted
  } else {
    qtyAdjusted = item.qty
    qtyAfter = before + item.qty
  }

  return {
    product_variant_id: item.productVariantId,
    qty_before: before,
    qty_after: qtyAfter,
    qty_adjusted: qtyAdjusted,
    unit_cost: item.unitCost ?? 0,
    reason: item.reason ?? defaultReason(type),
  }
}
