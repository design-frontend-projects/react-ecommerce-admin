'use server'

import { Prisma, type transfer_status_enum, type stock_condition_enum, type transfer_type_enum, type transfer_priority_enum } from '@/generated/prisma/client'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import {
  assertValidTransition,
  canCancelTransfer,
  canCloseTransfer,
  canEditDraft,
  canReceiveTransfer,
  canShipTransfer,
} from './transfer-state-machine'
import {
  validateBatch,
  validateSerial,
  validateStockAvailabilityForShipment,
  validateTransferItems,
  validateTransferParties,
} from './transfer-validation'
import {
  createInventoryTransaction,
  type InventoryTransactionItemInput,
} from '@/server/fns/inventory-transaction-engine'

const Decimal = Prisma.Decimal

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BatchAssignmentInput {
  batchId: string
  quantity: number
  unitCost?: number
}

export interface SerialAssignmentInput {
  serialId: string
}

export interface TransferItemInput {
  productVariantId: string
  sourceLocationId?: string | null
  destinationLocationId?: string | null
  qty: number
  unitCost?: number
  condition?: stock_condition_enum | 'good' | 'damaged' | 'quarantine' | 'expired' | 'blocked'
  batchId?: string | null
  serialId?: string | null
  batches?: BatchAssignmentInput[]
  serials?: SerialAssignmentInput[]
  notes?: string | null
}

export interface CreateTransferInput {
  sourceWarehouseId?: string | null
  destinationWarehouseId?: string | null
  fromStoreId?: string | null
  toStoreId?: string | null
  fromBranchId?: string | null
  toBranchId?: string | null
  transferType?: transfer_type_enum | 'warehouse' | 'store' | 'branch' | 'inter_warehouse' | 'inter_store' | 'inter_branch' | 'internal'
  priority?: transfer_priority_enum | 'low' | 'normal' | 'high' | 'urgent'
  reasonCode?: string | null
  referenceNo?: string | null
  expectedShipDate?: string | Date | null
  expectedReceiveDate?: string | Date | null
  notes?: string | null
  items: TransferItemInput[]
}

export interface UpdateTransferInput {
  referenceNo?: string | null
  priority?: transfer_priority_enum
  reasonCode?: string | null
  expectedShipDate?: string | Date | null
  expectedReceiveDate?: string | Date | null
  notes?: string | null
  items?: TransferItemInput[]
}

export interface ShipTransferItemInput {
  transferItemId: string
  shippedQty: number
  sourceLocationId?: string | null
  batchId?: string | null
  serialId?: string | null
  unitCost?: number
  condition?: stock_condition_enum
  notes?: string | null
}

export interface ShipTransferInput {
  transferId?: string
  id?: string
  shipmentNumber?: string | null
  notes?: string | null
  idempotencyKey?: string | null
  items?: ShipTransferItemInput[]
}

export interface ReceiveTransferItemInput {
  transferItemId: string
  receivedQty: number
  rejectedQty?: number
  rejectionReason?: string | null
  destinationLocationId?: string | null
  condition?: stock_condition_enum
  batchId?: string | null
  serialId?: string | null
  unitCost?: number
  notes?: string | null
}

export interface ReceiveTransferInput {
  transferId?: string
  id?: string
  receiptNumber?: string | null
  notes?: string | null
  idempotencyKey?: string | null
  items?: ReceiveTransferItemInput[]
}

export interface ListTransfersFilter {
  status?: transfer_status_enum | string
  transferType?: transfer_type_enum | string
  priority?: transfer_priority_enum | string
  sourceWarehouseId?: string
  destinationWarehouseId?: string
  search?: string
  dateFrom?: string | Date
  dateTo?: string | Date
  page?: number
  pageSize?: number
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function toNumeric(val: unknown, fallback = 0): number {
  if (val == null) return fallback
  if (typeof val === 'number') return val
  if (
    typeof val === 'object' &&
    val !== null &&
    'toNumber' in val &&
    typeof (val as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (val as { toNumber: () => number }).toNumber()
  }
  const parsed = Number(val)
  return isNaN(parsed) ? fallback : parsed
}

function generateReferenceNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `TRF-${dateStr}-${randomSuffix}`
}

function generateShipmentNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `SHP-${dateStr}-${randomSuffix}`
}

function generateReceiptNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  return `REC-${dateStr}-${randomSuffix}`
}

function mapTransferType(input?: string | null): transfer_type_enum {
  if (!input) return 'inter_warehouse'
  if (input === 'warehouse') return 'inter_warehouse'
  if (input === 'store') return 'inter_store'
  if (input === 'branch') return 'inter_branch'
  if (['internal', 'inter_warehouse', 'inter_store', 'inter_branch'].includes(input)) {
    return input as transfer_type_enum
  }
  return 'inter_warehouse'
}

export function serializeTransfer<
  T extends {
    transfer_no?: bigint | number | string | null
    stock_transfer_items?: Array<Record<string, unknown>>
    stock_transfer_shipments?: Array<Record<string, unknown>>
    stock_transfer_receipts?: Array<Record<string, unknown>>
    inventory_movements?: Array<Record<string, unknown>>
    total_weight?: unknown
    total_price_valuation?: unknown
    total_cost_valuation?: unknown
  },
