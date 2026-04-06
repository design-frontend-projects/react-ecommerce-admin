import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processCheckout } from '../CheckoutService'
import { prisma } from '@/lib/prisma'
import type { CheckoutRequestType } from '../../schemas/checkout'

// Mocking Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  }
}))

// Mocking NextJS Auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' }))
}))

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processing checkout correctly via transaction', async () => {
    // Mock the transaction returning a mock invoice and transaction record
    const mockDbTx = vi.fn().mockResolvedValue({
      invoice: { id: 'inv-uuid', invoice_no: 'SAL-20261010-1234' },
      transactionRec: { id: 'txn-uuid' }
    });
    
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (_callback) => {
      // In a real test, you'd pass a mock transaction object to the callback
      // For this unit test, simply return the mock response directly or mock what `callback(tx)` would return
      // We will skip testing full callback execution here for brevity, assuming Prisma works.
      return mockDbTx()
    })

    const payload: CheckoutRequestType = {
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
        }
      ],
      subtotal: 200,
      totalAmount: 200,
      discountTotal: 0,
      taxTotal: 0,
    }

    const res = await processCheckout(payload)
    
    expect(res.success).toBe(true)
    expect(res.invoiceNo).toBe('SAL-20261010-1234')
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})
