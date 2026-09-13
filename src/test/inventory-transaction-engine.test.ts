import { describe, it, expect } from 'vitest'
import {
  createTransactionInputSchema,
  transactionStatusSchema,
  transactionDirectionSchema,
  transactionCategorySchema,
} from '../features/inventory-transactions/data/schema'
import { INVENTORY_TRANSACTION_TYPES_SEED } from '../../prisma/seed-inventory-transaction-types'

describe('Inventory Transaction Engine — Schema & Business Rules Suite', () => {
  const dummyVariantId = '1796a5fa-29f1-4cd5-96bf-16f7995aab05'
  const dummyWarehouseId = '4bb8357f-f772-4660-84c1-eb83cb7d29bc'

  describe('Validation Schemas', () => {
    it('validates a valid inventory transaction input', () => {
      const input = {
        typeCode: 'PURCHASE_RECEIPT',
        destWarehouseId: dummyWarehouseId,
        notes: 'Initial receipt for PO-1002',
        autoPost: true,
        items: [
          {
            productVariantId: dummyVariantId,
            quantity: 25,
            unitCost: 14.5,
            condition: 'good' as const,
            notes: 'Batch inspection passed',
          },
        ],
      }

      const result = createTransactionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.typeCode).toBe('PURCHASE_RECEIPT')
        expect(result.data.items[0].quantity).toBe(25)
        expect(result.data.items[0].unitCost).toBe(14.5)
      }
    })

    it('rejects an inventory transaction with non-positive quantity', () => {
      const input = {
        typeCode: 'SALE_POS',
        sourceWarehouseId: dummyWarehouseId,
        items: [
          {
            productVariantId: dummyVariantId,
            quantity: 0,
          },
        ],
      }

      const result = createTransactionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects an inventory transaction with empty items array', () => {
      const input = {
        typeCode: 'ADJUSTMENT_IN',
        destWarehouseId: dummyWarehouseId,
        items: [],
      }

      const result = createTransactionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('validates transaction statuses and directions', () => {
      expect(transactionStatusSchema.parse('posted')).toBe('posted')
      expect(transactionStatusSchema.parse('draft')).toBe('draft')
      expect(transactionStatusSchema.parse('reversed')).toBe('reversed')
      expect(transactionStatusSchema.parse('cancelled')).toBe('cancelled')

      expect(transactionDirectionSchema.parse('inbound')).toBe('inbound')
      expect(transactionDirectionSchema.parse('outbound')).toBe('outbound')
      expect(transactionDirectionSchema.parse('internal')).toBe('internal')

      expect(transactionCategorySchema.parse('purchase')).toBe('purchase')
      expect(transactionCategorySchema.parse('sale')).toBe('sale')
      expect(transactionCategorySchema.parse('adjustment')).toBe('adjustment')
    })
  })

  describe('Inventory Transaction Seed Definitions', () => {
    it('contains all 17 required transaction types', () => {
      expect(INVENTORY_TRANSACTION_TYPES_SEED.length).toBe(17)

      const codes = INVENTORY_TRANSACTION_TYPES_SEED.map((t) => t.code)
      expect(codes).toContain('PURCHASE_RECEIPT')
      expect(codes).toContain('PURCHASE_RETURN')
      expect(codes).toContain('SALE_POS')
      expect(codes).toContain('SALE_ORDER_FULFILLMENT')
      expect(codes).toContain('SALE_RETURN')
      expect(codes).toContain('TRANSFER_SHIPMENT')
      expect(codes).toContain('TRANSFER_RECEIPT')
      expect(codes).toContain('STOCK_RESERVATION')
      expect(codes).toContain('STOCK_UNRESERVATION')
      expect(codes).toContain('ADJUSTMENT_IN')
      expect(codes).toContain('ADJUSTMENT_OUT')
      expect(codes).toContain('DAMAGE_WRITE_OFF')
      expect(codes).toContain('EXPIRY_SCRAP')
      expect(codes).toContain('MARKETPLACE_ORDER')
      expect(codes).toContain('PRODUCTION_CONSUMPTION')
      expect(codes).toContain('PRODUCTION_OUTPUT')
      expect(codes).toContain('OPENING_BALANCE')
    })

    it('ensures each transaction type has corresponding stock mutation rules', () => {
      for (const item of INVENTORY_TRANSACTION_TYPES_SEED) {
        expect(item.rules.length).toBeGreaterThan(0)
        for (const rule of item.rules) {
          expect(['ON_HAND', 'AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'DAMAGED']).toContain(
            rule.stock_field
          )
          expect(['ADD', 'SUBTRACT', 'NONE']).toContain(rule.operation)
          expect(['SOURCE', 'DESTINATION', 'BOTH']).toContain(rule.applies_to)
        }
      }
    })
  })
})
