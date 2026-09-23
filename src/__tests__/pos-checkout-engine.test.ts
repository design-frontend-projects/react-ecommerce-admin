import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processPosSale } from '@/server/fns/pos-checkout-engine'
import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    sales_orders: {
      create: vi.fn(),
      update: vi.fn(),
    },
    sales_order_items: {
      createMany: vi.fn(),
    },
    sales_order_payments: {
      createMany: vi.fn(),
    },
    sales_invoices: {
      create: vi.fn(),
    },
    sales_invoice_items: {
      createMany: vi.fn(),
    },
    sales_invoice_payments: {
      createMany: vi.fn(),
    },
    inv_sales_invoice_item_discounts: {
      createMany: vi.fn(),
    },
    inv_sales_invoice_discounts: {
      create: vi.fn(),
    },
    inv_coupons: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    inv_coupon_redemptions: {
      create: vi.fn(),
    },
    inv_promotions: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    inv_promotion_usage_logs: {
      create: vi.fn(),
    },
    pos_cash_movements: {
      create: vi.fn(),
    },
    pos_sessions: {
      update: vi.fn(),
    },
    shipments: {
      create: vi.fn(),
    },
  }

  return {
    default: {
      sales_orders: {
        findFirst: vi.fn(),
      },
      pos_sessions: {
        findFirst: vi.fn(),
      },
      stock_balances: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback: (tx: typeof mockTx) => Promise<any>, options?: any) => {
        return await callback(mockTx)
      }),
      _mockTx: mockTx,
    },
  }
})

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-uuid-123'),
  resolveTenantUserId: vi.fn().mockResolvedValue('user-uuid-123'),
}))

vi.mock('@/server/context/tenant-context', () => ({
  runWithTenantContext: vi.fn().mockImplementation((_ctx, fn) => fn()),
  getOptionalTenantContext: vi.fn().mockReturnValue({ tenantId: 'tenant-uuid-123', userId: 'user-uuid-123' }),
}))

vi.mock('@/server/fns/pos-pricing-resolver', () => ({
  resolvePosChannelId: vi.fn().mockResolvedValue('channel-uuid-123'),
}))

vi.mock('@/server/fns/sales-invoice-engine', () => ({
  generateInvoiceNumber: vi.fn().mockResolvedValue('INV-2026-000001'),
}))

const mockCreateInventoryTransaction = vi.fn()
vi.mock('@/server/fns/inventory-transaction-engine', () => ({
  createInventoryTransaction: (...args: any[]) => mockCreateInventoryTransaction(...args),
}))

