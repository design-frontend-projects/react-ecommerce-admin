import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmOrder } from '@/server/fns/sales-orders'
import { rpcError, ApiError } from '@/server/utils/api-error'
import { supabaseAdmin } from '@/server/supabase'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    sales_orders: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/server/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}))

vi.mock('@/server/utils/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/utils/tenant')>()
  return {
    ...actual,
    requireTenantId: vi.fn().mockResolvedValue('tenant-123'),
    resolveTenantUserId: vi.fn().mockResolvedValue('user-123'),
  }
})

describe('Sales Order Confirmation Lifecycle', () => {
  const orderId = '309b09fe-a938-4a75-81d5-eb63660c6741'
  const userId = 'auth-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.sales_orders.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: orderId,
      tenant_id: 'tenant-123',
      status: 'draft',
    })
  })

  it('successfully confirms order via confirm_sales_order RPC', async () => {
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        order_id: orderId,
        status: 'confirmed',
        items_reserved: 2,
      },
      error: null,
    })

    const result = await confirmOrder(userId, orderId)

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('confirm_sales_order', {
      p_order_id: orderId,
    })
    expect(result).toEqual({
      order_id: orderId,
      status: 'confirmed',
      items_reserved: 2,
    })
  })

  it('translates INSUFFICIENT_STOCK RPC error into a user-friendly 409 ApiError with detail', async () => {
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        message: 'INSUFFICIENT_STOCK|Insufficient stock for variant SKU-TEST (available: 5, requested: 10)',
      },
    })

    await expect(confirmOrder(userId, orderId)).rejects.toThrow(ApiError)
    try {
      await confirmOrder(userId, orderId)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(409)
      expect(apiErr.message).toBe('Insufficient stock for variant SKU-TEST (available: 5, requested: 10)')
    }
  })

  it('translates ORDER_INVALID_TRANSITION RPC error into 400 ApiError', async () => {
    ;(supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        message: 'ORDER_INVALID_TRANSITION|Current status confirmed is not draft',
      },
    })

    try {
      await confirmOrder(userId, orderId)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(400)
      expect(apiErr.message).toBe('Current status confirmed is not draft')
    }
  })

  describe('rpcError helper', () => {
    it('extracts detail and status correctly for known error codes', () => {
      const err = rpcError({
        message: 'ORDER_NOT_FOUND|Order does not exist',
      })
      expect(err.status).toBe(404)
      expect(err.message).toBe('Order does not exist')
    })

    it('falls back to default message if no detail provided', () => {
      const err = rpcError({
        message: 'INSUFFICIENT_STOCK',
      })
      expect(err.status).toBe(409)
      expect(err.message).toBe('This would drive stock negative for one or more variants.')
    })
  })
})
