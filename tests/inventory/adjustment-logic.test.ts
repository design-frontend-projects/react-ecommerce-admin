import { describe, it, expect } from 'vitest'
import {
  defaultReason,
  resolveAdjustmentItem,
} from '@/server/fns/adjustment-logic'

describe('resolveAdjustmentItem', () => {
  it('manual: applies a signed delta to the snapshot', () => {
    const r = resolveAdjustmentItem('manual', { productVariantId: 'v', qty: 10 }, 40)
    expect(r.qty_before).toBe(40)
    expect(r.qty_adjusted).toBe(10)
    expect(r.qty_after).toBe(50)
    expect(r.reason).toBe('data_entry_error')
  })

  it('manual: negative delta decreases stock', () => {
    const r = resolveAdjustmentItem('manual', { productVariantId: 'v', qty: -5 }, 40)
    expect(r.qty_adjusted).toBe(-5)
    expect(r.qty_after).toBe(35)
  })

  it('damage: treats qty as a positive write-off (always a decrease)', () => {
    const r = resolveAdjustmentItem(
      'damage',
      { productVariantId: 'v', qty: 3, reason: 'expired' },
      20
    )
    expect(r.qty_adjusted).toBe(-3)
    expect(r.qty_after).toBe(17)
    expect(r.reason).toBe('expired')
  })

  it('damage: a negative input is still treated as a write-off', () => {
    const r = resolveAdjustmentItem('damage', { productVariantId: 'v', qty: -3 }, 20)
    expect(r.qty_adjusted).toBe(-3)
    expect(r.reason).toBe('damage')
  })

  it('stocktake: delta is counted minus snapshot', () => {
    const r = resolveAdjustmentItem('stocktake', { productVariantId: 'v', qty: 72 }, 70)
    expect(r.qty_before).toBe(70)
    expect(r.qty_after).toBe(72)
    expect(r.qty_adjusted).toBe(2)
    expect(r.reason).toBe('stocktake_discrepancy')
  })

  it('stocktake: negative discrepancy when counted below system', () => {
    const r = resolveAdjustmentItem('stocktake', { productVariantId: 'v', qty: 8 }, 10)
    expect(r.qty_adjusted).toBe(-2)
    expect(r.qty_after).toBe(8)
  })

  it('carries an explicit unit cost through', () => {
    const r = resolveAdjustmentItem(
      'manual',
      { productVariantId: 'v', qty: 1, unitCost: 4.5 },
      0
    )
    expect(r.unit_cost).toBe(4.5)
  })
})

describe('defaultReason', () => {
  it('maps each type to its default reason', () => {
    expect(defaultReason('manual')).toBe('data_entry_error')
    expect(defaultReason('damage')).toBe('damage')
    expect(defaultReason('stocktake')).toBe('stocktake_discrepancy')
  })
})