>(transfer: T) {
  return {
    ...transfer,
    transfer_no:
      transfer.transfer_no != null ? transfer.transfer_no.toString() : null,
    total_weight: toNumeric(transfer.total_weight, 0),
    total_price_valuation: toNumeric(transfer.total_price_valuation, 0),
    total_cost_valuation: toNumeric(transfer.total_cost_valuation, 0),
    ...(transfer.stock_transfer_items
      ? {
          stock_transfer_items: transfer.stock_transfer_items.map((it) => ({
            ...it,
            qty: toNumeric(it.qty, 0),
            shipped_qty: toNumeric(it.shipped_qty, 0),
            received_qty: toNumeric(it.received_qty, 0),
            rejected_qty: toNumeric(it.rejected_qty, 0),
            unit_cost: it.unit_cost == null ? null : toNumeric(it.unit_cost, 0),
            weight: it.weight == null ? 0 : toNumeric(it.weight, 0),
            list_price: it.list_price == null ? null : toNumeric(it.list_price, 0),
            stock_transfer_item_batches: Array.isArray(it.stock_transfer_item_batches)
              ? (it.stock_transfer_item_batches as Array<Record<string, unknown>>).map((b) => ({
                  ...b,
                  quantity: toNumeric(b.quantity, 0),
                  unit_cost: toNumeric(b.unit_cost, 0),
                }))
              : undefined,
          })),
        }
      : {}),
    ...(transfer.stock_transfer_shipments
      ? {
          stock_transfer_shipments: transfer.stock_transfer_shipments.map((s) => {
            const shipmentItems = Array.isArray(s.items)
              ? (s.items as Array<Record<string, unknown>>).map((si) => ({
                  ...si,
                  shipped_qty: toNumeric(si.shipped_qty, 0),
                  unit_cost: toNumeric(si.unit_cost, 0),
                }))
              : Array.isArray(s.stock_transfer_shipment_items)
                ? (s.stock_transfer_shipment_items as Array<Record<string, unknown>>).map((si) => ({
                    ...si,
                    shipped_qty: toNumeric(si.shipped_qty, 0),
                    unit_cost: toNumeric(si.unit_cost, 0),
                  }))
                : undefined
            return {
              ...s,
              items: shipmentItems,
              stock_transfer_shipment_items: shipmentItems,
            }
          }),
        }
      : {}),
    ...(transfer.stock_transfer_receipts
      ? {
          stock_transfer_receipts: transfer.stock_transfer_receipts.map((r) => {
            const receiptItems = Array.isArray(r.items)
              ? (r.items as Array<Record<string, unknown>>).map((ri) => ({
                  ...ri,
                  received_qty: toNumeric(ri.received_qty, 0),
                  rejected_qty: toNumeric(ri.rejected_qty, 0),
                  unit_cost: toNumeric(ri.unit_cost, 0),
                }))
              : Array.isArray(r.stock_transfer_receipt_items)
                ? (r.stock_transfer_receipt_items as Array<Record<string, unknown>>).map((ri) => ({
                    ...ri,
                    received_qty: toNumeric(ri.received_qty, 0),
                    rejected_qty: toNumeric(ri.rejected_qty, 0),
                    unit_cost: toNumeric(ri.unit_cost, 0),
                  }))
                : undefined
            return {
              ...r,
              items: receiptItems,
              stock_transfer_receipt_items: receiptItems,
            }
          }),
        }
      : {}),
    ...(transfer.inventory_movements
      ? {
          inventory_movements: transfer.inventory_movements.map((m) => ({
            ...m,
            movement_no: m.movement_no != null ? m.movement_no.toString() : null,
            quantity_delta: toNumeric(m.quantity_delta, 0),
            unit_cost: m.unit_cost == null ? null : toNumeric(m.unit_cost, 0),
            total_cost: m.total_cost == null ? null : toNumeric(m.total_cost, 0),
            qty_before: m.qty_before == null ? null : toNumeric(m.qty_before, 0),
            qty_after: m.qty_after == null ? null : toNumeric(m.qty_after, 0),
          })),
        }
      : {}),
  }
}

// ============================================================================
// DOMAIN SERVICES
// ============================================================================

/**
 * Creates a new stock transfer in 'draft' status.
 */
