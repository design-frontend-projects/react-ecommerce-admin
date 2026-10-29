import { describe, expect, it } from 'vitest'
import {
  defaultReason,
  resolveAdjustmentItem,
  type RawAdjustmentItem,
} from '@/server/fns/adjustment-logic'

describe('Stock Adjustment Logic & Math', () => {
  it('correctly provides default reasons by adjustment type', () => {
    expect(defaultReason('stocktake')).toBe('stocktake_discrepancy')
    expect(defaultReason('damage')).toBe('damage')
    expect(defaultReason('manual')).toBe('data_entry_error')
  })

  it('calculates stocktake delta against snapshot balance (absolute physical count)', () => {
    const item: RawAdjustmentItem = {
      productVariantId: 'variant-1',
      qty: 25, // counted 25
      unitCost: 10,
    }
    const beforeOnHand = 20

    const resolved = resolveAdjustmentItem('stocktake', item, beforeOnHand)
    expect(resolved.qty_before).toBe(20)
    expect(resolved.qty_after).toBe(25)
    expect(resolved.qty_adjusted).toBe(5) // +5 discrepancy
    expect(resolved.reason).toBe('stocktake_discrepancy')
    expect(resolved.unit_cost).toBe(10)
  })

  it('calculates damage reduction delta (negative deduction from on-hand)', () => {
    const item: RawAdjustmentItem = {
      productVariantId: 'variant-2',
      qty: 4, // 4 damaged units
      unitCost: 15,
    }
    const beforeOnHand = 30

    const resolved = resolveAdjustmentItem('damage', item, beforeOnHand)
    expect(resolved.qty_before).toBe(30)
    expect(resolved.qty_after).toBe(26)
    expect(resolved.qty_adjusted).toBe(-4)
    expect(resolved.reason).toBe('damage')
    expect(resolved.unit_cost).toBe(15)
  })

  it('calculates manual signed delta (+increase)', () => {
    const item: RawAdjustmentItem = {
      productVariantId: 'variant-3',
      qty: 8,
      reason: 'found',
      unitCost: 12,
    }
    const beforeOnHand = 50

    const resolved = resolveAdjustmentItem('manual', item, beforeOnHand)
    expect(resolved.qty_before).toBe(50)
    expect(resolved.qty_after).toBe(58)
    expect(resolved.qty_adjusted).toBe(8)
    expect(resolved.reason).toBe('found')
  })

  it('calculates manual signed delta (-decrease)', () => {
    const item: RawAdjustmentItem = {
      productVariantId: 'variant-4',
      qty: -5,
      reason: 'theft',
      unitCost: 20,
    }
    const beforeOnHand = 50

    const resolved = resolveAdjustmentItem('manual', item, beforeOnHand)
    expect(resolved.qty_before).toBe(50)
    expect(resolved.qty_after).toBe(45)
    expect(resolved.qty_adjusted).toBe(-5)
    expect(resolved.reason).toBe('theft')
  })
})
