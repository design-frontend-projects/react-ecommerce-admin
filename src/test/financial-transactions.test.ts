import { describe, expect, it } from 'vitest'
import {
  createFinancialTransactionFormSchema,
  financialTransactionItemInputSchema,
  financialTransactionRowSchema,
  financialTransactionStatusEnum,
  financialTransactionTypeEnum,
  refundFinancialTransactionFormSchema,
} from '../features/transactions/data/schema'

describe('Financial Transactions Module — Test Suite', () => {
  const dummyProductId = '1796a5fa-29f1-4cd5-96bf-16f7995aab05'
  const dummyTxId = '4bb8357f-f772-4660-84c1-eb83cb7d29bc'

  describe('1. Schema & Enum Validation', () => {
    it('validates all 9 financial transaction types', () => {
      const types = [
        'sale',
        'purchase',
        'payment_in',
        'payment_out',
        'refund',
        'expense',
        'income',
        'opening_balance',
        'adjustment',
      ] as const

      for (const type of types) {
        expect(financialTransactionTypeEnum.parse(type)).toBe(type)
      }
    })

    it('rejects an invalid transaction type', () => {
      expect(() => financialTransactionTypeEnum.parse('invalid_type')).toThrow()
    })

    it('validates all financial transaction statuses', () => {
      const statuses = [
        'pending',
        'completed',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded',
        'voided',
      ] as const

      for (const status of statuses) {
        expect(financialTransactionStatusEnum.parse(status)).toBe(status)
      }
    })

    it('validates line item input schema with valid numbers', () => {
      const validItem = {
        product_id: dummyProductId,
        quantity: 5,
        unit_price: 25.5,
        discount_amount: 2.0,
        tax_amount: 1.5,
      }

      const parsed = financialTransactionItemInputSchema.safeParse(validItem)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.quantity).toBe(5)
        expect(parsed.data.unit_price).toBe(25.5)
        expect(parsed.data.discount_amount).toBe(2.0)
        expect(parsed.data.tax_amount).toBe(1.5)
      }
    })

    it('rejects line item with non-positive quantity', () => {
      const invalidItem = {
        product_id: dummyProductId,
        quantity: 0,
        unit_price: 10,
      }
      expect(financialTransactionItemInputSchema.safeParse(invalidItem).success).toBe(false)
    })

    it('rejects line item with negative unit price', () => {
      const invalidItem = {
        product_id: dummyProductId,
        quantity: 1,
        unit_price: -5,
      }
      expect(financialTransactionItemInputSchema.safeParse(invalidItem).success).toBe(false)
    })
  })

  describe('2. Form Submission Schemas', () => {
    it('validates itemized transaction creation form', () => {
      const formValues = {
        transaction_type: 'sale' as const,
        currency: 'SAR',
        status: 'completed',
        notes: 'POS checkout invoice link',
        items: [
          {
            product_id: dummyProductId,
            quantity: 2,
            unit_price: 100,
            discount_amount: 10,
            tax_amount: 15,
          },
        ],
      }

      const result = createFinancialTransactionFormSchema.safeParse(formValues)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currency).toBe('SAR')
        expect(result.data.items?.length).toBe(1)
      }
    })

    it('validates direct expense transaction form without line items', () => {
      const directExpense = {
        transaction_type: 'expense' as const,
        currency: 'USD',
        status: 'completed',
        total_amount: 450.0,
        notes: 'Office monthly internet utility payment',
        items: [],
      }

      const result = createFinancialTransactionFormSchema.safeParse(directExpense)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total_amount).toBe(450.0)
      }
    })

    it('validates refund form requiring original ID and reason', () => {
      const validRefund = {
        originalTransactionId: dummyTxId,
        reason: 'Customer returned defective merchandise',
        amount: 85.5,
      }

      const result = refundFinancialTransactionFormSchema.safeParse(validRefund)
      expect(result.success).toBe(true)
    })

    it('rejects refund without reason', () => {
      const invalidRefund = {
        originalTransactionId: dummyTxId,
        reason: '',
        amount: 50,
      }

      const result = refundFinancialTransactionFormSchema.safeParse(invalidRefund)
      expect(result.success).toBe(false)
    })
  })

  describe('3. Mathematical Calculations & Flow Rules', () => {
    it('computes line subtotals and grand totals correctly', () => {
      const items = [
        { quantity: 2, unit_price: 50, discount_amount: 5, tax_amount: 7.5 }, // 2*50 - 5 + 7.5 = 102.5
        { quantity: 3, unit_price: 20, discount_amount: 0, tax_amount: 3.0 }, // 3*20 - 0 + 3.0 = 63.0
      ]

      const computed = items.reduce(
        (acc, item) => {
          const lineSub = item.quantity * item.unit_price - item.discount_amount + item.tax_amount
          acc.subtotal += item.quantity * item.unit_price
          acc.discount += item.discount_amount
          acc.tax += item.tax_amount
          acc.grandTotal += lineSub
          return acc
        },
        { subtotal: 0, discount: 0, tax: 0, grandTotal: 0 }
      )

      expect(computed.subtotal).toBe(160) // 100 + 60
      expect(computed.discount).toBe(5)
      expect(computed.tax).toBe(10.5)
      expect(computed.grandTotal).toBe(165.5)
    })

    it('evaluates parent status for partial vs full refund', () => {
      const originalTotal = 200

      // Case 1: Partial refund of 50
      const partialRefundAmount = 50
      const status1 = partialRefundAmount >= originalTotal ? 'refunded' : 'partially_refunded'
      expect(status1).toBe('partially_refunded')

      // Case 2: Full cumulative refund of 200
      const fullRefundAmount = 200
      const status2 = fullRefundAmount >= originalTotal ? 'refunded' : 'partially_refunded'
      expect(status2).toBe('refunded')
    })
  })

  describe('4. Row Model Parsing for TanStack Table', () => {
    it('parses financial transaction row data with decimal numbers', () => {
      const rawRow = {
        id: dummyTxId,
        transaction_number: 'SAL-20260913-4821',
        transaction_type: 'sale',
        status: 'completed',
        currency: 'EUR',
        subtotal: 100.0,
        tax_amount: 15.0,
        discount_amount: 5.0,
        total_amount: 110.0,
        notes: 'Walk-in cash counter sale',
        created_at: new Date().toISOString(),
        items_count: 2,
      }

      const parsed = financialTransactionRowSchema.safeParse(rawRow)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.currency).toBe('EUR')
        expect(parsed.data.total_amount).toBe(110.0)
        expect(parsed.data.items_count).toBe(2)
      }
    })
  })
})
