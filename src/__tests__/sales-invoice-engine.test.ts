import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  toDecimal,
  serializeDecimal,
  serializeInvoiceRecord,
} from '@/server/fns/sales-invoice-engine'
import { Prisma } from '@/generated/prisma/client'
import {
  recordPaymentSchema,
  cancelInvoiceSchema,
  voidInvoiceSchema,
  creditNoteSchema,
  createInvoiceSchema,
} from '@/features/sales-invoices/schemas'

describe('Sales Invoice Engine — Calculations & Serialization', () => {
  it('correctly converts primitives and Decimals to Decimal objects', () => {
    const d1 = toDecimal(10.5)
    expect(d1.toNumber()).toBe(10.5)

    const d2 = toDecimal('25.99')
    expect(d2.toNumber()).toBe(25.99)

    const d3 = toDecimal(null, 0)
    expect(d3.toNumber()).toBe(0)

    const existing = new Prisma.Decimal('100.25')
    const d4 = toDecimal(existing)
    expect(d4).toBe(existing)
  })

  it('serializes Prisma Decimals to numbers for JSON transport', () => {
    expect(serializeDecimal(new Prisma.Decimal('49.99'))).toBe(49.99)
    expect(serializeDecimal(null)).toBe(0)
    expect(serializeDecimal(undefined)).toBe(0)
    expect(serializeDecimal(12.34)).toBe(12.34)
    expect(serializeDecimal('55.50')).toBe(55.5)
  })

  it('recursively serializes invoice records without losing precision', () => {
    const mockInvoice = {
      id: 'inv-123',
      invoice_no: 'INV-2026-000001',
      total_amount: new Prisma.Decimal('150.0000'),
      paid_amount: new Prisma.Decimal('50.0000'),
      due_amount: new Prisma.Decimal('100.0000'),
      sales_invoice_items: [
        {
          id: 'item-1',
          quantity: new Prisma.Decimal('2.0000'),
          unit_price: new Prisma.Decimal('75.0000'),
          line_total: new Prisma.Decimal('150.0000'),
        },
      ],
    }

    const serialized = serializeInvoiceRecord(mockInvoice)
    expect(serialized.total_amount).toBe(150)
    expect(serialized.paid_amount).toBe(50)
    expect(serialized.due_amount).toBe(100)
    expect(serialized.sales_invoice_items[0].quantity).toBe(2)
    expect(serialized.sales_invoice_items[0].unit_price).toBe(75)
    expect(serialized.sales_invoice_items[0].line_total).toBe(150)
  })
})

describe('Sales Invoice Schemas — Validation Constraints', () => {
  it('validates payment recording inputs', () => {
    const valid = recordPaymentSchema.safeParse({
      paymentMethod: 'cash',
      amount: '50.00',
      referenceNumber: 'REF-001',
    })
    expect(valid.success).toBe(true)

    const invalidAmount = recordPaymentSchema.safeParse({
      paymentMethod: 'card',
      amount: 0,
    })
    expect(invalidAmount.success).toBe(false)
  })

  it('enforces cancellation and void accounting explanations', () => {
    const cancelValid = cancelInvoiceSchema.safeParse({
      reason: 'Customer cancelled order prior to dispatch',
    })
    expect(cancelValid.success).toBe(true)

    const cancelInvalid = cancelInvoiceSchema.safeParse({ reason: 'no' })
    expect(cancelInvalid.success).toBe(false)

    const voidValid = voidInvoiceSchema.safeParse({
      reason: 'Billed to incorrect tax registration ID; re-invoicing under correct entity',
    })
    expect(voidValid.success).toBe(true)

    const voidInvalid = voidInvoiceSchema.safeParse({ reason: 'err' })
    expect(voidInvalid.success).toBe(false)
  })

  it('validates manual invoice creation structure', () => {
    const valid = createInvoiceSchema.safeParse({
      customerId: crypto.randomUUID(),
      invoiceType: 'sale',
      items: [
        {
          productVariantId: crypto.randomUUID(),
          quantity: 2,
          unitPrice: 25.5,
        },
      ],
    })
    expect(valid.success).toBe(true)

    const missingItems = createInvoiceSchema.safeParse({
      items: [],
    })
    expect(missingItems.success).toBe(false)
  })
})
