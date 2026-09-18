'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type { receipt_status_enum, stock_condition_enum } from '@/generated/prisma/client'

export interface ReceiptItemInput {
  productVariantId: string
  qtyReceived: number
  acceptedQty?: number
  rejectedQty?: number
  rejectionReason?: string | null
  condition?: string
  unitCost?: number
  warehouseLocationId?: string | null
  batchNumber?: string | null
  batchId?: string | null
  serialId?: string | null
  expiryDate?: string | null
  serialNumbers?: string[]
  purchaseOrderItemId?: string | null
}

export interface CreateReceiptInput {
  warehouseId?: string | null
  storeId?: string | null
  purchaseOrderId?: string | null
  supplierId?: string | null
  notes?: string | null
  items: ReceiptItemInput[]
  autoPost?: boolean
}

function assertItems(items: ReceiptItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A goods receipt must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (
      typeof item.qtyReceived !== 'number' ||
      Number.isNaN(item.qtyReceived) ||
      item.qtyReceived <= 0
    ) {
      throw new ApiError('Each item requires a received quantity > 0.', 400)
    }
    if (
      item.unitCost !== undefined &&
      (typeof item.unitCost !== 'number' ||
        Number.isNaN(item.unitCost) ||
        item.unitCost < 0)
    ) {
      throw new ApiError('Unit cost cannot be negative.', 400)
    }
  }
}

export async function listReceipts(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const receipts = await prisma.goods_receipts.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
    },
  })

  const supplierIds = Array.from(new Set(receipts.map((r) => r.supplier_id).filter(Boolean))) as string[]
  const storeIds = Array.from(new Set(receipts.map((r) => r.store_id).filter(Boolean))) as string[]
  const poIds = Array.from(new Set(receipts.map((r) => r.purchase_order_id).filter(Boolean))) as string[]
  const receiptIds = receipts.map((r) => r.id)

  const [suppliers, stores, purchaseOrders, itemsCount] = await Promise.all([
    supplierIds.length > 0
      ? prisma.suppliers.findMany({
          where: { id: { in: supplierIds } },
          select: { id: true, name: true },
        })
      : [],
    storeIds.length > 0
      ? prisma.stores.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, name: true },
        })
      : [],
    poIds.length > 0
      ? prisma.purchase_orders.findMany({
          where: { id: { in: poIds } },
          select: { id: true, po_number: true, lifecycle_status: true },
        })
      : [],
    receiptIds.length > 0
      ? prisma.goods_receipt_items.groupBy({
          by: ['goods_receipt_id'],
          _count: { _all: true },
          where: { goods_receipt_id: { in: receiptIds } },
        })
      : [],
  ])

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))
  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const poMap = new Map(purchaseOrders.map((p) => [p.id, p]))
  const countMap = new Map(itemsCount.map((c) => [c.goods_receipt_id, c._count._all]))

  return receipts.map((r) => ({
    ...r,
    suppliers: r.supplier_id ? supplierMap.get(r.supplier_id) ?? null : null,
    stores: r.store_id ? storeMap.get(r.store_id) ?? null : null,
    purchase_orders: r.purchase_order_id ? poMap.get(r.purchase_order_id) ?? null : null,
    _count: { goods_receipt_items: countMap.get(r.id) ?? 0 },
  }))
}

export async function getReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const receipt = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
    },
  })
  if (!receipt) {
    throw new ApiError('Goods receipt not found.', 404)
  }

  const [supplier, store, purchaseOrder, items] = await Promise.all([
    receipt.supplier_id
      ? prisma.suppliers.findFirst({
          where: { id: receipt.supplier_id },
          select: { id: true, name: true },
        })
      : null,
    receipt.store_id
      ? prisma.stores.findFirst({
          where: { store_id: receipt.store_id },
          select: { store_id: true, name: true },
        })
      : null,
    receipt.purchase_order_id
      ? prisma.purchase_orders.findFirst({
          where: { id: receipt.purchase_order_id },
          select: { id: true, po_number: true, lifecycle_status: true },
        })
      : null,
    prisma.goods_receipt_items.findMany({
      where: { goods_receipt_id: id },
    }),
  ])

  const variantIds = Array.from(new Set(items.map((i) => i.product_variant_id).filter(Boolean))) as string[]
  const locationIds = Array.from(new Set(items.map((i) => i.warehouse_location_id).filter(Boolean))) as string[]

  const [variants, locations] = await Promise.all([
    variantIds.length > 0
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            barcode: true,
            products: { select: { name: true } },
          },
        })
      : [],
    locationIds.length > 0
      ? prisma.warehouse_locations.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, code: true, path: true },
        })
      : [],
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const locationMap = new Map(locations.map((l) => [l.id, l]))

  const enrichedItems = items.map((item) => ({
    ...item,
    product_variants: variantMap.get(item.product_variant_id) ?? null,
    warehouse_locations: item.warehouse_location_id ? locationMap.get(item.warehouse_location_id) ?? null : null,
  }))

  return {
    ...receipt,
    suppliers: supplier,
    stores: store,
    purchase_orders: purchaseOrder,
    goods_receipt_items: enrichedItems,
  }
}

