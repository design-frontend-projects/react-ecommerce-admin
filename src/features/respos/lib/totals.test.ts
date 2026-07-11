import { describe, expect, it } from 'vitest'
import { computeOrderTotals, round2 } from './totals'

const exclusive = { rate: 0.14, isInclusive: false }
const inclusive = { rate: 0.14, isInclusive: true }

describe('computeOrderTotals', () => {
  it('computes exclusive tax on the discounted base', () => {
    const totals = computeOrderTotals({
      subtotal: 100,
      manualDiscount: 10,
      taxConfig: exclusive,
    })
    expect(totals.taxAmount).toBe(round2(90 * 0.14))
    expect(totals.total).toBe(102.6) // (100 - 10) * 1.14
  })

  it('derives embedded tax for inclusive pricing without adding on top', () => {
    const totals = computeOrderTotals({
      subtotal: 114,
      taxConfig: inclusive,
    })
    expect(totals.taxAmount).toBe(14) // 114 - 114/1.14
    expect(totals.total).toBe(114)
  })

  it('recomputes embedded tax from the discounted gross', () => {
    const totals = computeOrderTotals({
      subtotal: 114,
      manualDiscount: 10,
      taxConfig: inclusive,
    })
    expect(totals.taxAmount).toBe(round2(104 - 104 / 1.14)) // ≈ 12.77
    expect(totals.total).toBe(104)
  })

  it('adds tip on top in both modes', () => {
    expect(
      computeOrderTotals({ subtotal: 100, taxConfig: exclusive, tipAmount: 5 })
        .total
    ).toBe(119)
    expect(
      computeOrderTotals({ subtotal: 114, taxConfig: inclusive, tipAmount: 5 })
        .total
    ).toBe(119)
  })

  it('clamps discounts to the subtotal', () => {
    const totals = computeOrderTotals({
      subtotal: 50,
      manualDiscount: 40,
      promoDiscount: 40,
      taxConfig: exclusive,
    })
    expect(totals.totalDiscount).toBe(50)
    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(0)
  })

  it('computes change from received amount', () => {
    const totals = computeOrderTotals({
      subtotal: 100,
      taxConfig: exclusive,
      receivedAmount: 150,
    })
    expect(totals.total).toBe(114)
    expect(totals.changeAmount).toBe(36)
  })

  it('rounds only at the boundary to 2dp', () => {
    const totals = computeOrderTotals({
      subtotal: 10.333,
      manualDiscount: 0.111,
      taxConfig: exclusive,
    })
    expect(totals.subtotal).toBe(10.33)
    expect(totals.taxAmount).toBe(round2((10.333 - 0.111) * 0.14))
    expect(totals.total).toBe(round2((10.333 - 0.111) * 1.14))
  })
})
