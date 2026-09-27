'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type { receipt_status_enum, stock_condition_enum } from '@/generated/prisma/client'
import { GoodsReceiptEvents } from '@/server/services/goods-receipt-events'
import crypto from 'node:crypto'

export interface ReceiptItemInput {
  purchaseOrderItemId: string
  productVariantId?: string
  qtyReceived: number
  acceptedQty?: number
  rejectedQty?: number
  rejectionReason?: string | null
  condition?: string
  unitCost?: number
  warehouseLocationId?: string | null
  batchId?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
  serials?: string[]
}

export interface CreateReceiptInput {
  purchaseOrderId: string
  warehouseId: string
  notes?: string | null
  items: ReceiptItemInput[]
  autoPost?: boolean
}

export interface SearchReceivablePOsInput {
  query?: string
  supplierId?: string
  status?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

function generateReceiptNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `GR-${dateStr}-${randomSuffix}`
}

/**
 * Advanced searchable PO selector for Goods Receipt.
 * Server-side, tenant-scoped, paginated, and indexed.
 * Searches by PO Number, Supplier Name/Code, Product Name/SKU/Barcode, Expected Delivery, Status.
 * Only returns POs eligible for receiving ('approved', 'sent', 'partially_received').
 */
export async function searchReceivablePurchaseOrders(
  authUserId: string,
  params: SearchReceivablePOsInput = {}
) {
  const tenantId = await requireTenantId(authUserId)
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  const allowedStatuses = ['approved', 'sent', 'partially_received'] as const
  const statusFilter = params.status && (allowedStatuses as readonly string[]).includes(params.status)
    ? (params.status as (typeof allowedStatuses)[number])
    : { in: [...allowedStatuses] }

  const whereClause: Record<string, unknown> = {
    tenant_id: tenantId,
    lifecycle_status: statusFilter,
  }

  if (params.supplierId) {
    whereClause.supplier_id = params.supplierId
  }

  if (params.warehouseId) {
    whereClause.warehouse_id = params.warehouseId
  }

  if (params.dateFrom || params.dateTo) {
    whereClause.order_date = {}
    if (params.dateFrom) whereClause.order_date.gte = new Date(params.dateFrom)
    if (params.dateTo) whereClause.order_date.lte = new Date(params.dateTo)
  }

  const queryTrimmed = params.query?.trim()
  if (queryTrimmed) {
    const isNum = /^\d+$/.test(queryTrimmed)
    const numVal = isNum ? parseInt(queryTrimmed, 10) : undefined

    whereClause.OR = [
      ...(numVal !== undefined ? [{ po_number: numVal }] : []),
      {
        suppliers: {
          OR: [
            { name: { contains: queryTrimmed, mode: 'insensitive' } },
            { code: { contains: queryTrimmed, mode: 'insensitive' } },
          ],
        },
      },
      {
        purchase_order_items: {
          some: {
            product_variants: {
              OR: [
                { sku: { contains: queryTrimmed, mode: 'insensitive' } },
                { barcode: { contains: queryTrimmed, mode: 'insensitive' } },
                { name: { contains: queryTrimmed, mode: 'insensitive' } },
                {
                  products: {
                    name: { contains: queryTrimmed, mode: 'insensitive' },
                  },
                },
              ],
            },
          },
        },
      },
    ]
  }

  const [total, purchaseOrders] = await Promise.all([
    prisma.purchase_orders.count({ where: whereClause }),
    prisma.purchase_orders.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { order_date: 'desc' },
      include: {
        suppliers: { select: { id: true, name: true, code: true } },
        warehouses: { select: { id: true, name: true, code: true } },
        purchase_order_items: {
          include: {
            product_variants: {
              select: {
                id: true,
                sku: true,
                barcode: true,
                name: true,
                products: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
      },
    }),
  ])

  const items = purchaseOrders.map((po) => {
    let totalOrdered = 0
    let totalReceived = 0
    let totalRemaining = 0
    let linesCount = 0

    for (const item of po.purchase_order_items || []) {
      const ordered = Number(item.quantity_ordered) || 0
      const received = Number(item.received_quantity) || 0
      const cancelled = Number(item.cancelled_qty) || 0
      const remaining = Math.max(0, ordered - received - cancelled)

      totalOrdered += ordered
      totalReceived += received
      totalRemaining += remaining
      linesCount += 1
    }

    return {
      id: po.id,
      po_number: po.po_number,
      order_date: po.order_date ? po.order_date.toISOString() : null,
      expected_delivery_date: po.expected_delivery_date
        ? po.expected_delivery_date.toISOString()
        : null,
      lifecycle_status: po.lifecycle_status,
      currency: po.currency || 'USD',
      total_amount: po.total_amount ? Number(po.total_amount) : 0,
      warehouse_id: po.warehouse_id,
      supplier_id: po.supplier_id,
      suppliers: po.suppliers,
      warehouses: po.warehouses,
      items_count: linesCount,
      ordered_quantity: totalOrdered,
      received_quantity: totalReceived,
      remaining_quantity: totalRemaining,
    }
  })

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Returns complete receiving details for a specific Purchase Order:
 * Header, Summary, Line Items with tracking flags, existing batches, and previous Goods Receipts history.
 */
export async function getPurchaseOrderReceivingDetails(
  authUserId: string,
  poId: string
) {
  const tenantId = await requireTenantId(authUserId)

  const po = await prisma.purchase_orders.findFirst({
    where: { id: poId, tenant_id: tenantId },
    include: {
      suppliers: {
        select: { id: true, name: true, code: true, email: true, phone: true },
      },
      warehouses: {
        select: { id: true, name: true, code: true },
      },
      purchase_order_items: {
        orderBy: { line_no: 'asc' },
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              name: true,
              expiration_date: true,
              products: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  is_batch_tracked: true,
                  is_serial_tracked: true,
                  has_expiration: true,
                  tracking_mode: true,
                },
              },
            },
          },
          uoms: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  })

  if (!po) {
    throw new ApiError('Purchase Order not found.', 404)
  }

  // Load active batches for variants on this PO
  const variantIds = po.purchase_order_items
    .map((item) => item.product_variant_id)
    .filter(Boolean) as string[]

  const existingBatches = variantIds.length > 0
    ? await prisma.product_batches.findMany({
        where: {
          tenant_id: tenantId,
          product_variant_id: { in: variantIds },
          status: 'active',
        },
        select: {
          id: true,
          product_variant_id: true,
          batch_number: true,
          expiry_date: true,
        },
      })
    : []

  const batchMap = new Map<string, typeof existingBatches>()
  for (const b of existingBatches) {
    const list = batchMap.get(b.product_variant_id) || []
    list.push(b)
    batchMap.set(b.product_variant_id, list)
  }

  // Load previous goods receipts for this PO
  const previousReceipts = await prisma.goods_receipts.findMany({
    where: { tenant_id: tenantId, purchase_order_id: poId },
    orderBy: { created_at: 'desc' },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
      tenant_users_goods_receipts_posted_by_user_idTotenant_users: {
        select: { id: true, email: true },
      },
      goods_receipt_items: {
        select: {
          id: true,
          qty_received: true,
          accepted_qty: true,
          rejected_qty: true,
        },
      },
    },
  })

  let totalOrdered = 0
  let totalReceived = 0
  let totalRemaining = 0
  let totalRejected = 0

  const items = po.purchase_order_items.map((item) => {
    const ordered = Number(item.quantity_ordered) || 0
    const received = Number(item.received_quantity) || 0
    const cancelled = Number(item.cancelled_qty) || 0
    const remaining = Math.max(0, ordered - received - cancelled)

    totalOrdered += ordered
    totalReceived += received
    totalRemaining += remaining

    const pv = item.product_variants as any
    const prod = pv?.products
    const isBatchTracked =
      Boolean(prod?.is_batch_tracked) ||
      Boolean(pv?.is_batch_tracked) ||
      prod?.tracking_mode === 'batch' ||
      prod?.tracking_mode === 'batch_and_serial' ||
      pv?.tracking_mode === 'batch' ||
      pv?.tracking_mode === 'batch_and_serial' ||
      pv?.tracking_type === 'BATCH'
    const isSerialTracked =
      Boolean(prod?.is_serial_tracked) ||
      Boolean(pv?.is_serial_tracked) ||
      prod?.tracking_mode === 'serial' ||
      prod?.tracking_mode === 'batch_and_serial' ||
      pv?.tracking_mode === 'serial' ||
      pv?.tracking_mode === 'batch_and_serial' ||
      pv?.tracking_type === 'SERIAL'
    const hasExpiration =
      Boolean(prod?.has_expiration) ||
      Boolean(pv?.has_expiration) ||
      Boolean(pv?.expiration_date)

    let lineStatus = 'not_received'
    if (remaining === 0 && ordered > 0) {
      lineStatus = 'fully_received'
    } else if (received > 0) {
      lineStatus = 'partially_received'
    }

    return {
      id: item.id,
      po_id: item.po_id,
      line_no: item.line_no,
      product_variant_id: item.product_variant_id,
      product_name: pv?.products?.name || pv?.name || 'Unknown Product',
      variant_name: pv?.name || null,
      sku: pv?.sku || pv?.products?.sku || '',
      barcode: pv?.barcode || null,
      uom: item.uoms || null,
      quantity_ordered: ordered,
      previously_received_qty: received,
      cancelled_qty: cancelled,
      remaining_quantity: remaining,
      unit_cost: Number(item.unit_cost) || 0,
      total_amount: Number(item.total_amount) || 0,
      receiving_status: lineStatus,
      is_batch_tracked: isBatchTracked,
      is_serial_tracked: isSerialTracked,
      has_expiration: hasExpiration,
      available_batches: (batchMap.get(item.product_variant_id) || []).map((b) => ({
        id: b.id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date ? b.expiry_date.toISOString().split('T')[0] : null,
      })),
    }
  })

  const history = previousReceipts.map((gr) => {
    let grReceived = 0
    let grAccepted = 0
    let grRejected = 0

    for (const it of gr.goods_receipt_items) {
      grReceived += Number(it.qty_received) || 0
      grAccepted += Number(it.accepted_qty ?? it.qty_received) || 0
      grRejected += Number(it.rejected_qty) || 0
    }

    totalRejected += grRejected

    return {
      id: gr.id,
      receipt_number: gr.receipt_number,
      status: gr.status,
      received_date: gr.received_date ? gr.received_date.toISOString() : null,
      posted_at: gr.posted_at ? gr.posted_at.toISOString() : null,
      posted_by: gr.tenant_users_goods_receipts_posted_by_user_idTotenant_users?.email || null,
      warehouse: gr.warehouses,
      items_count: gr.goods_receipt_items.length,
      received_quantity: grReceived,
      accepted_quantity: grAccepted,
      rejected_quantity: grRejected,
      notes: gr.notes,
    }
  })

  return {
    header: {
      id: po.id,
      po_number: po.po_number,
      order_date: po.order_date ? po.order_date.toISOString() : null,
      expected_delivery_date: po.expected_delivery_date
        ? po.expected_delivery_date.toISOString()
        : null,
      currency: po.currency || 'USD',
      lifecycle_status: po.lifecycle_status,
      po_total: Number(po.total_amount) || 0,
      supplier: po.suppliers,
      warehouse: po.warehouses,
      notes: po.notes,
    },
    summary: {
      total_lines: items.length,
      ordered_quantity: totalOrdered,
      received_quantity: totalReceived,
      remaining_quantity: totalRemaining,
      rejected_quantity: totalRejected,
      po_total: Number(po.total_amount) || 0,
    },
    items,
    receipts_history: history,
  }
}

