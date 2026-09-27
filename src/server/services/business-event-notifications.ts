import { NotificationService } from './notification.service'
import type {
  BusinessEventType,
  NotificationPriority,
  NotificationSeverity,
} from '@/features/notifications/data/schema'
import prisma from '@/lib/prisma'
import { isValidUuid } from '@/server/utils/tenant'

export interface NotifyPurchaseOrderApprovedInput {
  tenantId: string
  poId: string
  poNumber: string
  supplierName?: string | null
  totalAmount?: number | null
  currency?: string | null
  createdByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyPurchaseOrderReceivedInput {
  tenantId: string
  poId: string
  poNumber: string
  supplierName?: string | null
  itemsCount?: number | null
  createdByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyPurchaseOrderStatusChangedInput {
  tenantId: string
  poId: string
  poNumber: string
  oldStatus?: string | null
  newStatus: string
  supplierName?: string | null
  updatedByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyGoodsReceiptConfirmedInput {
  tenantId: string
  receiptId: string
  receiptNumber?: string | null
  poNumber?: string | null
  warehouseName?: string | null
  warehouseId?: string | null
  storeId?: string | null
  itemsCount: number
  userId?: string | null
  actionUrl?: string | null
}

export interface NotifyLowStockThresholdInput {
  tenantId: string
  productVariantId: string
  sku: string
  productName: string
  currentQty: number
  reorderPoint?: number | null
  safetyStock?: number | null
  warehouseId?: string | null
  storeId?: string | null
  locationName?: string | null
  actionUrl?: string | null
}

export interface NotifyReorderSuggestionGeneratedInput {
  tenantId: string
  suggestionId: string
  productVariantId: string
  sku: string
  productName: string
  suggestedQty: number
  currentAvailable?: number | null
  supplierName?: string | null
  supplierId?: string | null
  storeId?: string | null
  warehouseId?: string | null
  actionUrl?: string | null
}

export interface NotifyProductExpiringInput {
  tenantId: string
  batchId: string
  batchNumber: string
  productVariantId?: string | null
  sku: string
  productName: string
  expiryDate: Date | string
  daysRemaining: number
  qtyRemaining?: number | null
  warehouseId?: string | null
  actionUrl?: string | null
}

export interface NotifySupplierCreatedInput {
  tenantId: string
  supplierId: string
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  createdByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyCustomerCreatedInput {
  tenantId: string
  customerId: string
  name: string
  email?: string | null
  phone?: string | null
  createdByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyProductCreatedInput {
  tenantId: string
  productId: string
  productCode?: string | null
  name: string
  sku: string
  categoryName?: string | null
  createdByUserId?: string | null
  actionUrl?: string | null
}

export interface NotifyProductUpdatedInput {
  tenantId: string
  productId: string
  productCode?: string | null
  name: string
  sku: string
  updatedByUserId?: string | null
  actionUrl?: string | null
}

/**
 * Domain Event Notification Facade.
 * Maps business operations across purchasing, inventory, CRM, and catalog into
 * real-time, tenant-isolated notifications with automatic channel routing and deduplication.
 */
export class BusinessEventNotifications {
  /**
   * 1. Purchase Order Approved
   */
  static async notifyPurchaseOrderApproved(input: NotifyPurchaseOrderApprovedInput) {
    const formattedAmount = input.totalAmount != null
      ? ` Total: ${Number(input.totalAmount).toLocaleString()} ${input.currency || ''}`.trim()
      : ''
    const supplierInfo = input.supplierName ? ` for supplier ${input.supplierName}` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Purchase Order Approved: ${input.poNumber}`,
      message: `Purchase Order ${input.poNumber}${supplierInfo} has been approved.${formattedAmount ? ` ${formattedAmount}.` : ''}`,
      type: 'system',
      severity: 'SUCCESS',
      priority: 'high',
      targetType: 'ROLE',
      targetRoleId: 'inventory_manager',
      senderType: 'system',
      senderUserId: input.createdByUserId,
      businessEventType: 'purchase_order_approved',
      sourceEntityType: 'purchase_orders',
      sourceEntityId: isValidUuid(input.poId) ? input.poId : null,
      idempotencyKey: `po_approved:${input.tenantId}:${input.poId}`,
      actionUrl: input.actionUrl || `/purchasing/orders/${input.poId}`,
      actionLabel: 'View Order',
      metadata: {
        poId: input.poId,
        poNumber: input.poNumber,
        supplierName: input.supplierName,
        totalAmount: input.totalAmount,
        target_role: 'inventory_manager',
      },
    })
  }

  /**
   * 2. Purchase Order Received
   */
  static async notifyPurchaseOrderReceived(input: NotifyPurchaseOrderReceivedInput) {
    const supplierInfo = input.supplierName ? ` from ${input.supplierName}` : ''
    const itemsInfo = input.itemsCount != null ? ` (${input.itemsCount} line items)` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Purchase Order Received: ${input.poNumber}`,
      message: `Purchase Order ${input.poNumber}${supplierInfo} has arrived and marked received${itemsInfo}.`,
      type: 'system',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'procurement_manager',
      senderType: 'system',
      senderUserId: input.createdByUserId,
      businessEventType: 'purchase_order_received',
      sourceEntityType: 'purchase_orders',
      sourceEntityId: isValidUuid(input.poId) ? input.poId : null,
      idempotencyKey: `po_received:${input.tenantId}:${input.poId}`,
      actionUrl: input.actionUrl || `/purchasing/orders/${input.poId}`,
      actionLabel: 'Inspect Receipt',
      metadata: {
        poId: input.poId,
        poNumber: input.poNumber,
        supplierName: input.supplierName,
        target_role: 'procurement_manager',
      },
    })
  }

  /**
   * 3. Purchase Order Status Changed
   */
  static async notifyPurchaseOrderStatusChanged(input: NotifyPurchaseOrderStatusChangedInput) {
    const cleanStatus = input.newStatus.replace(/_/g, ' ')
    const statusUpper = cleanStatus.toUpperCase()
    const isNegative = input.newStatus === 'cancelled' || input.newStatus === 'rejected'
    const isSuccess = input.newStatus === 'approved' || input.newStatus === 'received'

    const severity: NotificationSeverity = isNegative ? 'WARNING' : isSuccess ? 'SUCCESS' : 'INFO'
    const priority: NotificationPriority = isNegative ? 'high' : 'normal'

    let bizEventType: BusinessEventType = 'custom'
    if (input.newStatus === 'approved') bizEventType = 'purchase_order_approved'
    else if (input.newStatus === 'received') bizEventType = 'purchase_order_received'
    else if (input.newStatus === 'rejected') bizEventType = 'purchase_order_rejected'

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `PO ${input.poNumber} Status: ${statusUpper}`,
      message: `Purchase Order ${input.poNumber} was updated${input.oldStatus ? ` from ${input.oldStatus}` : ''} to ${cleanStatus}.`,
      type: 'system',
      severity,
      priority,
      targetType: 'ROLE',
      targetRoleId: 'procurement_manager',
      senderType: 'system',
      senderUserId: input.updatedByUserId,
      businessEventType: bizEventType,
      sourceEntityType: 'purchase_orders',
      sourceEntityId: isValidUuid(input.poId) ? input.poId : null,
      idempotencyKey: `po_status:${input.tenantId}:${input.poId}:${input.newStatus}`,
      actionUrl: input.actionUrl || `/purchasing/orders/${input.poId}`,
      actionLabel: 'View Order',
      metadata: {
        poId: input.poId,
        poNumber: input.poNumber,
        oldStatus: input.oldStatus,
        newStatus: input.newStatus,
        target_role: 'procurement_manager',
      },
    })
  }

  /**
   * 4. Goods Receipt Confirmed / Posted
   */
  static async notifyGoodsReceiptConfirmed(input: NotifyGoodsReceiptConfirmedInput) {
    const locationInfo = input.warehouseName ? ` at ${input.warehouseName}` : ''
    const poInfo = input.poNumber ? ` against PO ${input.poNumber}` : ''

    const targetType = input.warehouseId
      ? 'WAREHOUSE'
      : input.storeId
      ? 'STORE'
      : 'ROLE'

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Goods Receipt Confirmed: ${input.receiptNumber || input.receiptId.slice(0, 8)}`,
      message: `Stock intake confirmed for ${input.itemsCount} item(s)${locationInfo}${poInfo}. Inventory ledger and stock balances updated.`,
      type: 'system',
      severity: 'SUCCESS',
      priority: 'normal',
      targetType,
      targetWarehouseId: input.warehouseId,
      targetStoreId: input.storeId,
      targetRoleId: targetType === 'ROLE' ? 'inventory_manager' : undefined,
      senderType: 'system',
      senderUserId: input.userId,
      businessEventType: 'stock_received',
      sourceEntityType: 'goods_receipts',
      sourceEntityId: isValidUuid(input.receiptId) ? input.receiptId : null,
      idempotencyKey: `receipt_confirmed:${input.tenantId}:${input.receiptId}`,
      actionUrl: input.actionUrl || `/inventory/goods-receipts/${input.receiptId}`,
      actionLabel: 'Review Receipt',
      metadata: {
        receiptId: input.receiptId,
        itemsCount: input.itemsCount,
        warehouseId: input.warehouseId,
        storeId: input.storeId,
        target_role: 'inventory_manager',
      },
    })
  }

  /**
   * 5. Inventory Threshold Alert (Low Stock or Out of Stock)
   */
  static async notifyLowStockThreshold(input: NotifyLowStockThresholdInput) {
    const isOutOfStock = input.currentQty <= 0
    const locationInfo = input.locationName ? ` at ${input.locationName}` : ''
    const thresholdInfo = input.reorderPoint != null
      ? ` (Current: ${input.currentQty}, Reorder Point: ${input.reorderPoint})`
      : ` (Current: ${input.currentQty})`

    const targetType = input.warehouseId
      ? 'WAREHOUSE'
      : input.storeId
      ? 'STORE'
      : 'ROLE'

    const todayDate = new Date().toISOString().slice(0, 10)

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: isOutOfStock
        ? `Out of Stock Alert: ${input.productName}`
        : `Low Stock Warning: ${input.productName}`,
      message: `${input.productName} [${input.sku}] is ${isOutOfStock ? 'completely out of stock' : 'below threshold'}${locationInfo}${thresholdInfo}.`,
      type: 'alert',
      severity: isOutOfStock ? 'CRITICAL' : 'WARNING',
      priority: isOutOfStock ? 'urgent' : 'high',
      targetType,
      targetWarehouseId: input.warehouseId,
      targetStoreId: input.storeId,
      targetRoleId: targetType === 'ROLE' ? 'inventory_manager' : undefined,
      senderType: 'system',
      businessEventType: 'stock_low',
      sourceEntityType: 'product_variants',
      sourceEntityId: isValidUuid(input.productVariantId) ? input.productVariantId : null,
      idempotencyKey: `stock_low:${input.tenantId}:${input.productVariantId}:${input.warehouseId || input.storeId || 'all'}:${todayDate}`,
      actionUrl: input.actionUrl || `/inventory/stock-balances?search=${encodeURIComponent(input.sku)}`,
      actionLabel: 'Manage Stock',
      metadata: {
        productVariantId: input.productVariantId,
        sku: input.sku,
        productName: input.productName,
        currentQty: input.currentQty,
        reorderPoint: input.reorderPoint,
        target_role: 'inventory_manager',
      },
    })
  }

  /**
   * 6. Reorder Suggestion Generated
   */
  static async notifyReorderSuggestionGenerated(input: NotifyReorderSuggestionGeneratedInput) {
    const supplierInfo = input.supplierName ? ` via preferred supplier ${input.supplierName}` : ''
    const currentInfo = input.currentAvailable != null ? ` (Available: ${input.currentAvailable})` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Reorder Required: ${input.productName}`,
      message: `System generated a restock suggestion for ${input.productName} [${input.sku}]: Order ${input.suggestedQty} unit(s)${supplierInfo}${currentInfo}.`,
      type: 'system',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'inventory_manager',
      senderType: 'system',
      businessEventType: 'stock_reorder_needed',
      sourceEntityType: 'reorder_suggestions',
      sourceEntityId: isValidUuid(input.suggestionId) ? input.suggestionId : null,
      idempotencyKey: `reorder_suggestion:${input.tenantId}:${input.suggestionId}`,
      actionUrl: input.actionUrl || `/purchasing/reorder-suggestions`,
      actionLabel: 'Create Requisition',
      metadata: {
        suggestionId: input.suggestionId,
        productVariantId: input.productVariantId,
        sku: input.sku,
        suggestedQty: input.suggestedQty,
        supplierId: input.supplierId,
        target_role: 'inventory_manager',
      },
    })
  }

  /**
   * 7. Product Batch Expiration Warning / Expired
   */
  static async notifyProductExpiring(input: NotifyProductExpiringInput) {
    const isExpired = input.daysRemaining <= 0
    const formattedDate = typeof input.expiryDate === 'string'
      ? input.expiryDate.slice(0, 10)
      : input.expiryDate.toISOString().slice(0, 10)
    const qtyInfo = input.qtyRemaining != null ? ` (Remaining qty: ${input.qtyRemaining})` : ''

    const severity: NotificationSeverity = isExpired
      ? 'CRITICAL'
      : input.daysRemaining <= 7
      ? 'WARNING'
      : 'INFO'

    const priority: NotificationPriority = isExpired
      ? 'urgent'
      : input.daysRemaining <= 7
      ? 'high'
      : 'normal'

    const todayDate = new Date().toISOString().slice(0, 10)

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: isExpired
        ? `Batch Expired: ${input.batchNumber} - ${input.productName}`
        : `Expiring Soon (${input.daysRemaining}d): ${input.productName}`,
      message: `Batch ${input.batchNumber} of ${input.productName} [${input.sku}] ${isExpired ? 'expired on' : 'expires on'} ${formattedDate}${qtyInfo}. Immediate rotation or quarantine recommended.`,
      type: 'alert',
      severity,
      priority,
      targetType: 'ROLE',
      targetRoleId: 'inventory_manager',
      senderType: 'system',
      businessEventType: isExpired ? 'product_expired' : 'product_expiring_soon',
      sourceEntityType: 'product_batches',
      sourceEntityId: isValidUuid(input.batchId) ? input.batchId : null,
      idempotencyKey: `batch_expiry:${input.tenantId}:${input.batchId}:${isExpired ? 'expired' : todayDate}`,
      actionUrl: input.actionUrl || `/inventory/batches`,
      actionLabel: 'Inspect Batch',
      metadata: {
        batchId: input.batchId,
        batchNumber: input.batchNumber,
        productVariantId: input.productVariantId,
        sku: input.sku,
        daysRemaining: input.daysRemaining,
        expiryDate: formattedDate,
        target_role: 'inventory_manager',
      },
    })
  }

  /**
   * 8. Supplier Created + Auto Channel Provisioning
   */
  static async notifySupplierCreated(input: NotifySupplierCreatedInput) {
    // Auto-assign dedicated entity channel for the supplier
    let channel = null
    try {
      channel = await NotificationService.autoAssignEntityChannel({
        tenantId: input.tenantId,
        entityType: 'supplier',
        entityId: input.supplierId,
        name: input.name,
      })
    } catch (err: any) {
      console.warn('[BusinessEventNotifications] Error auto-provisioning supplier channel:', err.message)
    }

    const codeInfo = input.code ? ` (${input.code})` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Supplier Registered: ${input.name}`,
      message: `New supplier partner ${input.name}${codeInfo} has been onboarded and assigned dedicated notification channel '${channel?.name || input.name}'.`,
      type: 'announcement',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'procurement_manager',
      notificationChannelId: channel?.id ?? null,
      senderType: 'system',
      senderUserId: input.createdByUserId,
      businessEventType: 'supplier_added',
      sourceEntityType: 'suppliers',
      sourceEntityId: isValidUuid(input.supplierId) ? input.supplierId : null,
      idempotencyKey: `supplier_created:${input.tenantId}:${input.supplierId}`,
      actionUrl: input.actionUrl || `/purchasing/suppliers/${input.supplierId}`,
      actionLabel: 'View Supplier',
      metadata: {
        supplierId: input.supplierId,
        name: input.name,
        code: input.code,
        channelId: channel?.id,
        target_role: 'procurement_manager',
      },
    })
  }

  /**
   * 9. Customer Created + Auto Channel Provisioning
   */
  static async notifyCustomerCreated(input: NotifyCustomerCreatedInput) {
    // Auto-assign dedicated entity channel for the customer
    let channel = null
    try {
      channel = await NotificationService.autoAssignEntityChannel({
        tenantId: input.tenantId,
        entityType: 'customer',
        entityId: input.customerId,
        name: input.name,
      })
    } catch (err: any) {
      console.warn('[BusinessEventNotifications] Error auto-provisioning customer channel:', err.message)
    }

    const contactInfo = [input.email, input.phone].filter(Boolean).join(' | ')

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Customer Registered: ${input.name}`,
      message: `New customer ${input.name}${contactInfo ? ` (${contactInfo})` : ''} has been registered with dedicated channel '${channel?.name || input.name}'.`,
      type: 'announcement',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'sales_manager',
      notificationChannelId: channel?.id ?? null,
      senderType: 'system',
      senderUserId: input.createdByUserId,
      businessEventType: 'customer_added',
      sourceEntityType: 'customers',
      sourceEntityId: isValidUuid(input.customerId) ? input.customerId : null,
      idempotencyKey: `customer_created:${input.tenantId}:${input.customerId}`,
      actionUrl: input.actionUrl || `/crm/customers/${input.customerId}`,
      actionLabel: 'View Customer Profile',
      metadata: {
        customerId: input.customerId,
        name: input.name,
        email: input.email,
        channelId: channel?.id,
        target_role: 'sales_manager',
      },
    })
  }

  /**
   * 10. Automated Scan for Expiring Batches in Tenant
   */
  static async scanAndNotifyExpiringBatches(tenantId: string, daysThreshold = 30) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysThreshold)

    const batches = await prisma.product_batches.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
        expiry_date: {
          not: null,
          lte: futureDate,
        },
      },
      include: {
        stock_by_location: {
          select: { qty_on_hand: true },
        },
      },
      take: 50,
    })

    const variantIds = [
      ...new Set(
        batches
          .filter((b) => !(b as any).product_variants)
          .map((b) => b.product_variant_id)
          .filter(Boolean)
      ),
    ]

    const variants =
      variantIds.length > 0 && prisma.product_variants?.findMany
        ? await prisma.product_variants.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              sku: true,
              products: { select: { name: true } },
            },
          })
        : []

    const variantMap = new Map((variants || []).map((v) => [v.id, v]))

    const results = []
    const now = Date.now()

    for (const b of batches) {
      if (!b.expiry_date) continue
      const diffMs = b.expiry_date.getTime() - now
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const totalOnHand = b.stock_by_location.reduce(
        (sum, loc) => sum + Number(loc.qty_on_hand || 0),
        0
      )
      const variant = (b as any).product_variants || variantMap.get(b.product_variant_id)

      const res = await this.notifyProductExpiring({
        tenantId,
        batchId: b.id,
        batchNumber: b.batch_number,
        productVariantId: b.product_variant_id,
        sku: variant?.sku || 'SKU-UNKNOWN',
        productName: variant?.products?.name || 'Product',
        expiryDate: b.expiry_date,
        daysRemaining,
        qtyRemaining: totalOnHand,
      })
      results.push(res)
    }

    return { scanned: batches.length, notifications: results }
  }

  /**
   * 12. Product Master Created
   */
  static async notifyProductCreated(input: NotifyProductCreatedInput) {
    const codeInfo = input.productCode || input.sku ? ` (${input.productCode || input.sku})` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Product Added: ${input.name}`,
      message: `Product ${input.name}${codeInfo} has been added to catalog under ${input.categoryName || 'General'}.`,
      type: 'announcement',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'inventory_manager',
      senderType: 'system',
      senderUserId: input.createdByUserId,
      businessEventType: 'product_added',
      sourceEntityType: 'products',
      sourceEntityId: isValidUuid(input.productId) ? input.productId : null,
      idempotencyKey: `product_created:${input.tenantId}:${input.productId}`,
      actionUrl: input.actionUrl || `/products/${input.productId}`,
      actionLabel: 'View Product',
      metadata: {
        productId: input.productId,
        name: input.name,
        sku: input.sku,
        productCode: input.productCode,
      },
    })
  }

  /**
   * 13. Product Master Updated
   */
  static async notifyProductUpdated(input: NotifyProductUpdatedInput) {
    const codeInfo = input.productCode || input.sku ? ` (${input.productCode || input.sku})` : ''

    return NotificationService.createNotification({
      tenantId: input.tenantId,
      title: `Product Updated: ${input.name}`,
      message: `Product master ${input.name}${codeInfo} was updated.`,
      type: 'system',
      severity: 'INFO',
      priority: 'normal',
      targetType: 'ROLE',
      targetRoleId: 'inventory_manager',
      senderType: 'system',
      senderUserId: input.updatedByUserId,
      businessEventType: 'product_updated',
      sourceEntityType: 'products',
      sourceEntityId: isValidUuid(input.productId) ? input.productId : null,
      idempotencyKey: `product_updated:${input.tenantId}:${input.productId}:${Date.now()}`,
      actionUrl: input.actionUrl || `/products/${input.productId}`,
      actionLabel: 'View Product',
      metadata: {
        productId: input.productId,
        name: input.name,
        sku: input.sku,
        productCode: input.productCode,
      },
    })
  }
}