export async function createTransfer(authUserId: string, input: CreateTransferInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return prisma.$transaction(async (tx) => {
    // 1. Validate parties
    await validateTransferParties(tx, {
      tenantId,
      sourceWarehouseId: input.sourceWarehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      fromStoreId: input.fromStoreId,
      toStoreId: input.toStoreId,
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
    })

    // 2. Validate items
    await validateTransferItems(tx, tenantId, input.items)

    const mappedType = mapTransferType(input.transferType)
    const referenceNo = input.referenceNo?.trim() || generateReferenceNo()

    // 3. Create header
    const created = await tx.stock_transfers.create({
      data: {
        tenant_id: tenantId,
        source_warehouse_id: input.sourceWarehouseId ?? null,
        destination_warehouse_id: input.destinationWarehouseId ?? null,
        from_store_id: input.fromStoreId ?? null,
        to_store_id: input.toStoreId ?? null,
        from_branch_id: input.fromBranchId ?? null,
        to_branch_id: input.toBranchId ?? null,
        transfer_type: mappedType,
        priority: (input.priority as transfer_priority_enum) || 'normal',
        reason_code: input.reasonCode ?? null,
        reference_no: referenceNo,
        expected_ship_date: input.expectedShipDate ? new Date(input.expectedShipDate) : null,
        expected_receive_date: input.expectedReceiveDate ? new Date(input.expectedReceiveDate) : null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft',
        requested_by_user_id: tenantUserId,
        requested_at: new Date(),
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    // 4. Create items and optional batches/serials
    for (const item of input.items) {
      if (item.batchId) {
        await validateBatch(tx, tenantId, item.productVariantId, item.batchId)
      }
      if (item.serialId) {
        await validateSerial(tx, tenantId, item.productVariantId, item.serialId, input.sourceWarehouseId)
      }

      const createdItem = await tx.stock_transfer_items.create({
        data: {
          tenant_id: tenantId,
          stock_transfer_id: created.id,
          product_variant_id: item.productVariantId,
          source_location_id: item.sourceLocationId ?? null,
          destination_location_id: item.destinationLocationId ?? null,
          qty: new Decimal(item.qty),
          shipped_qty: new Decimal(0),
          received_qty: new Decimal(0),
          rejected_qty: new Decimal(0),
          unit_cost: new Decimal(item.unitCost ?? 0),
          condition: (item.condition as stock_condition_enum) || 'good',
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          notes: item.notes ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Batch line items if explicitly broken down
      if (Array.isArray(item.batches) && item.batches.length > 0) {
        for (const b of item.batches) {
          await validateBatch(tx, tenantId, item.productVariantId, b.batchId)
          await tx.stock_transfer_item_batches.create({
            data: {
              tenant_id: tenantId,
              transfer_item_id: createdItem.id,
              batch_id: b.batchId,
              quantity: new Decimal(b.quantity),
              unit_cost: new Decimal(b.unitCost ?? item.unitCost ?? 0),
            },
          })
        }
      }

      // Serial line items if explicitly broken down
      if (Array.isArray(item.serials) && item.serials.length > 0) {
        for (const s of item.serials) {
          await validateSerial(tx, tenantId, item.productVariantId, s.serialId, input.sourceWarehouseId)
          await tx.stock_transfer_item_serials.create({
            data: {
              tenant_id: tenantId,
              transfer_item_id: createdItem.id,
              serial_id: s.serialId,
            },
          })
        }
      }
    }

    const items = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: created.id },
      include: {
        stock_transfer_item_batches: true,
        stock_transfer_item_serials: true,
      },
    })

    return serializeTransfer({
      ...created,
      stock_transfer_items: items,
    })
  })
}

/**
 * Updates a draft stock transfer.
 */
export async function updateTransferDraft(
  authUserId: string,
  id: string,
  input: UpdateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true, source_warehouse_id: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }
  if (!canEditDraft(existing.status)) {
    throw new ApiError(
      `Cannot edit transfer in '${existing.status}' status. Only draft transfers can be modified.`,
      409
    )
  }

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await validateTransferItems(tx, tenantId, input.items)

      // Remove existing child relations
      await tx.stock_transfer_items.deleteMany({
        where: { stock_transfer_id: id },
      })

      // Recreate items
      for (const item of input.items) {
        if (item.batchId) {
          await validateBatch(tx, tenantId, item.productVariantId, item.batchId)
        }
        if (item.serialId) {
          await validateSerial(tx, tenantId, item.productVariantId, item.serialId, existing.source_warehouse_id)
        }

        const createdItem = await tx.stock_transfer_items.create({
          data: {
            tenant_id: tenantId,
            stock_transfer_id: id,
            product_variant_id: item.productVariantId,
            source_location_id: item.sourceLocationId ?? null,
            destination_location_id: item.destinationLocationId ?? null,
            qty: new Decimal(item.qty),
            shipped_qty: new Decimal(0),
            received_qty: new Decimal(0),
            rejected_qty: new Decimal(0),
            unit_cost: new Decimal(item.unitCost ?? 0),
            condition: (item.condition as stock_condition_enum) || 'good',
            batch_id: item.batchId ?? null,
            serial_id: item.serialId ?? null,
            notes: item.notes ?? null,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })

        if (Array.isArray(item.batches)) {
          for (const b of item.batches) {
            await tx.stock_transfer_item_batches.create({
              data: {
                tenant_id: tenantId,
                transfer_item_id: createdItem.id,
                batch_id: b.batchId,
                quantity: new Decimal(b.quantity),
                unit_cost: new Decimal(b.unitCost ?? item.unitCost ?? 0),
              },
            })
          }
        }

        if (Array.isArray(item.serials)) {
          for (const s of item.serials) {
            await tx.stock_transfer_item_serials.create({
              data: {
                tenant_id: tenantId,
                transfer_item_id: createdItem.id,
                serial_id: s.serialId,
              },
            })
          }
        }
      }
    }

    const updated = await tx.stock_transfers.update({
      where: { id },
      data: {
        reference_no: input.referenceNo ?? undefined,
        priority: input.priority ?? undefined,
        reason_code: input.reasonCode ?? undefined,
        expected_ship_date: input.expectedShipDate ? new Date(input.expectedShipDate) : undefined,
        expected_receive_date: input.expectedReceiveDate ? new Date(input.expectedReceiveDate) : undefined,
        notes: input.notes ?? undefined,
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
    })

    const items = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: id },
      include: {
        stock_transfer_item_batches: true,
        stock_transfer_item_serials: true,
      },
    })

    return serializeTransfer({
      ...updated,
      stock_transfer_items: items,
    })
  })
}

/**
 * Submits a draft transfer for approval (draft -> pending_approval).
 */
export async function submitTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  assertValidTransition(existing.status, 'pending_approval', id)

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'pending_approval',
      requested_by_user_id: tenantUserId,
      requested_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