/**
 * Backward compatibility: lists receivable POs that still have outstanding quantities.
 */
export async function listReceivablePurchaseOrders(authUserId: string) {
  const result = await searchReceivablePurchaseOrders(authUserId, { limit: 100 })
  return result.items.filter((po) => po.remaining_quantity > 0)
}

/**
 * Creates a Goods Receipt in DRAFT status against a Purchase Order.
 * Validates tenant boundaries, PO status, remaining quantities, batch, serials, and locations.
 * DRAFT receipt does NOT touch stock balances or inventory movements.
 */
export async function createReceipt(
  authUserId: string,
  input: CreateReceiptInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.purchaseOrderId) {
    throw new ApiError('A valid Purchase Order is required to create a Goods Receipt.', 400)
  }
  if (!input.warehouseId) {
    throw new ApiError('A destination warehouse is required.', 400)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError('A Goods Receipt must contain at least one item.', 400)
  }

  // 1. Authoritative PO check
  const po = await prisma.purchase_orders.findFirst({
    where: { id: input.purchaseOrderId, tenant_id: tenantId },
    include: {
      purchase_order_items: {
        include: {
          product_variants: {
            include: {
              products: true,
            },
          },
        },
      },
    },
  })

  if (!po) {
    throw new ApiError('Purchase Order not found or not accessible.', 404)
  }

  const receivableStatuses = ['approved', 'sent', 'partially_received']
  if (!receivableStatuses.includes(po.lifecycle_status)) {
    throw new ApiError(
      `Purchase Order is in status "${po.lifecycle_status}" and is not eligible for receiving.`,
      400
    )
  }

  // 2. Authoritative Warehouse check
  const warehouse = await prisma.warehouses.findFirst({
    where: { id: input.warehouseId, tenant_id: tenantId },
  })
  if (!warehouse) {
    throw new ApiError('Warehouse not found or does not belong to this tenant.', 400)
  }

  // 3. Map of PO items
  const poItemMap = new Map(po.purchase_order_items.map((item) => [item.id, item]))

  // 4. Validate all locations belong to input.warehouseId
  const locationIds = Array.from(
    new Set(input.items.map((i) => i.warehouseLocationId).filter(Boolean))
  ) as string[]

  if (locationIds.length > 0) {
    const validLocations = await prisma.warehouse_locations.findMany({
      where: {
        id: { in: locationIds },
        warehouse_id: input.warehouseId,
        tenant_id: tenantId,
      },
      select: { id: true },
    })
    const validLocSet = new Set(validLocations.map((l) => l.id))
    for (const locId of locationIds) {
      if (!validLocSet.has(locId)) {
        throw new ApiError(
          `Warehouse location does not belong to the selected warehouse (${warehouse.name}).`,
          400
        )
      }
    }
  }

  // 5. Item validation & enrichment
  const processedItems: Array<{
    purchaseOrderItemId: string
    productVariantId: string
    uomId: string | null
    qtyReceived: number
    acceptedQty: number
    rejectedQty: number
    rejectionReason: string | null
    condition: stock_condition_enum
    unitCost: number
    warehouseLocationId: string | null
    batchId: string | null
    serials: string[]
  }> = []

  const receivedDate = new Date()

  for (const itemInput of input.items) {
    const poItem = poItemMap.get(itemInput.purchaseOrderItemId)
    if (!poItem) {
      throw new ApiError(
        `Purchase Order Item ${itemInput.purchaseOrderItemId} does not belong to PO ${po.po_number || po.id}.`,
        400
      )
    }

    const qtyReceived = Number(itemInput.qtyReceived)
    if (isNaN(qtyReceived) || qtyReceived <= 0) {
      throw new ApiError('Received quantity must be greater than 0.', 400)
    }

    const acceptedQty = itemInput.acceptedQty !== undefined ? Number(itemInput.acceptedQty) : qtyReceived
    const rejectedQty = itemInput.rejectedQty !== undefined ? Number(itemInput.rejectedQty) : 0

    if (acceptedQty < 0 || rejectedQty < 0) {
      throw new ApiError('Accepted and rejected quantities cannot be negative.', 400)
    }

    if (acceptedQty + rejectedQty !== qtyReceived) {
      throw new ApiError(
        `Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal Received quantity (${qtyReceived}).`,
        400
      )
    }

    // Backend calculation of remaining quantity - NEVER trust frontend
    const ordered = Number(poItem.quantity_ordered) || 0
    const received = Number(poItem.received_quantity) || 0
    const cancelled = Number(poItem.cancelled_qty) || 0
    const remaining = Math.max(0, ordered - received - cancelled)

    if (qtyReceived > remaining) {
      throw new ApiError(
        `Received quantity (${qtyReceived}) exceeds remaining quantity (${remaining}) on PO item. Over-receiving is not permitted.`,
        400
      )
    }

    const unitCost = itemInput.unitCost !== undefined && itemInput.unitCost >= 0
      ? Number(itemInput.unitCost)
      : Number(poItem.unit_cost) || 0

    const variant = poItem.product_variants as any
    const prod = variant?.products
    const isBatchTracked =
      Boolean(prod?.is_batch_tracked) ||
      Boolean(variant?.is_batch_tracked) ||
      prod?.tracking_mode === 'batch' ||
      prod?.tracking_mode === 'batch_and_serial' ||
      variant?.tracking_mode === 'batch' ||
      variant?.tracking_mode === 'batch_and_serial' ||
      variant?.tracking_type === 'BATCH'
    const isSerialTracked =
      Boolean(prod?.is_serial_tracked) ||
      Boolean(variant?.is_serial_tracked) ||
      prod?.tracking_mode === 'serial' ||
      prod?.tracking_mode === 'batch_and_serial' ||
      variant?.tracking_mode === 'serial' ||
      variant?.tracking_mode === 'batch_and_serial' ||
      variant?.tracking_type === 'SERIAL'
    const hasExpiration =
      Boolean(prod?.has_expiration) ||
      Boolean(variant?.has_expiration) ||
      Boolean(variant?.expiration_date)

    // Batch resolving or creation
    let resolvedBatchId: string | null = null
    if (itemInput.batchId) {
      const existingBatch = await prisma.product_batches.findFirst({
        where: {
          id: itemInput.batchId,
          tenant_id: tenantId,
          product_variant_id: poItem.product_variant_id,
        },
      })
      if (!existingBatch) {
        throw new ApiError('Selected batch was not found for this product variant.', 400)
      }
      resolvedBatchId = existingBatch.id
    } else if (itemInput.batchNumber && itemInput.batchNumber.trim()) {
      const batchNum = itemInput.batchNumber.trim()
      let batch = await prisma.product_batches.findFirst({
        where: {
          tenant_id: tenantId,
          product_variant_id: poItem.product_variant_id,
          batch_number: batchNum,
        },
      })

      if (!batch) {
        let expiryDateParsed: Date | null = null
        if (itemInput.expiryDate) {
          expiryDateParsed = new Date(itemInput.expiryDate)
          if (hasExpiration && expiryDateParsed <= receivedDate) {
            throw new ApiError(
              `Expiry date (${itemInput.expiryDate}) must be later than received date for batch ${batchNum}.`,
              400
            )
          }
        } else if (hasExpiration) {
          throw new ApiError(
            `Expiry date is required for batch-tracked product ${variant?.name || variant?.sku}.`,
            400
          )
        }

        batch = await prisma.product_batches.create({
          data: {
            tenant_id: tenantId,
            product_variant_id: poItem.product_variant_id,
            batch_number: batchNum,
            expiry_date: expiryDateParsed,
            unit_cost: unitCost,
            status: 'active',
            supplier_id: po.supplier_id,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }
      resolvedBatchId = batch.id
    } else if (isBatchTracked) {
      throw new ApiError(
        `Batch number is required for batch-tracked item "${variant?.name || variant?.sku}".`,
        400
      )
    }

    // Serial tracking validation
    const serialList = (itemInput.serials || []).map((s) => s.trim()).filter(Boolean)
    if (isSerialTracked && acceptedQty > 0) {
      if (serialList.length !== acceptedQty) {
        throw new ApiError(
          `Expected ${acceptedQty} serial numbers for accepted items, but received ${serialList.length} for "${variant?.name || variant?.sku}".`,
          400
        )
      }

      const uniqueSerials = new Set(serialList)
      if (uniqueSerials.size !== serialList.length) {
        throw new ApiError(
          `Duplicate serial numbers detected within receipt items for "${variant?.name || variant?.sku}".`,
          400
        )
      }

      // Check against existing in_stock serials for this tenant & variant
      const existingConflict = await prisma.product_serials.findFirst({
        where: {
          tenant_id: tenantId,
          product_variant_id: poItem.product_variant_id,
          serial_number: { in: serialList },
          status: 'in_stock',
        },
      })
      if (existingConflict) {
        throw new ApiError(
          `Serial number "${existingConflict.serial_number}" already exists in stock for this product.`,
          409
        )
      }
    }

    processedItems.push({
      purchaseOrderItemId: poItem.id,
      productVariantId: poItem.product_variant_id,
      uomId: poItem.uom_id ?? null,
      qtyReceived,
      acceptedQty,
      rejectedQty,
      rejectionReason: rejectedQty > 0 ? (itemInput.rejectionReason || 'Inspection rejection') : null,
      condition: (itemInput.condition || 'good') as stock_condition_enum,
      unitCost,
      warehouseLocationId: itemInput.warehouseLocationId || null,
      batchId: resolvedBatchId,
      serials: serialList,
    })
  }

  // 6. Create Goods Receipt record and items atomically
  const receiptNumber = generateReceiptNumber()

  const result = await prisma.$transaction(async (tx) => {
    const createdReceipt = await tx.goods_receipts.create({
      data: {
        tenant_id: tenantId,
        receipt_number: receiptNumber,
        purchase_order_id: po.id,
        warehouse_id: warehouse.id,
        status: 'draft' as receipt_status_enum,
        received_date: receivedDate,
        notes: input.notes ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    for (const item of processedItems) {
      const createdItem = await tx.goods_receipt_items.create({
        data: {
          goods_receipt_id: createdReceipt.id,
          purchase_order_item_id: item.purchaseOrderItemId,
          product_variant_id: item.productVariantId,
          uom_id: item.uomId,
          qty_received: item.qtyReceived,
          accepted_qty: item.acceptedQty,
          rejected_qty: item.rejectedQty,
          rejection_reason: item.rejectionReason,
          condition: item.condition,
          unit_cost: item.unitCost,
          warehouse_location_id: item.warehouseLocationId,
          batch_id: item.batchId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Create or link serials in normalized product_serials and goods_receipt_item_serials in bulk
      if (item.serials.length > 0) {
        // Fetch all existing serials for this variant in a single query
        const existingSerials = await tx.product_serials.findMany({
          where: {
            tenant_id: tenantId,
            product_variant_id: item.productVariantId,
            serial_number: { in: item.serials },
          },
        })

        const existingMap = new Map(existingSerials.map((s) => [s.serial_number, s]))
        const newSerialsData: Array<{
          id: string
          tenant_id: string
          product_variant_id: string
          serial_number: string
          status: 'in_stock'
          warehouse_location_id: string | null
          batch_id: string | null
          unit_cost: number
          received_at: Date
          received_reference_type: string
          received_reference_id: string
          created_by_user_id: string | null
          updated_by_user_id: string | null
        }> = []

        const receiptItemSerialsToLink: Array<{
          goods_receipt_item_id: string
          serial_id: string
        }> = []

        for (const sn of item.serials) {
          const existing = existingMap.get(sn)
          if (existing) {
            await tx.product_serials.update({
              where: { id: existing.id },
              data: {
                status: 'in_stock',
                warehouse_location_id: item.warehouseLocationId ?? null,
                batch_id: item.batchId ?? null,
                unit_cost: item.unitCost,
                received_at: createdReceipt.received_date ?? new Date(),
                received_reference_type: 'goods_receipt',
                received_reference_id: createdReceipt.id,
                updated_by_user_id: tenantUserId,
              },
            })
            receiptItemSerialsToLink.push({
              goods_receipt_item_id: createdItem.id,
              serial_id: existing.id,
            })
          } else {
            const newSerialId = crypto.randomUUID()
            newSerialsData.push({
              id: newSerialId,
              tenant_id: tenantId,
              product_variant_id: item.productVariantId,
              serial_number: sn,
              status: 'in_stock',
              warehouse_location_id: item.warehouseLocationId ?? null,
              batch_id: item.batchId ?? null,
              unit_cost: item.unitCost,
              received_at: createdReceipt.received_date ?? new Date(),
              received_reference_type: 'goods_receipt',
              received_reference_id: createdReceipt.id,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            })
            receiptItemSerialsToLink.push({
              goods_receipt_item_id: createdItem.id,
              serial_id: newSerialId,
            })
          }
        }

        if (newSerialsData.length > 0) {
          if (tx.product_serials.createMany) {
            await tx.product_serials.createMany({
              data: newSerialsData,
            })
          } else {
            for (const sData of newSerialsData) {
              await tx.product_serials.create({ data: sData })
            }
          }
        }

        if (receiptItemSerialsToLink.length > 0) {
          if (tx.goods_receipt_item_serials.createMany) {
            await tx.goods_receipt_item_serials.createMany({
              data: receiptItemSerialsToLink,
            })
          } else {
            for (const link of receiptItemSerialsToLink) {
              await tx.goods_receipt_item_serials.create({ data: link })
            }
          }
        }
      }
    }

    return createdReceipt
  },
  {
    maxWait: 15000,
    timeout: 30000,
  })

  // If autoPost is requested, immediately post the receipt
  if (input.autoPost) {
    try {
      await postReceipt(authUserId, result.id)
    } catch (postError: unknown) {
      // eslint-disable-next-line no-console
      console.warn('Auto-post failed, receipt remains draft:', (postError as Error)?.message)
    }
  }

  return getReceipt(authUserId, result.id)
}

/**
 * Posts a Goods Receipt atomically.
 * Idempotent: checks status === 'draft' and prevents double-posting.
 * Stored procedure / transaction creates Stock Movements, updates Stock Balances, updates PO lifecycle.
 * STRICTLY AFTER transaction commit, publishes tenant-scoped Redis events and alerts.
 */
export async function postReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  // 1. Check existing receipt with tenant isolation
  const existing = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      warehouses: { select: { id: true, name: true } },
      purchase_orders: {
        select: { id: true, po_number: true, lifecycle_status: true },
      },
      goods_receipt_items: true,
    },
  })

  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }

  // Idempotency: Prevent duplicate posting
  if (existing.status === 'posted') {
    throw new ApiError('This Goods Receipt has already been posted.', 409)
  }
  if (existing.status !== 'draft') {
    throw new ApiError(`Cannot post Goods Receipt with status "${existing.status}".`, 409)
  }

  // 2. Call PostgreSQL stored procedure post_goods_receipt
  const queryResult = await prisma.$queryRaw<Array<{ post_goods_receipt: Record<string, unknown> }>>`
    SELECT post_goods_receipt(${id}::uuid)
  `

  // 3. Ensure posted_by_user_id is stamped
  await prisma.goods_receipts.update({
    where: { id },
    data: {
      posted_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  }).catch(() => {})

  // Link inventory_movement_serials for complete serial audit trail
  try {
    if (prisma.inventory_movements?.findMany && prisma.goods_receipt_item_serials?.findMany) {
      const [movements, itemSerials] = await Promise.all([
        prisma.inventory_movements.findMany({
          where: {
            tenant_id: tenantId,
            source_document_type: 'goods_receipt',
            source_document_id: id,
          },
          select: { id: true, product_variant_id: true },
        }),
        prisma.goods_receipt_item_serials.findMany({
          where: {
            goods_receipt_items: {
              goods_receipt_id: id,
            },
          },
          select: {
            serial_id: true,
            goods_receipt_items: {
              select: { product_variant_id: true },
            },
          },
        }),
      ])

      if (movements.length > 0 && itemSerials.length > 0 && prisma.inventory_movement_serials?.createMany) {
        const movementByVariant = new Map(movements.map((m) => [m.product_variant_id, m.id]))
        const movementSerialData = itemSerials
          .map((s) => {
            const movementId = movementByVariant.get(s.goods_receipt_items.product_variant_id)
            return movementId ? { movement_id: movementId, serial_id: s.serial_id } : null
          })
          .filter((entry): entry is { movement_id: string; serial_id: string } => entry !== null)

        if (movementSerialData.length > 0) {
          await prisma.inventory_movement_serials.createMany({
            data: movementSerialData,
            skipDuplicates: true,
          })
        }
      }
    }
  } catch (err: unknown) {
    // Non-blocking serial movement trail linkage
    // eslint-disable-next-line no-console
    console.warn('Failed linking inventory_movement_serials for posted receipt:', err)
  }

  // 4. Retrieve fresh PO status for event payload
  const updatedPo = await prisma.purchase_orders.findUnique({
    where: { id: existing.purchase_order_id },
    select: {
      id: true,
      po_number: true,
      lifecycle_status: true,
      purchase_order_items: {
        select: {
          quantity_ordered: true,
          received_quantity: true,
          cancelled_qty: true,
        },
      },
    },
  })

  let remainingPoQty = 0
  if (updatedPo) {
    for (const item of updatedPo.purchase_order_items) {
      const ord = Number(item.quantity_ordered) || 0
      const rec = Number(item.received_quantity) || 0
      const can = Number(item.cancelled_qty) || 0
      remainingPoQty += Math.max(0, ord - rec - can)
    }
  }

  let totalAccepted = 0
  let totalRejected = 0
  for (const it of existing.goods_receipt_items) {
    totalAccepted += Number(it.accepted_qty ?? it.qty_received) || 0
    totalRejected += Number(it.rejected_qty) || 0
  }

  // 5. Publish Redis events STRICTLY AFTER successful database commit
  await GoodsReceiptEvents.publishReceiptPosted({
    event: 'inventory.goods_receipt.posted',
    tenantId,
    goodsReceiptId: existing.id,
    receiptNumber: existing.receipt_number,
    purchaseOrderId: existing.purchase_order_id,
    purchaseOrderNumber: existing.purchase_orders?.po_number ?? null,
    warehouseId: existing.warehouse_id,
    warehouseName: existing.warehouses?.name ?? null,
    postedByUserId: tenantUserId,
    itemsCount:
      existing.goods_receipt_items?.length ||
      (existing as { _count?: { goods_receipt_items?: number } })._count?.goods_receipt_items ||
      1,
    totalAccepted,
    totalRejected,
    poLifecycleStatus: updatedPo?.lifecycle_status ?? undefined,
    poRemainingQuantity: remainingPoQty,
    timestamp: new Date().toISOString(),
  })

  return {
    success: true,
    goodsReceiptId: id,
    status: 'posted',
    data: queryResult[0]?.post_goods_receipt,
  }
}

/**
 * Cancels a draft Goods Receipt.
 * Only draft receipts can be cancelled. Does not touch stock.
 */
export async function cancelReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true, receipt_number: true, status: true },
  })

  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError('Only a draft goods receipt can be cancelled.', 409)
  }

  const updated = await prisma.goods_receipts.update({
    where: { id },
    data: {
      status: 'cancelled' as receipt_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })

  // Publish cancellation event to Redis
  await GoodsReceiptEvents.publishReceiptCancelled({
    tenantId,
    goodsReceiptId: existing.id,
    receiptNumber: existing.receipt_number,
    userId: tenantUserId,
  })

  return updated
}

