// Shared order-totals computation for ResPOS — the single formula used by the
// cart store, the checkout dialog, and order/invoice rendering so they can
// never disagree.
//
// Rounding policy: all math runs in full float precision; amounts are rounded
// to 2dp exactly once, here, at the totals boundary. Persisted res_orders
// values are these rounded numbers, so the DB always equals the receipt.
import type { TaxConfig } from '../types'

export const round2 = (value: number): number => Math.round(value * 100) / 100

export interface OrderTotalsInput {
  subtotal: number
  manualDiscount?: number
  promoDiscount?: number
  taxConfig: TaxConfig
  tipAmount?: number
  receivedAmount?: number
}

export interface OrderTotals {
  subtotal: number
  manualDiscount: number
  promoDiscount: number
  totalDiscount: number
  taxAmount: number
  tipAmount: number
  total: number
  changeAmount: number
}

/**
 * Computes order totals for both tax modes. With S = subtotal, D = clamped
 * discounts, base = S − D, r = rate:
 *
 *  - Exclusive (is_inclusive = false): tax = base × r; total = base + tax + tip
 *  - Inclusive (is_inclusive = true): menu prices already contain tax, so the
 *    embedded tax is derived from the discounted gross:
 *    tax = base − base / (1 + r); total = base + tip (nothing added on top)
 */
export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = Math.max(0, input.subtotal)
  const manualDiscount = Math.max(0, input.manualDiscount ?? 0)
  const promoDiscount = Math.max(0, input.promoDiscount ?? 0)
  const totalDiscount = Math.min(subtotal, manualDiscount + promoDiscount)
  const tipAmount = Math.max(0, input.tipAmount ?? 0)

  const base = subtotal - totalDiscount
  const { rate, isInclusive } = input.taxConfig

  const taxAmount = isInclusive ? base - base / (1 + rate) : base * rate
  const total = isInclusive ? base + tipAmount : base + taxAmount + tipAmount

  const receivedAmount = input.receivedAmount ?? 0
  const changeAmount =
    receivedAmount > 0 ? Math.max(0, receivedAmount - total) : 0

  return {
    subtotal: round2(subtotal),
    manualDiscount: round2(manualDiscount),
    promoDiscount: round2(promoDiscount),
    totalDiscount: round2(totalDiscount),
    taxAmount: round2(taxAmount),
    tipAmount: round2(tipAmount),
    total: round2(total),
    changeAmount: round2(changeAmount),
  }
}
