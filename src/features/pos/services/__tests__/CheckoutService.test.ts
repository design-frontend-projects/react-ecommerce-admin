import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processCheckout } from '../CheckoutService'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    product_variants: { findMany: vi.fn().mockResolvedValue([]) },
    sales_invoices: { update: vi.fn() },
    transactions: { update: vi.fn() },
  },
}))

vi.mock('@/server/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-uuid'),
}))

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.product_variants.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    })
  })

  it('processing checkout correctly via transaction + movement engine', async () => {
    const mockDbTx = vi.fn().mockResolvedValue({
      invoice: { id: 'inv-uuid', invoice_no: 'SAL-20261010-1234' },
      transactionRec: { id: 'txn-uuid' },
    })

    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (_callback) => mockDbTx()
    )

    const payload: any = {
      branchId: 'b-uuid',
      storeId: 's-uuid',
      paymentMethod: 'cash',
      items: [
        {
          productId: 1,
          productVariantId: 'v-uuid',
          quantity: 2,
          unitPrice: 100,
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
      subtotal: 200,
      totalAmount: 200,
      discountTotal: 0,
      taxTotal: 0,
    }

    const res = await processCheckout(payload, 'user-uuid')

    expect(res.success).toBe(true)
    expect(res.invoiceNo).toBe('SAL-20261010-1234')
    expect(prisma.$transaction).toHaveBeenCalled()
    // stock effect goes through the movement engine, never direct writes
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'apply_inventory_movements',
      expect.objectContaining({
        p_movements: expect.arrayContaining([
          expect.objectContaining({
            movement_type: 'sale',
            product_variant_id: 'v-uuid',
            qty: 2,
            idempotency_key: 'pos:inv-uuid:v-uuid',
          }),
        ]),
      })
    )
  })

  it('compensates the invoice when the movement engine rejects', async () => {
    const mockDbTx = vi.fn().mockResolvedValue({
      invoice: { id: 'inv-uuid', invoice_no: 'SAL-20261010-1234' },
      transactionRec: { id: 'txn-uuid' },
    })
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (_callback) => mockDbTx()
    )
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'INSUFFICIENT_STOCK|v-uuid' },
    })

    const payload: any = {
      branchId: 'b-uuid',
      storeId: 's-uuid',
      paymentMethod: 'cash',
      items: [
        {
          productId: 1,
          productVariantId: 'v-uuid',
          quantity: 2,
          unitPrice: 100,
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
      subtotal: 200,
      totalAmount: 200,
      discountTotal: 0,
      taxTotal: 0,
    }

    const res = await processCheckout(payload, 'user-uuid')

    expect(res.success).toBe(false)
    expect(prisma.sales_invoices.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'cancelled' } })
    )
    expect(prisma.transactions.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } })
    )
  })
})