/**
 * Lists goods receipts for tenant with joined PO, supplier (via PO), warehouse, and items count.
 */
export async function listReceipts(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const receipts = await prisma.goods_receipts.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
      purchase_orders: {
        select: {
          id: true,
          po_number: true,
          lifecycle_status: true,
          suppliers: { select: { id: true, name: true, code: true } },
        },
      },
      tenant_users_goods_receipts_posted_by_user_idTotenant_users: {
        select: { id: true, email: true },
      },
      _count: { select: { goods_receipt_items: true } },
    },
  })

  return receipts.map((r) => ({
    ...r,
    suppliers: r.purchase_orders?.suppliers ?? null,
    posted_by_user: r.tenant_users_goods_receipts_posted_by_user_idTotenant_users ?? null,
  }))
}

/**
 * Retrieves full details of a specific Goods Receipt:
 * Header, items with batch, normalized serials, locations, and variant info.
 */
export async function getReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const receipt = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
      purchase_orders: {
        select: {
          id: true,
          po_number: true,
          lifecycle_status: true,
          order_date: true,
          suppliers: {
            select: { id: true, name: true, code: true, email: true, phone: true },
          },
        },
      },
      tenant_users_goods_receipts_posted_by_user_idTotenant_users: {
        select: { id: true, email: true },
      },
      goods_receipt_items: {
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              name: true,
              products: { select: { id: true, name: true, sku: true } },
            },
          },
          warehouse_locations: {
            select: { id: true, code: true, name: true, path: true },
          },
          product_batches: {
            select: { id: true, batch_number: true, expiry_date: true, status: true },
          },
          goods_receipt_item_serials: {
            include: {
              product_serials: {
                select: { id: true, serial_number: true, status: true },
              },
            },
          },
          purchase_order_items: {
            select: {
              id: true,
              line_no: true,
              quantity_ordered: true,
              received_quantity: true,
              cancelled_qty: true,
              unit_cost: true,
            },
          },
        },
      },
    },
  })

  if (!receipt) {
    throw new ApiError('Goods receipt not found.', 404)
  }

  const enrichedItems = receipt.goods_receipt_items.map((item) => ({
    ...item,
    batch_number: item.product_batches?.batch_number ?? null,
    expiry_date: item.product_batches?.expiry_date
      ? item.product_batches.expiry_date.toISOString().split('T')[0]
      : null,
    serials: item.goods_receipt_item_serials.map(
      (s) => s.product_serials?.serial_number
    ).filter(Boolean),
  }))

  return {
    ...receipt,
    suppliers: receipt.purchase_orders?.suppliers ?? null,
    posted_by_user: receipt.tenant_users_goods_receipts_posted_by_user_idTotenant_users ?? null,
    goods_receipt_items: enrichedItems,
  }
}