/**
 * Approves a stock transfer (pending_approval -> approved).
 */
export async function approveTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  assertValidTransition(existing.status, 'approved', id)

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'approved',
      approved_by_user_id: tenantUserId,
      approved_by: authUserId,
      approved_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

/**
 * Rejects a transfer awaiting approval (pending_approval -> rejected).
 */
export async function rejectTransfer(authUserId: string, id: string, reason?: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  assertValidTransition(existing.status, 'rejected', id)

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'rejected',
      cancellation_reason: reason ?? 'Rejected during approval',
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

/**
 * Marks an approved transfer as ready to ship (picking completed).
 */
export async function markReadyToShip(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  assertValidTransition(existing.status, 'ready_to_ship', id)

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'ready_to_ship',
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

// Backwards-compatibility alias for legacy picking
export const pickTransfer = markReadyToShip

/**
 * Dispatches a transfer shipment (full or partial).
 * Deducts stock from source warehouse via the Inventory Transaction Engine (TRANSFER_SHIPMENT),
 * creates a normalized stock_transfer_shipments record, and updates shipped_qty.
 */
export async function shipTransfer(
  authUserId: string,
  inputOrId: string | ShipTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const input: ShipTransferInput =
    typeof inputOrId === 'string'
      ? { transferId: inputOrId }
      : { ...inputOrId, transferId: inputOrId.transferId || inputOrId.id }

  if (!input.transferId) {
    throw new ApiError('Transfer ID is required for shipment.', 400)
  }

  const transferId = input.transferId

  return prisma.$transaction(async (tx) => {
    // 1. Fetch transfer with lock
    const transfer = await tx.stock_transfers.findFirst({
      where: { id: transferId, tenant_id: tenantId },
      include: {
        stock_transfer_items: true,
      },
    })

    if (!transfer) {
      throw new ApiError(`Stock transfer '${transferId}' not found.`, 404)
    }

    if (!canShipTransfer(transfer.status)) {
      throw new ApiError(
        `Cannot ship transfer in '${transfer.status}' status. Transfer must be approved or ready to ship.`,
        409
      )
    }

    // 2. Determine shipment items: full or partial
    const itemMap = new Map(transfer.stock_transfer_items.map((it) => [it.id, it]))
    const itemsToShip: Array<{
      transferItemId: string
      productVariantId: string
      quantity: number
      sourceLocationId?: string | null
      batchId?: string | null
      serialId?: string | null
      unitCost: number
      condition: stock_condition_enum
      notes?: string | null
    }> = []

    if (Array.isArray(input.items) && input.items.length > 0) {
      // Partial or explicitly specified items
      for (const reqItem of input.items) {
        const line = itemMap.get(reqItem.transferItemId)
        if (!line) {
          throw new ApiError(`Transfer item '${reqItem.transferItemId}' does not exist on this transfer.`, 400)
        }
        if (!(reqItem.shippedQty > 0)) {
          throw new ApiError(`Shipped quantity must be positive.`, 400)
        }

        const remainingUnshipped = toNumeric(line.qty) - toNumeric(line.shipped_qty)
        if (reqItem.shippedQty > remainingUnshipped + 0.0001) {
          throw new ApiError(
            `Cannot ship ${reqItem.shippedQty} for item '${line.id}'. Only ${remainingUnshipped} remaining to ship.`,
            400
          )
        }

        itemsToShip.push({
          transferItemId: line.id,
          productVariantId: line.product_variant_id,
          quantity: reqItem.shippedQty,
          sourceLocationId: reqItem.sourceLocationId ?? line.source_location_id,
          batchId: reqItem.batchId ?? line.batch_id,
          serialId: reqItem.serialId ?? line.serial_id,
          unitCost: reqItem.unitCost ?? toNumeric(line.unit_cost, 0),
          condition: reqItem.condition ?? line.condition,
          notes: reqItem.notes ?? line.notes,
        })
      }
    } else {
      // Default: Ship all remaining unshipped quantities
      for (const line of transfer.stock_transfer_items) {
        const remaining = toNumeric(line.qty) - toNumeric(line.shipped_qty)
        if (remaining > 0) {
          itemsToShip.push({
            transferItemId: line.id,
            productVariantId: line.product_variant_id,
            quantity: remaining,
            sourceLocationId: line.source_location_id,
            batchId: line.batch_id,
            serialId: line.serial_id,
            unitCost: toNumeric(line.unit_cost, 0),
            condition: line.condition,
            notes: line.notes,
          })
        }
      }
    }

    if (itemsToShip.length === 0) {
      throw new ApiError('All items in this transfer have already been shipped.', 400)
    }

    // 3. Validate stock availability at source warehouse
    if (transfer.source_warehouse_id) {
      await validateStockAvailabilityForShipment(
        tx,
        tenantId,
        transfer.source_warehouse_id,
        itemsToShip.map((it) => ({
          productVariantId: it.productVariantId,
          quantity: it.quantity,
          batchId: it.batchId,
          sourceLocationId: it.sourceLocationId,
        }))
      )
    }

    // 4. Create normalized stock_transfer_shipments record
    const shipmentNumber = input.shipmentNumber?.trim() || generateShipmentNumber()
    const shipment = await tx.stock_transfer_shipments.create({
      data: {
        tenant_id: tenantId,
        stock_transfer_id: transfer.id,
        shipment_number: shipmentNumber,
        shipped_by_user_id: tenantUserId,
        shipped_at: new Date(),
        notes: input.notes ?? null,
        idempotency_key: input.idempotencyKey ?? null,
        created_by_user_id: tenantUserId,
      },
    })

    // 5. Create shipment items & update line item shipped_qty
    for (const shipItem of itemsToShip) {
      await tx.stock_transfer_shipment_items.create({
        data: {
          tenant_id: tenantId,
          shipment_id: shipment.id,
          transfer_item_id: shipItem.transferItemId,
          product_variant_id: shipItem.productVariantId,
          shipped_qty: new Decimal(shipItem.quantity),
          source_location_id: shipItem.sourceLocationId ?? null,
          batch_id: shipItem.batchId ?? null,
          serial_id: shipItem.serialId ?? null,
          unit_cost: new Decimal(shipItem.unitCost),
          condition: shipItem.condition,
          notes: shipItem.notes ?? null,
        },
      })

      await tx.stock_transfer_items.update({
        where: { id: shipItem.transferItemId },
        data: {
          shipped_qty: { increment: new Decimal(shipItem.quantity) },
          updated_at: new Date(),
        },
      })
    }

    // 6. Post inventory transaction via engine (TRANSFER_SHIPMENT: subtract on-hand at source)
    if (transfer.source_warehouse_id) {
      const engineItems: InventoryTransactionItemInput[] = itemsToShip.map((si) => ({
        productVariantId: si.productVariantId,
        quantity: si.quantity,
        unitCost: si.unitCost,
        sourceWarehouseId: transfer.source_warehouse_id,
        destWarehouseId: transfer.destination_warehouse_id,
        sourceLocationId: si.sourceLocationId,
        batchId: si.batchId,
        serialId: si.serialId,
        condition: si.condition,
        referenceItemType: 'stock_transfer_shipment_item',
        referenceItemId: si.transferItemId,
      }))

      await createInventoryTransaction(
        authUserId,
        {
          typeCode: 'TRANSFER_SHIPMENT',
          sourceWarehouseId: transfer.source_warehouse_id,
          destWarehouseId: transfer.destination_warehouse_id,
          referenceType: 'stock_transfer_shipment',
          referenceId: shipment.id,
          notes: `Transfer shipment ${shipmentNumber} for transfer ${transfer.reference_no ?? transfer.id}`,
          autoPost: true,
          items: engineItems,
        },
        tx
      )
    }

    // 7. Calculate new transfer status
    const allItems = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: transfer.id },
    })

    const isFullyShipped = allItems.every((it) => toNumeric(it.shipped_qty) >= toNumeric(it.qty) - 0.0001)
    const newStatus: transfer_status_enum = isFullyShipped ? 'shipped' : 'partially_shipped'

    const updatedTransfer = await tx.stock_transfers.update({
      where: { id: transfer.id },
      data: {
        status: newStatus,
        shipped_by_user_id: tenantUserId,
        shipped_by: authUserId,
        shipped_at: new Date(),
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
      include: {
        stock_transfer_items: true,
        stock_transfer_shipments: {
          include: { items: true },
        },
      },
    })

    return serializeTransfer(updatedTransfer)
  })
}

