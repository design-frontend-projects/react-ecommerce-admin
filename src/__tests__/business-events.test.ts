import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessEventNotifications } from '@/server/services/business-event-notifications'
import { NotificationService } from '@/server/services/notification.service'
import prisma from '@/lib/prisma'

vi.mock('@/server/services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn(),
    autoAssignEntityChannel: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    product_batches: {
      findMany: vi.fn(),
    },
    product_variants: {
      findUnique: vi.fn(),
    },
  },
}))

describe('BusinessEventNotifications Domain Triggers', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const userId = '11111111-1111-1111-1111-111111111111'
  const poId = '22222222-2222-2222-2222-222222222222'
  const receiptId = '33333333-3333-3333-3333-333333333333'
  const variantId = '44444444-4444-4444-4444-444444444444'
  const batchId = '55555555-5555-5555-5555-555555555555'
  const supplierId = '66666666-6666-6666-6666-666666666666'
  const customerId = '77777777-7777-7777-7777-777777777777'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(NotificationService.createNotification).mockResolvedValue({
      notification: { id: 'notif-1' } as any,
      recipientCount: 2,
      isDuplicate: false,
    })
    vi.mocked(NotificationService.autoAssignEntityChannel).mockResolvedValue({
      id: 'chan-1',
      code: 'supplier:test',
      name: 'Supplier Channel',
    } as any)
  })

  it('1. triggers notifyPurchaseOrderApproved with SUCCESS severity and role targeting', async () => {
    await BusinessEventNotifications.notifyPurchaseOrderApproved({
      tenantId,
      poId,
      poNumber: 'PO-2026-001',
      supplierName: 'Acme Corp',
      totalAmount: 5000,
      currency: 'USD',
      createdByUserId: userId,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Purchase Order Approved: PO-2026-001',
        message: expect.stringContaining('Acme Corp'),
        severity: 'SUCCESS',
        priority: 'high',
        targetType: 'ROLE',
        targetRoleId: 'inventory_manager',
        businessEventType: 'purchase_order_approved',
        sourceEntityType: 'purchase_orders',
        sourceEntityId: poId,
        idempotencyKey: `po_approved:${tenantId}:${poId}`,
      })
    )
  })

  it('2. triggers notifyPurchaseOrderReceived with INFO severity and procurement role', async () => {
    await BusinessEventNotifications.notifyPurchaseOrderReceived({
      tenantId,
      poId,
      poNumber: 'PO-2026-002',
      supplierName: 'Global Foods',
      itemsCount: 5,
      createdByUserId: userId,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Purchase Order Received: PO-2026-002',
        message: expect.stringContaining('Global Foods'),
        severity: 'INFO',
        priority: 'normal',
        targetType: 'ROLE',
        targetRoleId: 'procurement_manager',
        businessEventType: 'purchase_order_received',
        sourceEntityId: poId,
        idempotencyKey: `po_received:${tenantId}:${poId}`,
      })
    )
  })

  it('3. triggers notifyPurchaseOrderStatusChanged with status-specific severity', async () => {
    // Test cancellation status
    await BusinessEventNotifications.notifyPurchaseOrderStatusChanged({
      tenantId,
      poId,
      poNumber: 'PO-2026-003',
      oldStatus: 'sent',
      newStatus: 'cancelled',
      updatedByUserId: userId,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'PO PO-2026-003 Status: CANCELLED',
        severity: 'WARNING',
        priority: 'high',
        sourceEntityId: poId,
        idempotencyKey: `po_status:${tenantId}:${poId}:cancelled`,
      })
    )

    // Test rejection status
    await BusinessEventNotifications.notifyPurchaseOrderStatusChanged({
      tenantId,
      poId,
      poNumber: 'PO-2026-004',
      oldStatus: 'draft',
      newStatus: 'rejected',
      updatedByUserId: userId,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        businessEventType: 'purchase_order_rejected',
        severity: 'WARNING',
      })
    )
  })

  it('4. triggers notifyGoodsReceiptConfirmed targeted to warehouse or store', async () => {
    const whId = '88888888-8888-8888-8888-888888888888'

    await BusinessEventNotifications.notifyGoodsReceiptConfirmed({
      tenantId,
      receiptId,
      receiptNumber: 'GR-900',
      poNumber: 'PO-2026-001',
      warehouseName: 'Main Central Hub',
      warehouseId: whId,
      itemsCount: 12,
      userId,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Goods Receipt Confirmed: GR-900',
        message: expect.stringContaining('Main Central Hub'),
        targetType: 'WAREHOUSE',
        targetWarehouseId: whId,
        severity: 'SUCCESS',
        businessEventType: 'stock_received',
        sourceEntityType: 'goods_receipts',
        sourceEntityId: receiptId,
        idempotencyKey: `receipt_confirmed:${tenantId}:${receiptId}`,
      })
    )
  })

  it('5. triggers notifyLowStockThreshold with CRITICAL for out-of-stock and WARNING for low stock', async () => {
    // Out of stock
    await BusinessEventNotifications.notifyLowStockThreshold({
      tenantId,
      productVariantId: variantId,
      sku: 'SKU-COFFEE-01',
      productName: 'Organic Espresso Beans',
      currentQty: 0,
      reorderPoint: 20,
      locationName: 'Store 1',
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Out of Stock Alert: Organic Espresso Beans',
        severity: 'CRITICAL',
        priority: 'urgent',
        businessEventType: 'stock_low',
        sourceEntityId: variantId,
      })
    )

    // Low stock
    await BusinessEventNotifications.notifyLowStockThreshold({
      tenantId,
      productVariantId: variantId,
      sku: 'SKU-COFFEE-01',
      productName: 'Organic Espresso Beans',
      currentQty: 5,
      reorderPoint: 20,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Low Stock Warning: Organic Espresso Beans',
        severity: 'WARNING',
        priority: 'high',
      })
    )
  })

  it('6. triggers notifyReorderSuggestionGenerated with suggested quantity and supplier info', async () => {
    const suggId = '99999999-9999-9999-9999-999999999999'

    await BusinessEventNotifications.notifyReorderSuggestionGenerated({
      tenantId,
      suggestionId: suggId,
      productVariantId: variantId,
      sku: 'SKU-TEA-02',
      productName: 'Green Tea Bags',
      suggestedQty: 100,
      currentAvailable: 8,
      supplierName: 'Orient Tea Co',
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Reorder Required: Green Tea Bags',
        message: expect.stringContaining('Order 100 unit(s)'),
        severity: 'INFO',
        businessEventType: 'stock_reorder_needed',
        sourceEntityType: 'reorder_suggestions',
        sourceEntityId: suggId,
        idempotencyKey: `reorder_suggestion:${tenantId}:${suggId}`,
      })
    )
  })

  it('7. triggers notifyProductExpiring with appropriate severity based on days remaining', async () => {
    // Expired
    await BusinessEventNotifications.notifyProductExpiring({
      tenantId,
      batchId,
      batchNumber: 'B-2026-X1',
      sku: 'MILK-01',
      productName: 'Whole Milk 1L',
      expiryDate: new Date('2026-09-01'),
      daysRemaining: 0,
      qtyRemaining: 15,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Batch Expired'),
        severity: 'CRITICAL',
        priority: 'urgent',
        businessEventType: 'product_expired',
        sourceEntityId: batchId,
      })
    )

    // Expiring soon (3 days)
    await BusinessEventNotifications.notifyProductExpiring({
      tenantId,
      batchId,
      batchNumber: 'B-2026-X2',
      sku: 'MILK-01',
      productName: 'Whole Milk 1L',
      expiryDate: new Date('2026-09-30'),
      daysRemaining: 3,
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Expiring Soon (3d)'),
        severity: 'WARNING',
        priority: 'high',
        businessEventType: 'product_expiring_soon',
      })
    )
  })

  it('8. triggers notifySupplierCreated and auto-provisions dedicated channel', async () => {
    await BusinessEventNotifications.notifySupplierCreated({
      tenantId,
      supplierId,
      name: 'Nestle Wholesale',
      code: 'NEST-01',
      email: 'orders@nestle.com',
      createdByUserId: userId,
    })

    expect(NotificationService.autoAssignEntityChannel).toHaveBeenCalledWith({
      tenantId,
      entityType: 'supplier',
      entityId: supplierId,
      name: 'Nestle Wholesale',
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Supplier Registered: Nestle Wholesale',
        type: 'announcement',
        businessEventType: 'supplier_added',
        sourceEntityType: 'suppliers',
        sourceEntityId: supplierId,
        notificationChannelId: 'chan-1',
      })
    )
  })

  it('9. triggers notifyCustomerCreated and auto-provisions dedicated channel', async () => {
    vi.mocked(NotificationService.autoAssignEntityChannel).mockResolvedValue({
      id: 'chan-cust-1',
      name: 'Customer Channel',
    } as any)

    await BusinessEventNotifications.notifyCustomerCreated({
      tenantId,
      customerId,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+123456789',
      createdByUserId: userId,
    })

    expect(NotificationService.autoAssignEntityChannel).toHaveBeenCalledWith({
      tenantId,
      entityType: 'customer',
      entityId: customerId,
      name: 'Alice Johnson',
    })

    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        title: 'Customer Registered: Alice Johnson',
        type: 'announcement',
        businessEventType: 'customer_added',
        sourceEntityType: 'customers',
        sourceEntityId: customerId,
        notificationChannelId: 'chan-cust-1',
      })
    )
  })

  it('10. scans and notifies expiring batches across the tenant', async () => {
    const futureExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)

    vi.mocked(prisma.product_batches.findMany).mockResolvedValue([
      {
        id: batchId,
        batch_number: 'BATCH-AUG-10',
        product_variant_id: variantId,
        expiry_date: futureExpiry,
        product_variants: {
          id: variantId,
          sku: 'SKU-YOGURT',
          products: { name: 'Greek Yogurt 500g' },
        },
        stock_by_location: [{ qty_on_hand: 25 }],
      } as any,
    ])

    const result = await BusinessEventNotifications.scanAndNotifyExpiringBatches(tenantId, 30)

    expect(result.scanned).toBe(1)
    expect(result.notifications.length).toBe(1)
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Expiring Soon'),
        severity: 'WARNING',
        businessEventType: 'product_expiring_soon',
      })
    )
  })
})
