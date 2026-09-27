import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessEventNotifications } from '@/server/services/business-event-notifications'
import { setPurchaseOrderStatus } from '@/server/fns/purchase-orders'
import { postReceipt } from '@/server/fns/goods-receipts'
import { createCustomer } from '@/server/fns/customers'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'

vi.mock('@/server/services/business-event-notifications', () => ({
  BusinessEventNotifications: {
    notifyPurchaseOrderApproved: vi.fn(),
    notifyPurchaseOrderReceived: vi.fn(),
    notifyPurchaseOrderStatusChanged: vi.fn(),
    notifyGoodsReceiptConfirmed: vi.fn(),
    notifyCustomerCreated: vi.fn(),
    notifySupplierCreated: vi.fn(),
    notifyLowStockThreshold: vi.fn(),
    notifyReorderSuggestionGenerated: vi.fn(),
    notifyProductExpiring: vi.fn(),
  },
}))

vi.mock('@/server/supabase', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000001'),
  resolveTenantUserId: vi.fn().mockResolvedValue('11111111-1111-1111-1111-111111111111'),
  resolveTenantId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000001'),
  isValidUuid: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    purchase_orders: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    goods_receipts: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    customers: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

describe('Business Event Server Function Wiring Integration', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const userId = '11111111-1111-1111-1111-111111111111'
  const poId = '22222222-2222-2222-2222-222222222222'
  const receiptId = '33333333-3333-3333-3333-333333333333'
  const customerId = '77777777-7777-7777-7777-777777777777'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires setPurchaseOrderStatus to dispatch notifyPurchaseOrderApproved when approved', async () => {
    vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
      id: poId,
      po_number: 'PO-999',
      lifecycle_status: 'draft',
      grand_total: 1200 as any,
      total_amount: 1200 as any,
      suppliers: { name: 'Acme Supplies' },
    } as any)

    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: { success: true }, error: null } as any)
    vi.mocked(prisma.purchase_orders.update).mockResolvedValue({ id: poId } as any)

    await setPurchaseOrderStatus(userId, poId, 'approved')

    expect(BusinessEventNotifications.notifyPurchaseOrderApproved).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        poId,
        poNumber: 'PO-999',
        supplierName: 'Acme Supplies',
        totalAmount: 1200,
        createdByUserId: userId,
      })
    )
  })

  it('wires setPurchaseOrderStatus to dispatch notifyPurchaseOrderReceived when received', async () => {
    vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
      id: poId,
      po_number: 'PO-999',
      lifecycle_status: 'sent',
      grand_total: 1200 as any,
      total_amount: 1200 as any,
      suppliers: { name: 'Acme Supplies' },
    } as any)

    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: { success: true }, error: null } as any)
    vi.mocked(prisma.purchase_orders.update).mockResolvedValue({ id: poId } as any)

    await setPurchaseOrderStatus(userId, poId, 'received')

    expect(BusinessEventNotifications.notifyPurchaseOrderReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        poId,
        poNumber: 'PO-999',
        supplierName: 'Acme Supplies',
        createdByUserId: userId,
      })
    )
  })

  it('wires postReceipt to dispatch notifyGoodsReceiptConfirmed', async () => {
    vi.mocked(prisma.goods_receipts.findFirst).mockResolvedValue({
      id: receiptId,
      receipt_number: 'GR-100',
      status: 'draft',
      purchase_order_id: poId,
      warehouse_id: 'wh-1',
      warehouses: { name: 'East Coast DC' },
      purchase_orders: { po_number: 'PO-999' },
      goods_receipt_items: [
        { id: 'item-1', qty_received: 1, accepted_qty: 1, rejected_qty: 0 },
        { id: 'item-2', qty_received: 1, accepted_qty: 1, rejected_qty: 0 },
        { id: 'item-3', qty_received: 1, accepted_qty: 1, rejected_qty: 0 },
        { id: 'item-4', qty_received: 1, accepted_qty: 1, rejected_qty: 0 },
      ],
      _count: { goods_receipt_items: 4 },
    } as any)

    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ post_goods_receipt: { id: receiptId, status: 'posted' } }])
    vi.mocked(prisma.goods_receipts.update).mockResolvedValue({ id: receiptId } as any)
    vi.mocked(prisma.purchase_orders.findUnique).mockResolvedValue({
      id: poId,
      po_number: 'PO-999',
      lifecycle_status: 'received',
      purchase_order_items: [],
    } as any)

    await postReceipt(userId, receiptId)

    expect(BusinessEventNotifications.notifyGoodsReceiptConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        receiptId,
        receiptNumber: 'GR-100',
        poNumber: 'PO-999',
        warehouseName: 'East Coast DC',
        warehouseId: 'wh-1',
        itemsCount: 4,
        userId,
      })
    )
  })

  it('wires createCustomer to dispatch notifyCustomerCreated', async () => {
    vi.mocked(prisma.customers.create).mockResolvedValue({
      id: customerId,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    } as any)

    await createCustomer(userId, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    })

    expect(BusinessEventNotifications.notifyCustomerCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        customerId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        createdByUserId: userId,
      })
    )
  })
})