/**
 * Receives a transfer shipment (full or partial).
 * Increases stock at destination warehouse via Inventory Transaction Engine (TRANSFER_RECEIPT),
 * creates a normalized stock_transfer_receipts record, and updates received_qty & rejected_qty.
 */
export async function receiveTransfer(
  authUserId: string,
  inputOrId: string | ReceiveTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const input: ReceiveTransferInput =
    typeof inputOrId === 'string'
      ? { transferId: inputOrId }
      : { ...inputOrId, transferId: inputOrId.transferId || inputOrId.id }

  if (!input.transferId) {
    throw new ApiError('Transfer ID is required for receiving.', 400)
  }

  const transferId = input.transferId

  return prisma.$transaction(async (tx) => {
    // 1. Fetch transfer with lock
    const transfer = await tx.stock_transfers.findFirst({
      where: { id: transferId, tenant_id: tenantId },
      include: {
        stock_transfer_items: true,
      },
    })

    if (!transfer) {
      throw new ApiError(`Stock transfer '${transferId}' not found.`, 404)
    }

    if (!canReceiveTransfer(transfer.status)) {
      throw new ApiError(
        `Cannot receive transfer in '${transfer.status}' status. Transfer must be shipped or in transit.`,
        409
      )
    }

    // 2. Determine receipt items: full or partial
    const itemMap = new Map(transfer.stock_transfer_items.map((it) => [it.id, it]))
    const itemsToReceive: Array<{
      transferItemId: string
      productVariantId: string
      receivedQty: number
      rejectedQty: number
      rejectionReason?: string | null
      destinationLocationId?: string | null
      batchId?: string | null
      serialId?: string | null
      unitCost: number
      condition: stock_condition_enum
      notes?: string | null
    }> = []

    if (Array.isArray(input.items) && input.items.length > 0) {
      for (const reqItem of input.items) {
        const line = itemMap.get(reqItem.transferItemId)
        if (!line) {
          throw new ApiError(`Transfer item '${reqItem.transferItemId}' does not exist on this transfer.`, 400)
        }

        const rQty = Math.max(0, reqItem.receivedQty)
        const rejQty = Math.max(0, reqItem.rejectedQty ?? 0)

        if (rQty === 0 && rejQty === 0) {
          continue
        }

        const shipped = toNumeric(line.shipped_qty)
        const currentProcessed = toNumeric(line.received_qty) + toNumeric(line.rejected_qty)
        const remainingProcessable = shipped - currentProcessed

        if (rQty + rejQty > remainingProcessable + 0.0001) {
          throw new ApiError(
            `Cannot process ${rQty + rejQty} (received + rejected) for item '${line.id}'. Only ${remainingProcessable} remaining to receive.`,
            400
          )
        }

        itemsToReceive.push({
          transferItemId: line.id,
          productVariantId: line.product_variant_id,
          receivedQty: rQty,
          rejectedQty: rejQty,
          rejectionReason: reqItem.rejectionReason ?? null,
          destinationLocationId: reqItem.destinationLocationId ?? line.destination_location_id,
          batchId: reqItem.batchId ?? line.batch_id,
          serialId: reqItem.serialId ?? line.serial_id,
          unitCost: reqItem.unitCost ?? toNumeric(line.unit_cost, 0),
          condition: reqItem.condition ?? line.condition,
          notes: reqItem.notes ?? line.notes,
        })
      }
    } else {
      // Default: Receive all remaining shipped items that haven't been received or rejected
      for (const line of transfer.stock_transfer_items) {
        const shipped = toNumeric(line.shipped_qty)
        const currentProcessed = toNumeric(line.received_qty) + toNumeric(line.rejected_qty)
        const remaining = shipped - currentProcessed
        if (remaining > 0) {
          itemsToReceive.push({
            transferItemId: line.id,
            productVariantId: line.product_variant_id,
            receivedQty: remaining,
            rejectedQty: 0,
            destinationLocationId: line.destination_location_id,
            batchId: line.batch_id,
            serialId: line.serial_id,
            unitCost: toNumeric(line.unit_cost, 0),
            condition: line.condition,
            notes: line.notes,
          })
        }
      }
    }

    if (itemsToReceive.length === 0) {
      throw new ApiError('No items remain to be received on this transfer.', 400)
    }

    // 3. Create normalized stock_transfer_receipts record
    const receiptNumber = input.receiptNumber?.trim() || generateReceiptNumber()
    const receipt = await tx.stock_transfer_receipts.create({
      data: {
        tenant_id: tenantId,
        stock_transfer_id: transfer.id,
        receipt_number: receiptNumber,
        received_by_user_id: tenantUserId,
        received_at: new Date(),
        notes: input.notes ?? null,
        idempotency_key: input.idempotencyKey ?? null,
        created_by_user_id: tenantUserId,
      },
    })

    // 4. Create receipt items & update line item received_qty and rejected_qty
    for (const recvItem of itemsToReceive) {
      await tx.stock_transfer_receipt_items.create({
        data: {
          tenant_id: tenantId,
          receipt_id: receipt.id,
          transfer_item_id: recvItem.transferItemId,
          product_variant_id: recvItem.productVariantId,
          received_qty: new Decimal(recvItem.receivedQty),
          rejected_qty: new Decimal(recvItem.rejectedQty),
          rejection_reason: recvItem.rejectionReason,
          condition: recvItem.condition,
          destination_location_id: recvItem.destinationLocationId ?? null,
          batch_id: recvItem.batchId ?? null,
          serial_id: recvItem.serialId ?? null,
          unit_cost: new Decimal(recvItem.unitCost),
          notes: recvItem.notes ?? null,
        },
      })

      await tx.stock_transfer_items.update({
        where: { id: recvItem.transferItemId },
        data: {
          received_qty: { increment: new Decimal(recvItem.receivedQty) },
          rejected_qty: { increment: new Decimal(recvItem.rejectedQty) },
          rejection_reason: recvItem.rejectionReason ?? undefined,
          updated_at: new Date(),
        },
      })
    }

    // 5. Post inventory transaction via engine (TRANSFER_RECEIPT: add on-hand at destination)
    if (transfer.destination_warehouse_id) {
      const itemsWithReceivedStock = itemsToReceive.filter((it) => it.receivedQty > 0)
      if (itemsWithReceivedStock.length > 0) {
        const engineItems: InventoryTransactionItemInput[] = itemsWithReceivedStock.map((ri) => ({
          productVariantId: ri.productVariantId,
          quantity: ri.receivedQty,
          unitCost: ri.unitCost,
          sourceWarehouseId: transfer.source_warehouse_id,
          destWarehouseId: transfer.destination_warehouse_id,
          destLocationId: ri.destinationLocationId,
          batchId: ri.batchId,
          serialId: ri.serialId,
          condition: ri.condition,
          referenceItemType: 'stock_transfer_receipt_item',
          referenceItemId: ri.transferItemId,
        }))

        await createInventoryTransaction(
          authUserId,
          {
            typeCode: 'TRANSFER_RECEIPT',
            sourceWarehouseId: transfer.source_warehouse_id,
            destWarehouseId: transfer.destination_warehouse_id,
            referenceType: 'stock_transfer_receipt',
            referenceId: receipt.id,
            notes: `Transfer receipt ${receiptNumber} for transfer ${transfer.reference_no ?? transfer.id}`,
            autoPost: true,
            items: engineItems,
          },
          tx
        )
      }
    }

    // 6. Calculate new transfer status
    const allItems = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: transfer.id },
    })

    const isFullyReceived = allItems.every((it) => {
      const totalProcessed = toNumeric(it.received_qty) + toNumeric(it.rejected_qty)
      return totalProcessed >= toNumeric(it.shipped_qty) - 0.0001 && toNumeric(it.shipped_qty) >= toNumeric(it.qty) - 0.0001
    })

    const newStatus: transfer_status_enum = isFullyReceived ? 'received' : 'partially_received'

    const updatedTransfer = await tx.stock_transfers.update({
      where: { id: transfer.id },
      data: {
        status: newStatus,
        received_by_user_id: tenantUserId,
        received_by: authUserId,
        received_at: new Date(),
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
      include: {
        stock_transfer_items: true,
        stock_transfer_receipts: {
          include: { items: true },
        },
      },
    })

    return serializeTransfer(updatedTransfer)
  })
}