/**
 * Fetch approved/sent purchase orders with outstanding (unreceived) items
 * so the user can select a PO and receive its goods.
 */
export async function listReceivablePurchaseOrders(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const pos = await prisma.purchase_orders.findMany({
    where: {
      tenant_id: tenantId,
      lifecycle_status: { in: ['approved', 'sent', 'partially_received'] },
    },
    orderBy: { order_date: 'desc' },
    include: {
      suppliers: { select: { id: true, name: true } },
      warehouses: { select: { id: true, name: true, code: true } },
      purchase_order_items: {
        include: {
          products: { select: { name: true, sku: true } },
          product_variants: { select: { id: true, sku: true } },
        },
      },
    },
  })

  // Filter to only POs that still have outstanding qty
  return pos
    .map((po) => {
      const itemsWithOutstanding = (po.purchase_order_items || [])
        .map((item) => {
          const ordered = Number(item.quantity_ordered) || 0
          const received = Number(item.received_quantity) || 0
          const cancelled = Number(item.cancelled_qty) || 0
          const outstanding = Math.max(0, ordered - received - cancelled)
          return { ...item, outstanding_qty: outstanding }
        })
        .filter((item) => item.outstanding_qty > 0)

      return {
        ...po,
        purchase_order_items: itemsWithOutstanding,
      }
    })
    .filter((po) => po.purchase_order_items.length > 0)
}

export async function createReceipt(
  authUserId: string,
  input: CreateReceiptInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const whId = input.warehouseId || input.storeId
  if (!whId) {
    throw new ApiError('A warehouse or store is required.', 400)
  }
  assertItems(input.items)

  let validStoreId: string | null = null
  if (input.storeId) {
    const storeExists = await prisma.stores.findUnique({
      where: { store_id: input.storeId },
      select: { store_id: true },
    })
    if (storeExists) {
      validStoreId = input.storeId
    }
  }

  let validWarehouseId: string | null = null
  if (input.warehouseId) {
    const whExists = await prisma.warehouses.findUnique({
      where: { id: input.warehouseId },
      select: { id: true },
    })
    if (whExists) {
      validWarehouseId = input.warehouseId
    }
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const created = await tx.goods_receipts.create({
      data: {
        tenant_id: tenantId,
        warehouse_id: validWarehouseId,
        store_id: validStoreId,
        purchase_order_id: input.purchaseOrderId ?? null,
        supplier_id: input.supplierId ?? null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft' as receipt_status_enum,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (input.items.length > 0) {
      await tx.goods_receipt_items.createMany({
        data: input.items.map((item) => ({
          goods_receipt_id: created.id,
          product_variant_id: item.productVariantId,
          qty_received: item.qtyReceived,
          accepted_qty: item.acceptedQty ?? item.qtyReceived,
          rejected_qty: item.rejectedQty ?? 0,
          rejection_reason: item.rejectionReason ?? null,
          condition: (item.condition ?? 'good') as stock_condition_enum,
          unit_cost: item.unitCost ?? 0,
          warehouse_location_id: item.warehouseLocationId ?? null,
          batch_number: item.batchNumber ?? null,
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          expiry_date: item.expiryDate ? new Date(item.expiryDate) : null,
          serial_numbers: item.serialNumbers ?? undefined,
          purchase_order_item_id: item.purchaseOrderItemId ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.goods_receipt_items.findMany({
      where: { goods_receipt_id: created.id },
    })

    return {
      ...created,
      goods_receipt_items: items,
    }
  })

  // If autoPost is requested, immediately post the receipt
  if (input.autoPost) {
    try {
      await postReceipt(authUserId, result.id)
    } catch (postError) {
      console.warn('Auto-post failed, receipt remains draft:', postError)
    }
  }

  return result
}

export async function cancelReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError('Only a draft goods receipt can be cancelled.', 409)
  }
  return prisma.goods_receipts.update({
    where: { id },
    data: {
      status: 'cancelled' as receipt_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function postReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc('post_goods_receipt', {
    p_receipt_id: id,
  })
  if (error) {
    throw new ApiError(
      `Failed to post goods receipt: ${error.message}`,
      500
    )
  }

  // Update audit tracking
  await prisma.goods_receipts.update({
    where: { id },
    data: {
      updated_by_user_id: tenantUserId,
    },
  }).catch(() => {
    // Audit update best-effort
  })

  return data
}
