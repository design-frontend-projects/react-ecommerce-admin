import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before importing server functions
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    purchase_orders: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    purchase_order_items: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    goods_receipts: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    goods_receipt_items: {
      create: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    goods_receipt_item_serials: {
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    warehouses: {
      findFirst: vi.fn(),
    },
    warehouse_locations: {
      findMany: vi.fn(),
    },
    product_batches: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    product_serials: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn(),
    },
    inventory_movements: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventory_movement_serials: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
  }
  return { default: mockPrisma }
})

// Mock authentication & tenant utils
vi.mock('@/server/utils/tenant', () => ({
  requireTenantId: vi.fn(async (userId: string) => {
    if (userId === 'tenant-b-user') return '00000000-0000-0000-0000-000000000002'
    return '00000000-0000-0000-0000-000000000001'
  }),
  resolveTenantUserId: vi.fn(async (userId: string) => {
    if (userId === 'tenant-b-user') return '11111111-1111-1111-1111-111111111112'
    return '11111111-1111-1111-1111-111111111111'
  }),
  isValidUuid: vi.fn((val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  ),
}))

// Mock Redis client
vi.mock('@/server/redis/redis-client', () => ({
  getRedisPublisher: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(1),
  })),
  getRedisClient: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
  })),
}))

import prisma from '@/lib/prisma'
import {
  searchReceivablePurchaseOrders,
  getPurchaseOrderReceivingDetails,
  createReceipt,
  postReceipt,
  cancelReceipt,
} from '@/server/fns/goods-receipts'
import { GoodsReceiptEvents } from '@/server/services/goods-receipt-events'