// Backwards-compatibility alias
export const applyTransfer = receiveTransfer

/**
 * Closes a received or partially received transfer.
 */
export async function closeTransfer(authUserId: string, id: string, notes?: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  if (!canCloseTransfer(existing.status)) {
    throw new ApiError(
      `Cannot close transfer in '${existing.status}' status. Transfer must be received first.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'closed',
      notes: notes ? `${notes}` : undefined,
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

// Backwards-compatibility alias for legacy completion
export const completeTransfer = closeTransfer

/**
 * Cancels a transfer.
 * Only transfers that have not shipped physical stock can be cancelled.
 */
export async function cancelTransfer(authUserId: string, id: string, reason?: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })

  if (!existing) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  if (!canCancelTransfer(existing.status)) {
    throw new ApiError(
      `Cannot cancel transfer in '${existing.status}' status. Dispatched or received transfers cannot be cancelled.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancellation_reason: reason ?? null,
      cancelled_by_user_id: tenantUserId,
      cancelled_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

/**
 * Retrieves a single stock transfer by ID with all enriched relations.
 */
export async function getTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const transfer = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      source_warehouse: {
        select: { id: true, name: true, code: true },
      },
      destination_warehouse: {
        select: { id: true, name: true, code: true },
      },
      stock_transfer_items: {
        include: {
          stock_transfer_item_batches: {
            include: {
              product_batches: {
                select: { id: true, batch_number: true, expiry_date: true },
              },
            },
          },
          stock_transfer_item_serials: {
            include: {
              product_serials: {
                select: { id: true, serial_number: true, status: true },
              },
            },
          },
        },
      },
      stock_transfer_shipments: {
        include: {
          items: true,
        },
        orderBy: { created_at: 'desc' },
      },
      stock_transfer_receipts: {
        include: {
          items: true,
        },
        orderBy: { created_at: 'desc' },
      },
    },
  })

  if (!transfer) {
    throw new ApiError(`Stock transfer '${id}' not found.`, 404)
  }

  const items = transfer.stock_transfer_items
  const variantIds = Array.from(new Set(items.map((it) => it.product_variant_id))) as string[]
  const locationIds = Array.from(
    new Set(
      items
        .flatMap((it) => [it.source_location_id, it.destination_location_id])
        .filter(Boolean) as string[]
    )
  )
  const storeIds = Array.from(
    new Set([transfer.from_store_id, transfer.to_store_id].filter(Boolean) as string[])
  )
  const branchIds = Array.from(
    new Set([transfer.from_branch_id, transfer.to_branch_id].filter(Boolean) as string[])
  )

  const [variants, locations, stores, branches, priceListItems, movements] = await Promise.all([
    variantIds.length > 0
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            weight: true,
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                weight: true,
                brands: { select: { name: true } },
                categories: { select: { name: true } },
                base_uom: { select: { name: true, code: true } },
              },
            },
          },
        })
      : [],
    locationIds.length > 0
      ? prisma.warehouse_locations.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, code: true, name: true, warehouse_id: true },
        })
      : [],
    storeIds.length > 0
      ? prisma.stores.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, name: true },
        })
      : [],
    branchIds.length > 0
      ? prisma.branches.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : [],
    variantIds.length > 0
      ? prisma.price_list_items.findMany({
          where: {
            product_variant_id: { in: variantIds },
            tenant_id: tenantId,
            price_list: { is_active: true },
          },
          include: {
            price_list: { select: { id: true, name: true, is_default: true } },
          },
          orderBy: [
            { price_list: { is_default: 'desc' } },
            { created_at: 'desc' },
          ],
        })
      : [],
    prisma.inventory_movements.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { reference_id: id },
          { reference_type: 'stock_transfer', reference_id: id },
          { remarks: { contains: id } },
          ...(transfer.reference_no
            ? [{ remarks: { contains: transfer.reference_no } }]
            : []),
        ],
      },
      orderBy: { created_at: 'desc' },
    }),
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const locationMap = new Map(locations.map((l) => [l.id, l]))
  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const branchMap = new Map(branches.map((b) => [b.id, b]))

  const priceItemMap = new Map<string, (typeof priceListItems)[0]>()
  for (const pi of priceListItems) {
    if (!priceItemMap.has(pi.product_variant_id)) {
      priceItemMap.set(pi.product_variant_id, pi)
    }
  }

  let totalWeight = 0
  let totalCostValuation = 0
  let totalPriceValuation = 0

  const enrichedItems = items.map((it) => {
    const variant = variantMap.get(it.product_variant_id)
    const priceItem = priceItemMap.get(it.product_variant_id)

    const qty = toNumeric(it.qty, 0)
    const unitCost = it.unit_cost != null ? toNumeric(it.unit_cost, 0) : null
    const weight = toNumeric(variant?.weight ?? variant?.products?.weight ?? 0, 0)
    const listPrice = priceItem?.price != null ? toNumeric(priceItem.price, 0) : null
    const priceListName = priceItem?.price_list?.name ?? null
    const brand = variant?.products?.brands?.name ?? null
    const category = variant?.products?.categories?.name ?? null
    const uom = variant?.products?.base_uom?.name ?? variant?.products?.base_uom?.code ?? null

    totalWeight += weight * qty
    totalCostValuation += (unitCost ?? 0) * qty
    if (listPrice != null) {
      totalPriceValuation += listPrice * qty
    }

    return {
      ...it,
      brand,
      category,
      uom,
      weight,
      list_price: listPrice,
      price_list_name: priceListName,
      product_variants: variant || null,
      source_location: it.source_location_id
        ? locationMap.get(it.source_location_id) || null
        : null,
      destination_location: it.destination_location_id
        ? locationMap.get(it.destination_location_id) || null
        : null,
    }
  })

  const movementWarehouseIds = Array.from(
    new Set(movements.map((m) => m.warehouse_id).filter(Boolean) as string[])
  )
  const movementWarehouses =
    movementWarehouseIds.length > 0
      ? await prisma.warehouses.findMany({
          where: { id: { in: movementWarehouseIds } },
          select: { id: true, name: true, code: true },
        })
      : []
  const movementWarehouseMap = new Map(movementWarehouses.map((w) => [w.id, w]))

  const enrichedMovements = movements.map((m) => {
    const variant = m.product_variant_id ? variantMap.get(m.product_variant_id) : null
    const warehouse = m.warehouse_id ? movementWarehouseMap.get(m.warehouse_id) : null

    return {
      ...m,
      product_variants: variant
        ? {
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
            name: variant.name,
            products: variant.products ? { name: variant.products.name } : null,
          }
        : null,
      warehouses: warehouse ?? null,
    }
  })

  return serializeTransfer({
    ...transfer,
    total_weight: totalWeight,
    total_cost_valuation: totalCostValuation,
    total_price_valuation: totalPriceValuation,
    from_store: transfer.from_store_id ? storeMap.get(transfer.from_store_id) ?? null : null,
    to_store: transfer.to_store_id ? storeMap.get(transfer.to_store_id) ?? null : null,
    from_branch: transfer.from_branch_id ? branchMap.get(transfer.from_branch_id) ?? null : null,
    to_branch: transfer.to_branch_id ? branchMap.get(transfer.to_branch_id) ?? null : null,
    stock_transfer_items: enrichedItems,
    inventory_movements: enrichedMovements,
    _count: {
      stock_transfer_items: items.length,
      stock_transfer_shipments: transfer.stock_transfer_shipments.length,
      stock_transfer_receipts: transfer.stock_transfer_receipts.length,
    },
  })
}