describe('POS Checkout Engine with Shipment', () => {
  const userId = 'user-auth-123'
  const sessionId = 'session-uuid-123'
  const terminalId = 'terminal-uuid-123'
  const warehouseId = 'warehouse-uuid-123'
  const variantId = 'variant-uuid-123'
  const stockBalanceId = 'stock-balance-uuid-123'

  const mockTx = (prisma as any)._mockTx

  beforeEach(() => {
    vi.clearAllMocks()

    ;(prisma.sales_orders.findFirst as any).mockResolvedValue(null)
    ;(prisma.pos_sessions.findFirst as any).mockResolvedValue({
      id: sessionId,
      tenant_id: 'tenant-uuid-123',
      terminal_id: terminalId,
      cashier_id: 'user-uuid-123',
      status: 'open',
    })

    ;(prisma.stock_balances.findMany as any).mockResolvedValue([
      {
        id: stockBalanceId,
        product_variant_id: variantId,
        warehouse_id: warehouseId,
        tenant_id: 'tenant-uuid-123',
        qty_on_hand: new Prisma.Decimal(10),
        qty_available: new Prisma.Decimal(10),
      },
    ])

    mockTx.sales_orders.create.mockResolvedValue({
      id: 'order-uuid-999',
      order_number: 'SO-000123',
    })

    mockTx.sales_invoices.create.mockResolvedValue({
      id: 'inv-uuid-999',
      invoice_no: 'INV-2026-000001',
    })

    mockTx.shipments.create.mockResolvedValue({
      id: 'shipment-uuid-999',
      status: 'prepared',
    })

    mockCreateInventoryTransaction.mockResolvedValue({
      transaction: { id: 'inv-txn-123' },
    })
  })

  it('completes sale with shipment details, creating shipment and passing direct stock balance id', async () => {
    const input = {
      terminalId,
      sessionId,
      warehouseId,
      items: [
        {
          productVariantId: variantId,
          sku: 'SKU-COFFEE-01',
          productName: 'Coffee Beans',
          quantity: 2,
          unitPrice: 15,
          unitCost: 8,
          discountAmount: 0,
          taxAmount: 3,
        },
      ],
      payments: [
        {
          method: 'card' as const,
          amount: 33,
        },
      ],
      isShipment: true,
      shipment: {
        recipientName: 'John Doe',
        recipientPhone: '+1-555-0199',
        deliveryAddress: '123 Main St, Apt 4B',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        carrier: 'FedEx Express',
        notes: 'Leave at front porch',
      },
    }

    const result = await processPosSale(userId, input)

    // Verify transaction options were supplied with extended timeout
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxWait: 15000,
        timeout: 30000,
      })
    )

    // Verify order was created
    expect(mockTx.sales_orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          warehouse_id: warehouseId,
          subtotal: expect.any(Prisma.Decimal),
          total_amount: expect.any(Prisma.Decimal),
        }),
      })
    )

    // Verify shipment was created inside transaction with serialized notes
    expect(mockTx.shipments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          carrier: 'FedEx Express',
          status: 'prepared',
          notes: expect.stringContaining('123 Main St, Apt 4B'),
        }),
      })
    )

    // Verify inventory transaction was posted passing stockBalanceId for fast indexed lookup
    expect(mockCreateInventoryTransaction).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        typeCode: 'SALE_POS',
        autoPost: true,
        items: [
          expect.objectContaining({
            productVariantId: variantId,
            stockBalanceId: stockBalanceId,
            skuSnapshot: 'SKU-COFFEE-01',
            productNameSnapshot: 'Coffee Beans',
          }),
        ],
      }),
      mockTx
    )

    // Verify result contains both invoiceNo and invoiceNumber as well as shipmentId
    expect(result.orderNumber).toBe('SO-000123')
    expect(result.invoiceNo).toBe('INV-2026-000001')
    expect(result.invoiceNumber).toBe('INV-2026-000001')
    expect(result.shipmentId).toBe('shipment-uuid-999')
  })

  it('completes normal sale without shipment when isShipment is false', async () => {
    const input = {
      terminalId,
      sessionId,
      warehouseId,
      items: [
        {
          productVariantId: variantId,
          sku: 'SKU-TEA-01',
          productName: 'Green Tea',
          quantity: 1,
          unitPrice: 10,
          unitCost: 5,
          discountAmount: 0,
          taxAmount: 1,
        },
      ],
      payments: [
        {
          method: 'cash' as const,
          amount: 11,
        },
      ],
      isShipment: false,
    }

    const result = await processPosSale(userId, input)

    expect(mockTx.shipments.create).not.toHaveBeenCalled()
    expect(result.shipmentId).toBeNull()
    expect(result.orderNumber).toBe('SO-000123')
  })

  it('records coupon redemption, increments coupon usages, creates promotion usage log and increments promotion current_usage_count', async () => {
    const couponId = 'coupon-uuid-101'
    const promoId = 'promo-uuid-202'
    const couponCode = 'SAVE10'

    mockTx.inv_coupons.findFirst.mockResolvedValue({
      id: couponId,
      promotion_id: promoId,
      code: couponCode,
    })

    const input = {
      terminalId,
      sessionId,
      warehouseId,
      couponCode,
      orderDiscountAmount: 5,
      items: [
        {
          productVariantId: variantId,
          sku: 'SKU-COFFEE-01',
          productName: 'Coffee Beans',
          quantity: 1,
          unitPrice: 20,
          unitCost: 10,
          discountAmount: 0,
          taxAmount: 2,
        },
      ],
      payments: [
        {
          method: 'cash' as const,
          amount: 17, // 20 - 5 + 2 = 17
        },
      ],
    }

    const result = await processPosSale(userId, input)

    // Coupon redemption created
    expect(mockTx.inv_coupon_redemptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coupon_id: couponId,
          promotion_id: promoId,
          discount_amount: expect.any(Prisma.Decimal),
        }),
      })
    )

    // Coupon current_usages incremented
    expect(mockTx.inv_coupons.update).toHaveBeenCalledWith({
      where: { id: couponId },
      data: { current_usages: { increment: 1 } },
    })

    // Invoice-level discount recorded with coupon source
    expect(mockTx.inv_sales_invoice_discounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promotion_id: promoId,
          coupon_id: couponId,
          discount_source: 'coupon',
          reason: `Coupon: ${couponCode}`,
        }),
      })
    )

    // Promotion usage log created
    expect(mockTx.inv_promotion_usage_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promotion_id: promoId,
          discount_amount: expect.any(Prisma.Decimal),
        }),
      })
    )

    // Promotion current_usage_count incremented (and NO current_discount_amount)
    expect(mockTx.inv_promotions.update).toHaveBeenCalledWith({
      where: { id: promoId },
      data: {
        current_usage_count: { increment: 1 },
      },
    })

    expect(result.orderNumber).toBe('SO-000123')
  })

  it('records promotion usage and increments current_usage_count when direct promo code is supplied without coupon', async () => {
    const promoId = 'promo-direct-303'
    const promoCode = 'SUMMERPROMO'

    mockTx.inv_coupons.findFirst.mockResolvedValue(null)
    mockTx.inv_promotions.findFirst.mockResolvedValue({
      id: promoId,
    })

    const input = {
      terminalId,
      sessionId,
      warehouseId,
      couponCode: promoCode,
      orderDiscountAmount: 3,
      items: [
        {
          productVariantId: variantId,
          sku: 'SKU-COFFEE-01',
          productName: 'Coffee Beans',
          quantity: 1,
          unitPrice: 15,
          unitCost: 8,
          discountAmount: 0,
          taxAmount: 1.5,
        },
      ],
      payments: [
        {
          method: 'cash' as const,
          amount: 13.5,
        },
      ],
    }

    const result = await processPosSale(userId, input)

    // Coupon redemption should NOT be called
    expect(mockTx.inv_coupon_redemptions.create).not.toHaveBeenCalled()
    expect(mockTx.inv_coupons.update).not.toHaveBeenCalled()

    // Invoice discount recorded with promotion source
    expect(mockTx.inv_sales_invoice_discounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promotion_id: promoId,
          coupon_id: null,
          discount_source: 'promotion',
        }),
      })
    )

    // Promotion usage log created
    expect(mockTx.inv_promotion_usage_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promotion_id: promoId,
        }),
      })
    )

    // Promotion current_usage_count incremented
    expect(mockTx.inv_promotions.update).toHaveBeenCalledWith({
      where: { id: promoId },
      data: {
        current_usage_count: { increment: 1 },
      },
    })

    expect(result.orderNumber).toBe('SO-000123')
  })
})