describe('Enhanced Goods Receipt / Purchase Receiving Module', () => {
  const tenantA = '00000000-0000-0000-0000-000000000001'
  const authUserA = 'user-a'
  const authUserB = 'tenant-b-user'

  const mockPoId = 'a1111111-1111-1111-1111-111111111111'
  const mockPoItemId = 'b1111111-1111-1111-1111-111111111111'
  const mockVariantId = 'c1111111-1111-1111-1111-111111111111'
  const mockWarehouseId = 'd1111111-1111-1111-1111-111111111111'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Purchase Order Search & Tenant Isolation', () => {
    it('searches receivable POs by text query with server-side pagination and lifecycle status filter', async () => {
      const mockPOs = [
        {
          id: mockPoId,
          po_number: 1001,
          order_date: new Date('2026-09-01'),
          expected_delivery_date: new Date('2026-09-05'),
          lifecycle_status: 'approved',
          currency: 'USD',
          total_amount: 5000,
          warehouse_id: mockWarehouseId,
          supplier_id: 's1',
          suppliers: { id: 's1', name: 'Global Tech Suppliers', code: 'SUP-001' },
          warehouses: { id: mockWarehouseId, name: 'Central Warehouse', code: 'WH-01' },
          purchase_order_items: [
            {
              quantity_ordered: 100,
              received_quantity: 40,
              cancelled_qty: 0,
              product_variants: {
                id: mockVariantId,
                sku: 'TECH-100',
                barcode: '8930001',
                name: 'Laptop 16-inch',
                products: { name: 'Pro Laptop', sku: 'LAPTOP-PRO' },
              },
            },
          ],
        },
      ]

      vi.mocked(prisma.purchase_orders.count).mockResolvedValue(1)
      vi.mocked(prisma.purchase_orders.findMany).mockResolvedValue(mockPOs as any)

      const res = await searchReceivablePurchaseOrders(authUserA, {
        query: 'Global',
        page: 1,
        limit: 10,
      })

      expect(res.pagination.total).toBe(1)
      expect(res.items).toHaveLength(1)
      expect(res.items[0].po_number).toBe(1001)
      expect(res.items[0].ordered_quantity).toBe(100)
      expect(res.items[0].received_quantity).toBe(40)
      expect(res.items[0].remaining_quantity).toBe(60)
    })

    it('enforces tenant boundary during PO search', async () => {
      vi.mocked(prisma.purchase_orders.findMany).mockResolvedValue([])
      vi.mocked(prisma.purchase_orders.count).mockResolvedValue(0)

      await searchReceivablePurchaseOrders(authUserA, { query: 'PO' })

      expect(prisma.purchase_orders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: tenantA,
          }),
        })
      )
    })
  })

  describe('2. PO Receiving Details Calculation', () => {
    it('correctly calculates remaining quantity, line status, and joins batches/history', async () => {
      const mockPoWithLines = {
        id: mockPoId,
        po_number: 1002,
        order_date: new Date('2026-09-10'),
        expected_delivery_date: new Date('2026-09-15'),
        currency: 'USD',
        lifecycle_status: 'partially_received',
        total_amount: 10000,
        supplier_id: 's1',
        warehouse_id: mockWarehouseId,
        notes: 'Priority air shipment',
        suppliers: { id: 's1', name: 'Fresh Foods Ltd', code: 'FF-01', email: 'info@fresh.com', phone: '123' },
        warehouses: { id: mockWarehouseId, name: 'Cold Storage', code: 'WH-CS' },
        purchase_order_items: [
          {
            id: mockPoItemId,
            po_id: mockPoId,
            line_no: 1,
            product_variant_id: mockVariantId,
            quantity_ordered: 200,
            received_quantity: 50,
            cancelled_qty: 0,
            unit_cost: 20,
            total_amount: 4000,
            product_variants: {
              id: mockVariantId,
              sku: 'MILK-1L',
              barcode: '12345678',
              name: 'Whole Milk 1L',
              is_batch_tracked: true,
              is_serial_tracked: false,
              has_expiration: true,
              products: { id: 'p1', name: 'Dairy Milk', sku: 'MILK' },
            },
            uoms: { id: 'u1', name: 'Bottle', code: 'BTL' },
          },
        ],
      }

      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue(mockPoWithLines as any)
      vi.mocked(prisma.product_batches.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          product_variant_id: mockVariantId,
          batch_number: 'LOT-2026-001',
          expiry_date: new Date('2027-01-01'),
        } as any,
      ])
      vi.mocked(prisma.goods_receipts.findMany).mockResolvedValue([
        {
          id: 'gr-prev-1',
          receipt_number: 'GR-20260901-001',
          status: 'posted',
          received_date: new Date('2026-09-12'),
          warehouses: { id: mockWarehouseId, name: 'Cold Storage', code: 'WH-CS' },
          goods_receipt_items: [{ qty_received: 50, accepted_qty: 50, rejected_qty: 0 }],
        } as any,
      ])

      const details = await getPurchaseOrderReceivingDetails(authUserA, mockPoId)

      expect(details.header.po_number).toBe(1002)
      expect(details.summary.ordered_quantity).toBe(200)
      expect(details.summary.received_quantity).toBe(50)
      expect(details.summary.remaining_quantity).toBe(150)
      expect(details.items[0].remaining_quantity).toBe(150)
      expect(details.items[0].receiving_status).toBe('partially_received')
      expect(details.items[0].is_batch_tracked).toBe(true)
      expect(details.items[0].available_batches).toHaveLength(1)
      expect(details.receipts_history).toHaveLength(1)
    })
  })

  describe('3. Quantity Validations & Over-Receiving Prevention', () => {
    it('rejects receiving quantity that exceeds remaining PO item quantity', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 100,
            received_quantity: 80,
            cancelled_qty: 0,
            product_variant_id: mockVariantId,
            product_variants: { is_batch_tracked: false, is_serial_tracked: false },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Main WH',
      } as any)

      // Remaining is 20, but client requests 25
      const promise = createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 25,
            acceptedQty: 25,
            rejectedQty: 0,
          },
        ],
      })

      await expect(promise).rejects.toThrow(/exceeds remaining quantity \(20\)/)
    })

    it('rejects if acceptedQty + rejectedQty != qtyReceived', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 100,
            received_quantity: 0,
            cancelled_qty: 0,
            product_variant_id: mockVariantId,
            product_variants: { is_batch_tracked: false, is_serial_tracked: false },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Main WH',
      } as any)

      const promise = createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 50,
            acceptedQty: 40,
            rejectedQty: 5, // 40 + 5 = 45 != 50
          },
        ],
      })

      await expect(promise).rejects.toThrow(/must equal Received quantity/)
    })
  })

  describe('4. Batch & Serial Validations', () => {
    it('validates serial numbers count equals accepted quantity for serial-tracked items', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 10,
            received_quantity: 0,
            cancelled_qty: 0,
            product_variant_id: mockVariantId,
            product_variants: {
              name: 'iPhone 15',
              sku: 'IPHONE-15',
              is_batch_tracked: false,
              is_serial_tracked: true,
            },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Main WH',
      } as any)

      // Accepted = 3, but only 2 serials provided
      const promise = createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 3,
            acceptedQty: 3,
            rejectedQty: 0,
            serials: ['SN-001', 'SN-002'],
          },
        ],
      })

      await expect(promise).rejects.toThrow(/Expected 3 serial numbers for accepted items, but received 2/)
    })

    it('rejects duplicate serial numbers within the same receiving item', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 10,
            received_quantity: 0,
            cancelled_qty: 0,
            product_variant_id: mockVariantId,
            product_variants: {
              name: 'iPhone 15',
              sku: 'IPHONE-15',
              is_batch_tracked: false,
              is_serial_tracked: true,
            },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Main WH',
      } as any)

      const promise = createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 2,
            acceptedQty: 2,
            rejectedQty: 0,
            serials: ['SN-001', 'SN-001'], // Duplicate
          },
        ],
      })

      await expect(promise).rejects.toThrow(/Duplicate serial numbers detected/)
    })

    it('successfully creates product_serials without warehouse_id and links serials', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 10,
            received_quantity: 0,
            cancelled_qty: 0,
            unit_cost: 150,
            product_variant_id: mockVariantId,
            product_variants: {
              id: mockVariantId,
              name: 'iPhone 15',
              sku: 'IPHONE-15',
              is_batch_tracked: false,
              is_serial_tracked: true,
            },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Main WH',
      } as any)

      vi.mocked(prisma.product_serials.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.goods_receipts.create).mockResolvedValue({
        id: 'new-gr-id',
        receipt_number: 'GR-20260928-001',
        warehouse_id: mockWarehouseId,
        received_date: new Date('2026-09-28'),
      } as any)

      vi.mocked(prisma.goods_receipt_items.create).mockResolvedValue({
        id: 'new-gri-id',
        goods_receipt_id: 'new-gr-id',
      } as any)

      vi.mocked(prisma.product_serials.create).mockResolvedValue({
        id: 'new-serial-1',
        serial_number: 'SN-001',
      } as any)

      vi.mocked(prisma.goods_receipt_item_serials.create).mockResolvedValue({
        id: 'link-1',
      } as any)

      vi.mocked(prisma.goods_receipts.findFirst).mockResolvedValue({
        id: 'new-gr-id',
        receipt_number: 'GR-20260928-001',
        status: 'draft',
        warehouse_id: mockWarehouseId,
        goods_receipt_items: [],
      } as any)

      await createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 1,
            acceptedQty: 1,
            rejectedQty: 0,
            serials: ['SN-001'],
          },
        ],
      })

      expect(prisma.product_serials.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenant_id: tenantA,
            product_variant_id: mockVariantId,
            serial_number: 'SN-001',
            status: 'in_stock',
          }),
        ]),
      })

      // Verify warehouse_id is NOT in the create payload
      const createCall = vi.mocked(prisma.product_serials.createMany).mock.calls[0][0]
      const serialData = (createCall as any).data[0]
      expect(serialData).not.toHaveProperty('warehouse_id')
      expect(serialData.received_reference_type).toBe('goods_receipt')
      expect(serialData.received_reference_id).toBe('new-gr-id')

      // Verify transaction options specify extended timeout
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxWait: 15000,
          timeout: 30000,
        })
      )
    })

    it('rejects warehouse location that belongs to a different warehouse', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockResolvedValue({
        id: mockPoId,
        lifecycle_status: 'approved',
        purchase_order_items: [
          {
            id: mockPoItemId,
            quantity_ordered: 10,
            received_quantity: 0,
            cancelled_qty: 0,
            product_variant_id: mockVariantId,
            product_variants: { is_batch_tracked: false, is_serial_tracked: false },
          },
        ],
      } as any)

      vi.mocked(prisma.warehouses.findFirst).mockResolvedValue({
        id: mockWarehouseId,
        name: 'Central Warehouse',
      } as any)

      // Location search returns empty for mockWarehouseId
      vi.mocked(prisma.warehouse_locations.findMany).mockResolvedValue([])

      const promise = createReceipt(authUserA, {
        purchaseOrderId: mockPoId,
        warehouseId: mockWarehouseId,
        items: [
          {
            purchaseOrderItemId: mockPoItemId,
            qtyReceived: 5,
            acceptedQty: 5,
            rejectedQty: 0,
            warehouseLocationId: 'foreign-location-id',
          },
        ],
      })

      await expect(promise).rejects.toThrow(/Warehouse location does not belong to the selected warehouse/)
    })
  })

  describe('5. Posting Idempotency & Redis Event Publishing', () => {
    it('prevents duplicate posting of an already posted receipt', async () => {
      vi.mocked(prisma.goods_receipts.findFirst).mockResolvedValue({
        id: 'gr-already-posted',
        status: 'posted',
        tenant_id: tenantA,
      } as any)

      const promise = postReceipt(authUserA, 'gr-already-posted')
      await expect(promise).rejects.toThrow(/has already been posted/)
    })

    it('publishes Redis events strictly after transaction commit', async () => {
      const mockReceipt = {
        id: 'gr-to-post',
        receipt_number: 'GR-20260927-1234',
        status: 'draft',
        tenant_id: tenantA,
        purchase_order_id: mockPoId,
        warehouse_id: mockWarehouseId,
        warehouses: { id: mockWarehouseId, name: 'Main WH' },
        purchase_orders: { id: mockPoId, po_number: 1005, lifecycle_status: 'approved' },
        goods_receipt_items: [
          {
            qty_received: 100,
            accepted_qty: 90,
            rejected_qty: 10,
          },
        ],
      }

      vi.mocked(prisma.goods_receipts.findFirst).mockResolvedValue(mockReceipt as any)
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ post_goods_receipt: { status: 'posted' } }])
      vi.mocked(prisma.goods_receipts.update).mockResolvedValue({} as any)
      vi.mocked(prisma.purchase_orders.findUnique).mockResolvedValue({
        id: mockPoId,
        po_number: 1005,
        lifecycle_status: 'partially_received',
        purchase_order_items: [{ quantity_ordered: 200, received_quantity: 100, cancelled_qty: 0 }],
      } as any)

      const publishSpy = vi.spyOn(GoodsReceiptEvents, 'publishReceiptPosted').mockResolvedValue()

      const res = await postReceipt(authUserA, 'gr-to-post')

      expect(res.success).toBe(true)
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          goodsReceiptId: 'gr-to-post',
          receiptNumber: 'GR-20260927-1234',
          totalAccepted: 90,
          totalRejected: 10,
          poLifecycleStatus: 'partially_received',
        })
      )
    })

    it('cancels draft receipt and publishes cancelled event', async () => {
      vi.mocked(prisma.goods_receipts.findFirst).mockResolvedValue({
        id: 'gr-draft-1',
        receipt_number: 'GR-001',
        status: 'draft',
        tenant_id: tenantA,
      } as any)

      vi.mocked(prisma.goods_receipts.update).mockResolvedValue({
        id: 'gr-draft-1',
        status: 'cancelled',
      } as any)

      const cancelSpy = vi.spyOn(GoodsReceiptEvents, 'publishReceiptCancelled').mockResolvedValue()

      await cancelReceipt(authUserA, 'gr-draft-1')

      expect(cancelSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          goodsReceiptId: 'gr-draft-1',
          receiptNumber: 'GR-001',
        })
      )
    })
  })

  describe('6. Cross-Tenant Security', () => {
    it('blocks Tenant B from accessing or receiving Tenant A Purchase Order', async () => {
      vi.mocked(prisma.purchase_orders.findFirst).mockImplementation(async (args: any) => {
        if (args.where.tenant_id === tenantA) {
          return { id: mockPoId, tenant_id: tenantA } as any
        }
        return null
      })

      const promise = getPurchaseOrderReceivingDetails(authUserB, mockPoId)
      await expect(promise).rejects.toThrow(/Purchase Order not found/)
    })
  })
})