/**
 * Lists stock transfers for a tenant with rich filtering and pagination.
 */
export async function listTransfers(authUserId: string, filters?: ListTransfersFilter) {
  const tenantId = await requireTenantId(authUserId)

  const where: Prisma.stock_transfersWhereInput = {
    tenant_id: tenantId,
    deleted_at: null,
  }

  if (filters?.status) {
    where.status = filters.status as transfer_status_enum
  }

  if (filters?.transferType) {
    where.transfer_type = filters.transferType as transfer_type_enum
  }

  if (filters?.priority) {
    where.priority = filters.priority as transfer_priority_enum
  }

  if (filters?.sourceWarehouseId) {
    where.source_warehouse_id = filters.sourceWarehouseId
  }

  if (filters?.destinationWarehouseId) {
    where.destination_warehouse_id = filters.destinationWarehouseId
  }

  if (filters?.search) {
    const q = filters.search.trim()
    where.OR = [
      { reference_no: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { reason_code: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.created_at = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    }
  }

  const transfers = await prisma.stock_transfers.findMany({
    where,
    include: {
      source_warehouse: {
        select: { id: true, name: true, code: true },
      },
      destination_warehouse: {
        select: { id: true, name: true, code: true },
      },
      _count: {
        select: {
          stock_transfer_items: true,
          stock_transfer_shipments: true,
          stock_transfer_receipts: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    ...(filters?.pageSize ? { take: filters.pageSize } : {}),
    ...(filters?.page && filters.pageSize ? { skip: (filters.page - 1) * filters.pageSize } : {}),
  })

  if (transfers.length === 0) {
    return []
  }

  const storeIds = Array.from(
    new Set(
      transfers
        .flatMap((t) => [t.from_store_id, t.to_store_id])
        .filter(Boolean) as string[]
    )
  )
  const branchIds = Array.from(
    new Set(
      transfers
        .flatMap((t) => [t.from_branch_id, t.to_branch_id])
        .filter(Boolean) as string[]
    )
  )

  const [stores, branches] = await Promise.all([
    storeIds.length > 0
      ? prisma.stores.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, name: true },
        })
      : [],
    branchIds.length > 0
      ? prisma.branches.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true },
        })
      : [],
  ])

  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const branchMap = new Map(branches.map((b) => [b.id, b]))

  return transfers.map((t) =>
    serializeTransfer({
      ...t,
      from_store: t.from_store_id ? storeMap.get(t.from_store_id) ?? null : null,
      to_store: t.to_store_id ? storeMap.get(t.to_store_id) ?? null : null,
      from_branch: t.from_branch_id ? branchMap.get(t.from_branch_id) ?? null : null,
      to_branch: t.to_branch_id ? branchMap.get(t.to_branch_id) ?? null : null,
    })
  )
}
