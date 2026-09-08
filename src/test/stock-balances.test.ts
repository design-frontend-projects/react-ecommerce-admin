import { describe, it, expect } from 'vitest'
import { adjustmentSchema, type AdjustmentFormData } from '../features/stock-balances/data/adjustment-schema'
import { stockBalanceSchema } from '../features/stock-balances/data/schema'

describe('Stock Balance Data Validation & Business Logic', () => {
  describe('adjustmentSchema Validation', () => {
    it('validates a valid warehouse adjustment with "set" quantity', () => {
      const input: AdjustmentFormData = {
        location_type: 'warehouse',
        warehouse_id: '4bb8357f-f772-4660-84c1-eb83cb7d29bc',
        location_id: '8a221f70-dca0-410a-b0e6-3474d2b9ca3d',
        store_id: null,
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'set',
        quantity: 50,
        unit_cost: 12.5,
        reason_code: 'physical_audit',
        reason: 'Annual inventory count audit completed.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(50)
        expect(result.data.warehouse_id).toBe('4bb8357f-f772-4660-84c1-eb83cb7d29bc')
        expect(result.data.condition).toBe('good')
      }
    })

    it('validates a valid store adjustment with negative "offset" for damaged stock', () => {
      const input: AdjustmentFormData = {
        location_type: 'store',
        store_id: '6f42ec73-67c4-42f5-b732-c6c7e3f2d251',
        warehouse_id: null,
        location_id: null,
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'damaged',
        adjustment_type: 'offset',
        quantity: -5,
        unit_cost: 0,
        reason_code: 'damaged',
        reason: 'Water leak damaged items on shelf B-3.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(-5)
        expect(result.data.condition).toBe('damaged')
      }
    })

    it('fails when warehouse location type is selected without warehouse_id', () => {
      const input = {
        location_type: 'warehouse',
        warehouse_id: '',
        store_id: null,
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'set',
        quantity: 10,
        reason_code: 'physical_audit',
        reason: 'Routine count check.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const hasWhError = result.error.issues.some((i) => i.path.includes('warehouse_id'))
        expect(hasWhError).toBe(true)
      }
    })

    it('fails when store location type is selected without store_id', () => {
      const input = {
        location_type: 'store',
        store_id: '',
        warehouse_id: null,
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'set',
        quantity: 10,
        reason_code: 'physical_audit',
        reason: 'Routine count check.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const hasStoreError = result.error.issues.some((i) => i.path.includes('store_id'))
        expect(hasStoreError).toBe(true)
      }
    })

    it('fails when quantity is negative for "set" adjustment mode', () => {
      const input = {
        location_type: 'warehouse',
        warehouse_id: '4bb8357f-f772-4660-84c1-eb83cb7d29bc',
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'set',
        quantity: -10,
        reason_code: 'physical_audit',
        reason: 'Testing negative set.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const hasQtyError = result.error.issues.some((i) => i.path.includes('quantity'))
        expect(hasQtyError).toBe(true)
      }
    })

    it('fails when quantity is zero for "offset" adjustment mode', () => {
      const input = {
        location_type: 'warehouse',
        warehouse_id: '4bb8357f-f772-4660-84c1-eb83cb7d29bc',
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'offset',
        quantity: 0,
        reason_code: 'physical_audit',
        reason: 'Zero offset test.',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        const hasQtyError = result.error.issues.some((i) => i.path.includes('quantity'))
        expect(hasQtyError).toBe(true)
      }
    })

    it('fails when reason is shorter than 3 characters', () => {
      const input = {
        location_type: 'store',
        store_id: '6f42ec73-67c4-42f5-b732-c6c7e3f2d251',
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        adjustment_type: 'set',
        quantity: 10,
        reason_code: 'physical_audit',
        reason: 'ab',
      }

      const result = adjustmentSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('stockBalanceSchema Validation', () => {
    it('validates a complete stock balance row from DB', () => {
      const row = {
        id: '277f0a71-6154-469b-9c2e-ca59f71c49bf',
        tenant_id: '1e19d779-114d-407a-9dbd-021c326b4d37',
        warehouse_id: '4bb8357f-f772-4660-84c1-eb83cb7d29bc',
        location_id: '8a221f70-dca0-410a-b0e6-3474d2b9ca3d',
        store_id: null,
        product_variant_id: '1796a5fa-29f1-4cd5-96bf-16f7995aab05',
        condition: 'good',
        qty_on_hand: '45.0000',
        qty_reserved: '5.0000',
        qty_available: '40.0000',
        avg_cost: '14.5000',
        valuation: '652.5000',
        last_movement_at: '2026-09-08T22:00:00.000Z',
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-08T22:00:00.000Z',
      }

      const parsed = stockBalanceSchema.safeParse(row)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.qty_on_hand).toBe(45)
        expect(parsed.data.qty_reserved).toBe(5)
        expect(parsed.data.qty_available).toBe(40)
        expect(parsed.data.avg_cost).toBe(14.5)
      }
    })
  })

  describe('Inventory Business Calculations', () => {
    it('accurately computes available stock as max(0, on_hand - reserved)', () => {
      const computeAvailable = (onHand: number, reserved: number) =>
        Math.max(0, onHand - reserved)

      expect(computeAvailable(50, 10)).toBe(40)
      expect(computeAvailable(10, 10)).toBe(0)
      expect(computeAvailable(5, 10)).toBe(0)
      expect(computeAvailable(0, 0)).toBe(0)
    })

    it('accurately computes inventory asset valuation', () => {
      const computeValuation = (onHand: number, avgCost: number) =>
        onHand * avgCost

      expect(computeValuation(100, 25.5)).toBe(2550)
      expect(computeValuation(0, 50)).toBe(0)
      expect(computeValuation(33, 3.3333)).toBeCloseTo(109.9989, 4)
    })

    it('computes moving average cost correctly on incoming positive delta', () => {
      const computeNewAverage = (
        currentQty: number,
        currentAvg: number,
        deltaQty: number,
        newUnitCost: number
      ) => {
        const newQty = currentQty + deltaQty
        if (newQty <= 0) return currentAvg
        return (currentQty * currentAvg + deltaQty * newUnitCost) / newQty
      }

      // Existing: 10 units @ $10. New: 10 units @ $20. Expected: 20 units @ $15
      expect(computeNewAverage(10, 10, 10, 20)).toBe(15)

      // Existing: 50 units @ $8. New: 50 units @ $12. Expected: 100 units @ $10
      expect(computeNewAverage(50, 8, 50, 12)).toBe(10)
    })

    it('categorizes stock status based on on-hand and reorder level', () => {
      const getStatus = (onHand: number, reorderLevel = 10) => {
        if (onHand <= 0) return 'Out of Stock'
        if (onHand <= reorderLevel) return 'Low Stock'
        return 'In Stock'
      }

      expect(getStatus(0, 10)).toBe('Out of Stock')
      expect(getStatus(-2, 10)).toBe('Out of Stock')
      expect(getStatus(5, 10)).toBe('Low Stock')
      expect(getStatus(10, 10)).toBe('Low Stock')
      expect(getStatus(11, 10)).toBe('In Stock')
      expect(getStatus(100, 10)).toBe('In Stock')
    })
  })

  describe('Prisma Decimal & Module Resolution', () => {
    it('successfully imports server functions and resolves Prisma.Decimal', async () => {
      const serverMod = await import('../server/fns/stock-balances')
      expect(typeof serverMod.listStockBalances).toBe('function')
      expect(typeof serverMod.getStockBalance).toBe('function')
      expect(typeof serverMod.adjustStockBalance).toBe('function')
      expect(typeof serverMod.getStockBalanceMovements).toBe('function')

      const { Prisma } = await import('@/generated/prisma/client')
      const dec = new Prisma.Decimal(123.45)
      expect(dec.toString()).toBe('123.45')
      expect(dec.toNumber()).toBe(123.45)
    })
  })
})

