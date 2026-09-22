'use server'

import { Prisma } from '@/generated/prisma/client'
import type {
  inventory_transaction_status_enum,
  movement_type_enum,
  stock_condition_enum,
} from '@/generated/prisma/enums'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface InventoryTransactionItemInput {
  productVariantId: string
  quantity: number | string | Prisma.Decimal
  unitCost?: number | string | Prisma.Decimal
  stockBalanceId?: string | null
  sourceWarehouseId?: string | null
  sourceStoreId?: string | null
  sourceLocationId?: string | null
  destWarehouseId?: string | null
  destStoreId?: string | null
  destLocationId?: string | null
  batchId?: string | null
  serialId?: string | null
  lotNumber?: string | null
  serialNumber?: string | null
  condition?: stock_condition_enum
  referenceItemType?: string | null
  referenceItemId?: string | null
  notes?: string | null
  sortOrder?: number
}

export interface CreateInventoryTransactionInput {
  typeCode: string
  sourceWarehouseId?: string | null
  sourceStoreId?: string | null
  sourceLocationId?: string | null
  destWarehouseId?: string | null
  destStoreId?: string | null
  destLocationId?: string | null
  referenceType?: string | null
  referenceId?: string | null
  notes?: string | null
  currency?: string
  idempotencyKey?: string | null
  autoPost?: boolean
  items: InventoryTransactionItemInput[]
}

export interface ListTransactionsFilters {
  status?: inventory_transaction_status_enum
  typeCode?: string
  sourceWarehouseId?: string
  destWarehouseId?: string
  referenceType?: string
  referenceId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTransactionNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  const timeSuffix = Date.now().toString().slice(-4)
  return `INV-${dateStr}-${timeSuffix}${randomSuffix}`
}

function toDecimal(
  val: number | string | Prisma.Decimal | null | undefined,
  defaultValue = 0
): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(defaultValue)
  if (val instanceof Prisma.Decimal) return val
  return new Prisma.Decimal(val)
}

// ============================================================================
// CORE TRANSACTION ENGINE METHODS
// ============================================================================

/**
 * Creates an inventory transaction record (and optionally posts it if autoPost is true).
 * Supports idempotency: if idempotencyKey already exists for this tenant, returns the existing record.
 */
export async function createInventoryTransaction(
  authUserId: string,
  input: CreateInventoryTransactionInput,
  client?: Prisma.TransactionClient
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const db = client ?? prisma

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await db.inventory_transactions.findFirst({
        where: {
          tenant_id: tenantId,
          idempotency_key: input.idempotencyKey,
        },
        include: {
          items: true,
          transaction_type: true,
        },
      })
      if (existing) {
        return { transaction: existing, isDuplicate: true }
      }
    }

    // 2. Validate Items
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ApiError(
        'Inventory transaction must contain at least one item.',
        400
      )
    }

    for (const item of input.items) {
      if (!item.productVariantId) {
        throw new ApiError('Every item requires a productVariantId.', 400)
      }
      const qty = toDecimal(item.quantity)
      if (qty.lte(0)) {
        throw new ApiError(
          'Item quantity must be strictly greater than 0.',
          400
        )
      }
    }

    // 3. Resolve Transaction Type
    const txnType = await db.inventory_transaction_types.findUnique({
      where: { code: input.typeCode },
      include: { rules: true },
    })

    if (!txnType || !txnType.is_active) {
      throw new ApiError(
        `Transaction type '${input.typeCode}' does not exist or is inactive.`,
        404
      )
    }

    if (
      txnType.requires_destination &&
      !input.destWarehouseId &&
      !input.destStoreId
    ) {
      const missingDest = input.items.some(
        (i) => !i.destWarehouseId && !i.destStoreId
      )
      if (missingDest) {
        throw new ApiError(
          `Transaction type '${input.typeCode}' requires a destination warehouse or store.`,
          400
        )
      }
    }

    // 4. Calculate Header Totals & Snapshot Item Variants
    let totalQty = new Prisma.Decimal(0)
    let totalCost = new Prisma.Decimal(0)

    const variantIds = [...new Set(input.items.map((i) => i.productVariantId))]
    const variants = await db.product_variants.findMany({
      where: { id: { in: variantIds } },
      include: {
        products: { select: { name: true } },
      },
    })
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    const preparedItems = input.items.map((item, index) => {
      const qty = toDecimal(item.quantity)
      const cost = toDecimal(item.unitCost, 0)
      const lineCost = qty.times(cost)

      totalQty = totalQty.plus(qty)
      totalCost = totalCost.plus(lineCost)

      const variant = variantMap.get(item.productVariantId)

      return {
        tenant_id: tenantId,
        product_variant_id: item.productVariantId,
        stock_balance_id: item.stockBalanceId ?? null,
        quantity: qty,
        unit_cost: cost,
        total_cost: lineCost,
        sku_snapshot: variant?.sku ?? null,
        product_name_snapshot: variant?.products?.name ?? variant?.sku ?? null,
        source_warehouse_id:
          item.sourceWarehouseId ?? input.sourceWarehouseId ?? null,
        source_store_id: item.sourceStoreId ?? input.sourceStoreId ?? null,
        source_location_id:
          item.sourceLocationId ?? input.sourceLocationId ?? null,
        dest_warehouse_id:
          item.destWarehouseId ?? input.destWarehouseId ?? null,
        dest_store_id: item.destStoreId ?? input.destStoreId ?? null,
        dest_location_id: item.destLocationId ?? input.destLocationId ?? null,
        batch_id: item.batchId ?? null,
        serial_id: item.serialId ?? null,
        lot_number: item.lotNumber ?? null,
        serial_number: item.serialNumber ?? null,
        condition: item.condition ?? 'good',
        reference_item_type: item.referenceItemType ?? null,
        reference_item_id: item.referenceItemId ?? null,
        notes: item.notes ?? null,
        sort_order: item.sortOrder ?? index,
        created_by_user_id: tenantUserId,
      }
    })

    const txnNumber = generateTransactionNumber()

    // 5. Create Transaction in Database
    const createdTxn = await db.inventory_transactions.create({
      data: {
        tenant_id: tenantId,
        transaction_number: txnNumber,
        type_id: txnType.id,
        status: 'draft',
        direction: txnType.direction,
        source_warehouse_id: input.sourceWarehouseId ?? null,
        source_store_id: input.sourceStoreId ?? null,
        source_location_id: input.sourceLocationId ?? null,
        dest_warehouse_id: input.destWarehouseId ?? null,
        dest_store_id: input.destStoreId ?? null,
        dest_location_id: input.destLocationId ?? null,
        reference_type: input.referenceType ?? null,
        reference_id: input.referenceId ?? null,
        total_qty: totalQty,
        total_cost: totalCost,
        currency: input.currency ?? 'USD',
        notes: input.notes ?? null,
        idempotency_key: input.idempotencyKey ?? null,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
        items: {
          create: preparedItems,
        },
      },
      include: {
        items: true,
        transaction_type: { include: { rules: true } },
      },
    })

    // 6. If autoPost is requested (or configured on type), post immediately
    if (input.autoPost || txnType.auto_post) {
      return await postInventoryTransaction(authUserId, createdTxn.id, client)
    }

    return { transaction: createdTxn, isDuplicate: false }
  })
}

/**
 * Posts an inventory transaction: executes atomic stock balance mutations,
 * applies rule-engine effects, updates costs, writes to audit log, and dual-writes legacy movement.
 */
export async function postInventoryTransaction(
  authUserId: string,
  transactionId: string,
  client?: Prisma.TransactionClient
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const executePosting = async (tx: Prisma.TransactionClient) => {
    // 1. Fetch transaction with items and type rules
    const txn = await tx.inventory_transactions.findFirst({
      where: { id: transactionId, tenant_id: tenantId },
      include: {
        items: true,
        transaction_type: {
          include: { rules: true },
        },
      },
    })

    if (!txn) {
      throw new ApiError('Inventory transaction not found.', 404)
    }

    if (txn.status === 'posted') {
      return { transaction: txn, alreadyPosted: true }
    }

    if (txn.status !== 'draft' && txn.status !== 'pending') {
      throw new ApiError(
        `Cannot post transaction in '${txn.status}' status.`,
        400
      )
    }

    const rules = txn.transaction_type.rules
    const allowsNegative = txn.transaction_type.allows_negative_stock

    // 2. Process each item and mutate stock balances
    for (const item of txn.items) {
      // --- Process SOURCE side rules (if any rule applies to SOURCE or BOTH) ---
      const sourceRules = rules.filter(
        (r) => r.applies_to === 'SOURCE' || r.applies_to === 'BOTH'
      )
      if (sourceRules.length > 0) {
        const sWarehouseId = item.source_warehouse_id ?? txn.source_warehouse_id
        const sStoreId = item.source_store_id ?? txn.source_store_id
        const sLocationId = item.source_location_id ?? txn.source_location_id

        // Find or create source stock balance
        let sourceBalance = await tx.stock_balances.findFirst({
          where: {
            tenant_id: tenantId,
            product_variant_id: item.product_variant_id,
            warehouse_id: sWarehouseId,
            store_id: sStoreId,
            location_id: sLocationId,
            condition: item.condition,
            batch_id: item.batch_id,
          },
        })

        if (!sourceBalance) {
          sourceBalance = await tx.stock_balances.create({
            data: {
              tenant_id: tenantId,
              product_variant_id: item.product_variant_id,
              warehouse_id: sWarehouseId,
              store_id: sStoreId,
              location_id: sLocationId,
              condition: item.condition,
              batch_id: item.batch_id,
              serial_id: item.serial_id,
              qty_on_hand: 0,
              qty_available: 0,
              qty_reserved: 0,
              qty_in_transit: 0,
              qty_incoming: 0,
              qty_outgoing: 0,
              qty_damaged: 0,
              avg_cost: 0,
              created_by_user_id: tenantUserId,
            },
          })
        }

        let onHand = toDecimal(sourceBalance.qty_on_hand)
        let available = toDecimal(
          sourceBalance.qty_available ?? sourceBalance.qty_on_hand
        )
        let reserved = toDecimal(sourceBalance.qty_reserved)
        let inTransit = toDecimal(sourceBalance.qty_in_transit)
        let damaged = toDecimal(sourceBalance.qty_damaged)

        const qtyBefore = onHand

        for (const rule of sourceRules) {
          const op = rule.operation
          const delta = item.quantity

          if (rule.stock_field === 'ON_HAND') {
            onHand =
              op === 'ADD'
                ? onHand.plus(delta)
                : op === 'SUBTRACT'
                  ? onHand.minus(delta)
                  : onHand
          } else if (rule.stock_field === 'AVAILABLE') {
            available =
              op === 'ADD'
                ? available.plus(delta)
                : op === 'SUBTRACT'
                  ? available.minus(delta)
                  : available
          } else if (rule.stock_field === 'RESERVED') {
            reserved =
              op === 'ADD'
                ? reserved.plus(delta)
                : op === 'SUBTRACT'
                  ? reserved.minus(delta)
                  : reserved
          } else if (rule.stock_field === 'IN_TRANSIT') {
            inTransit =
              op === 'ADD'
                ? inTransit.plus(delta)
                : op === 'SUBTRACT'
                  ? inTransit.minus(delta)
                  : inTransit
          } else if (rule.stock_field === 'DAMAGED') {
            damaged =
              op === 'ADD'
                ? damaged.plus(delta)
                : op === 'SUBTRACT'
                  ? damaged.minus(delta)
                  : damaged
          }
        }
        console.log(
          `item: ${item.product_variant_id}, qty: ${item.quantity}, qty before: ${item.qty_before}`
        )
        consoel.info(item)

        if (!allowsNegative && (onHand.lt(0) || available.lt(0))) {
          throw new ApiError(
            `Insufficient stock for item ${item.sku_snapshot ?? item.product_variant_id}. Resulting available stock would be negative (${available.toString()}).`,
            400
          )
        }

        // Update source balance
        await tx.stock_balances.update({
          where: { id: sourceBalance.id },
          data: {
            qty_on_hand: onHand,
            qty_available: available,
            qty_reserved: reserved,
            qty_in_transit: inTransit,
            qty_damaged: damaged,
            last_movement_at: new Date(),
            last_transaction_id: txn.id,
            last_transaction_at: new Date(),
            version: { increment: 1 },
            updated_by_user_id: tenantUserId,
          },
        })

        // Snapshot on line item
        await tx.inventory_transaction_items.update({
          where: { id: item.id },
          data: {
            stock_balance_id: sourceBalance.id,
            qty_before: qtyBefore,
            qty_after: onHand,
          },
        })
      }

      // --- Process DESTINATION side rules (if any rule applies to DESTINATION or BOTH) ---
      const destRules = rules.filter(
        (r) => r.applies_to === 'DESTINATION' || r.applies_to === 'BOTH'
      )
      if (destRules.length > 0) {
        const dWarehouseId = item.dest_warehouse_id ?? txn.dest_warehouse_id
        const dStoreId = item.dest_store_id ?? txn.dest_store_id
        const dLocationId = item.dest_location_id ?? txn.dest_location_id

        let destBalance = await tx.stock_balances.findFirst({
          where: {
            tenant_id: tenantId,
            product_variant_id: item.product_variant_id,
            warehouse_id: dWarehouseId,
            store_id: dStoreId,
            location_id: dLocationId,
            condition: item.condition,
            batch_id: item.batch_id,
          },
        })

        if (!destBalance) {
          destBalance = await tx.stock_balances.create({
            data: {
              tenant_id: tenantId,
              product_variant_id: item.product_variant_id,
              warehouse_id: dWarehouseId,
              store_id: dStoreId,
              location_id: dLocationId,
              condition: item.condition,
              batch_id: item.batch_id,
              serial_id: item.serial_id,
              qty_on_hand: 0,
              qty_available: 0,
              qty_reserved: 0,
              qty_in_transit: 0,
              qty_incoming: 0,
              qty_outgoing: 0,
              qty_damaged: 0,
              avg_cost: 0,
              created_by_user_id: tenantUserId,
            },
          })
        }

        let onHand = toDecimal(destBalance.qty_on_hand)
        let available = toDecimal(
          destBalance.qty_available ?? destBalance.qty_on_hand
        )
        let reserved = toDecimal(destBalance.qty_reserved)
        let inTransit = toDecimal(destBalance.qty_in_transit)
        let damaged = toDecimal(destBalance.qty_damaged)
        let avgCost = toDecimal(destBalance.avg_cost)

        const qtyBefore = onHand
        const avgCostBefore = avgCost

        for (const rule of destRules) {
          const op = rule.operation
          const delta = item.quantity

          if (rule.stock_field === 'ON_HAND') {
            onHand =
              op === 'ADD'
                ? onHand.plus(delta)
                : op === 'SUBTRACT'
                  ? onHand.minus(delta)
                  : onHand
          } else if (rule.stock_field === 'AVAILABLE') {
            available =
              op === 'ADD'
                ? available.plus(delta)
                : op === 'SUBTRACT'
                  ? available.minus(delta)
                  : available
          } else if (rule.stock_field === 'RESERVED') {
            reserved =
              op === 'ADD'
                ? reserved.plus(delta)
                : op === 'SUBTRACT'
                  ? reserved.minus(delta)
                  : reserved
          } else if (rule.stock_field === 'IN_TRANSIT') {
            inTransit =
              op === 'ADD'
                ? inTransit.plus(delta)
                : op === 'SUBTRACT'
                  ? inTransit.minus(delta)
                  : inTransit
          } else if (rule.stock_field === 'DAMAGED') {
            damaged =
              op === 'ADD'
                ? damaged.plus(delta)
                : op === 'SUBTRACT'
                  ? damaged.minus(delta)
                  : damaged
          }
        }

        // Weighted Average Cost calculation on incoming receipts
        const unitCost = toDecimal(item.unit_cost)
        if (
          unitCost.gt(0) &&
          (txn.transaction_type.category === 'purchase' ||
            txn.transaction_type.category === 'opening')
        ) {
          const prevTotalVal = qtyBefore.times(avgCostBefore)
          const addedVal = item.quantity.times(unitCost)
          const newTotalQty = onHand
          if (newTotalQty.gt(0)) {
            avgCost = prevTotalVal.plus(addedVal).dividedBy(newTotalQty)
          } else {
            avgCost = unitCost
          }
        }

        // Update dest balance
        await tx.stock_balances.update({
          where: { id: destBalance.id },
          data: {
            qty_on_hand: onHand,
            qty_available: available,
            qty_reserved: reserved,
            qty_in_transit: inTransit,
            qty_damaged: damaged,
            avg_cost: avgCost,
            last_movement_at: new Date(),
            last_transaction_id: txn.id,
            last_transaction_at: new Date(),
            version: { increment: 1 },
            updated_by_user_id: tenantUserId,
          },
        })

        // Snapshot on line item
        await tx.inventory_transaction_items.update({
          where: { id: item.id },
          data: {
            stock_balance_id: destBalance.id,
            qty_before: qtyBefore,
            qty_after: onHand,
            avg_cost_before: avgCostBefore,
            avg_cost_after: avgCost,
          },
        })
      }

      // --- Dual-write to legacy inventory_movements ledger ---
      const legacyMovementType = mapCategoryToLegacyMovement(
        txn.transaction_type.category,
        txn.direction
      )
      const primaryWarehouseId =
        item.dest_warehouse_id ??
        txn.dest_warehouse_id ??
        item.source_warehouse_id ??
        txn.source_warehouse_id
      const primaryStoreId =
        item.dest_store_id ??
        txn.dest_store_id ??
        item.source_store_id ??
        txn.source_store_id
      const primaryLocationId =
        item.dest_location_id ??
        txn.dest_location_id ??
        item.source_location_id ??
        txn.source_location_id

      await tx.inventory_movements.create({
        data: {
          tenant_id: tenantId,
          product_variant_id: item.product_variant_id,
          movement_type: legacyMovementType,
          quantity_delta:
            txn.direction === 'outbound'
              ? item.quantity.negated()
              : item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
          warehouse_id: primaryWarehouseId,
          store_id: primaryStoreId,
          warehouse_location_id: primaryLocationId,
          dest_store_id: item.dest_store_id ?? txn.dest_store_id,
          dest_warehouse_location_id:
            item.dest_location_id ?? txn.dest_location_id,
          batch_id: item.batch_id,
          serial_id: item.serial_id,
          reference_type: txn.reference_type ?? 'inventory_transaction',
          reference_id: txn.reference_id ?? txn.id,
          source_document_type: txn.transaction_type.code,
          source_document_id: txn.id,
          occurred_at: new Date(),
          notes: item.notes ?? txn.notes,
          qty_before: item.qty_before,
          qty_after: item.qty_after,
          created_by_user_id: tenantUserId,
        },
      })
    }

    // 3. Mark transaction as posted
    const updatedTxn = await tx.inventory_transactions.update({
      where: { id: txn.id },
      data: {
        status: 'posted',
        posted_by: tenantUserId,
        posted_at: new Date(),
        updated_by_user_id: tenantUserId,
      },
      include: {
        items: true,
        transaction_type: true,
      },
    })

    // 4. Record Audit Log
    await tx.inventory_audit_logs.create({
      data: {
        tenant_id: tenantId,
        transaction_id: txn.id,
        action: 'POST',
        entity_type: 'inventory_transactions',
        entity_id: txn.id,
        old_values: { status: txn.status },
        new_values: { status: 'posted', posted_at: updatedTxn.posted_at },
        user_id: tenantUserId,
        idempotency_key: txn.idempotency_key,
        metadata: {
          transaction_number: txn.transaction_number,
          type_code: txn.transaction_type.code,
          total_qty: txn.total_qty.toString(),
          total_cost: txn.total_cost.toString(),
        },
      },
    })

    return { transaction: updatedTxn, alreadyPosted: false }
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    if (client) {
      return await executePosting(client)
    }
    return await prisma.$transaction(async (tx) => {
      return await executePosting(tx)
    })
  })
}

/**
 * Cancels an unposted transaction (draft or pending).
 */
export async function cancelInventoryTransaction(
  authUserId: string,
  transactionId: string,
  reason?: string
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const txn = await prisma.inventory_transactions.findFirst({
      where: { id: transactionId, tenant_id: tenantId },
    })

    if (!txn) {
      throw new ApiError('Inventory transaction not found.', 404)
    }

    if (txn.status === 'posted') {
      throw new ApiError(
        'A posted inventory transaction cannot be cancelled. Use reverseTransaction() instead.',
        400
      )
    }

    if (txn.status === 'cancelled') {
      return { transaction: txn, alreadyCancelled: true }
    }

    const cancelled = await prisma.inventory_transactions.update({
      where: { id: transactionId },
      data: {
        status: 'cancelled',
        cancelled_by: tenantUserId,
        cancelled_at: new Date(),
        notes: reason
          ? `${txn.notes ?? ''}\nCancellation reason: ${reason}`.trim()
          : txn.notes,
        updated_by_user_id: tenantUserId,
      },
    })

    await prisma.inventory_audit_logs.create({
      data: {
        tenant_id: tenantId,
        transaction_id: transactionId,
        action: 'CANCEL',
        entity_type: 'inventory_transactions',
        entity_id: transactionId,
        old_values: { status: txn.status },
        new_values: { status: 'cancelled' },
        user_id: tenantUserId,
        metadata: { reason },
      },
    })

    return { transaction: cancelled, alreadyCancelled: false }
  })
}

/**
 * Reverses a posted inventory transaction by creating an inverted offsetting transaction.
 */
export async function reverseInventoryTransaction(
  authUserId: string,
  transactionId: string,
  reason: string
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const original = await prisma.inventory_transactions.findFirst({
      where: { id: transactionId, tenant_id: tenantId },
      include: {
        items: true,
        transaction_type: true,
      },
    })

    if (!original) {
      throw new ApiError('Original inventory transaction not found.', 404)
    }

    if (original.status !== 'posted') {
      throw new ApiError(
        `Cannot reverse transaction in '${original.status}' status. Only posted transactions can be reversed.`,
        400
      )
    }

    if (original.reversed_by_transaction_id) {
      throw new ApiError('This transaction has already been reversed.', 400)
    }

    // Determine reversing transaction type:
    // If it was INBOUND, reversal should be OUTBOUND (e.g. ADJUSTMENT_OUT or specific return)
    // If it was OUTBOUND, reversal should be INBOUND (e.g. ADJUSTMENT_IN or return)
    let reversalTypeCode = 'ADJUSTMENT_IN'
    if (original.direction === 'inbound') {
      reversalTypeCode = 'ADJUSTMENT_OUT'
    } else if (original.direction === 'outbound') {
      reversalTypeCode = 'ADJUSTMENT_IN'
    }

    // Create inverted items: swapping source and destination if internal transfer
    const reversalItems: InventoryTransactionItemInput[] = original.items.map(
      (item) => ({
        productVariantId: item.product_variant_id,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        sourceWarehouseId:
          original.direction === 'inbound'
            ? item.dest_warehouse_id
            : item.source_warehouse_id,
        sourceStoreId:
          original.direction === 'inbound'
            ? item.dest_store_id
            : item.source_store_id,
        destWarehouseId:
          original.direction === 'outbound'
            ? item.source_warehouse_id
            : item.dest_warehouse_id,
        destStoreId:
          original.direction === 'outbound'
            ? item.source_store_id
            : item.dest_store_id,
        batchId: item.batch_id,
        serialId: item.serial_id,
        condition: item.condition,
        notes: `Reversal of line ${item.id}`,
      })
    )

    // Create and post the reversal transaction
    const createdReversal = await createInventoryTransaction(authUserId, {
      typeCode: reversalTypeCode,
      referenceType: 'inventory_transaction_reversal',
      referenceId: original.id,
      notes: `Reversal of ${original.transaction_number}. Reason: ${reason}`,
      autoPost: true,
      items: reversalItems,
    })

    const reversalTxn = createdReversal.transaction

    // Link both transactions together
    await prisma.inventory_transactions.update({
      where: { id: original.id },
      data: {
        status: 'reversed',
        reversed_by_transaction_id: reversalTxn.id,
        updated_by_user_id: tenantUserId,
      },
    })

    await prisma.inventory_transactions.update({
      where: { id: reversalTxn.id },
      data: {
        reversal_of_transaction_id: original.id,
      },
    })

    await prisma.inventory_audit_logs.create({
      data: {
        tenant_id: tenantId,
        transaction_id: original.id,
        action: 'REVERSE',
        entity_type: 'inventory_transactions',
        entity_id: original.id,
        old_values: { status: original.status },
        new_values: {
          status: 'reversed',
          reversed_by_transaction_id: reversalTxn.id,
        },
        user_id: tenantUserId,
        metadata: {
          reason,
          reversal_transaction_number: reversalTxn.transaction_number,
        },
      },
    })

    return {
      originalTransactionId: original.id,
      reversalTransaction: reversalTxn,
    }
  })
}

/**
 * List inventory transactions for a tenant with rich filtering and pagination.
 */
export async function listInventoryTransactions(
  authUserId: string,
  filters: ListTransactionsFilters = {}
) {
  const tenantId = await requireTenantId(authUserId)
  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100)
  const skip = (page - 1) * pageSize

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const where: Prisma.inventory_transactionsWhereInput = {
      tenant_id: tenantId,
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.typeCode) {
      where.transaction_type = { code: filters.typeCode }
    }

    if (filters.sourceWarehouseId) {
      where.source_warehouse_id = filters.sourceWarehouseId
    }

    if (filters.destWarehouseId) {
      where.dest_warehouse_id = filters.destWarehouseId
    }

    if (filters.referenceType) {
      where.reference_type = filters.referenceType
    }

    if (filters.referenceId) {
      where.reference_id = filters.referenceId
    }

    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {}
      if (filters.dateFrom) where.created_at.gte = new Date(filters.dateFrom)
      if (filters.dateTo) where.created_at.lte = new Date(filters.dateTo)
    }

    if (filters.search) {
      where.OR = [
        {
          transaction_number: { contains: filters.search, mode: 'insensitive' },
        },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.inventory_transactions.count({ where }),
      prisma.inventory_transactions.findMany({
        where,
        include: {
          transaction_type: true,
          items: {
            include: {
              product_variants: {
                select: {
                  sku: true,
                  barcode: true,
                  products: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  })
}

/**
 * Fetch a single inventory transaction by ID with full item details and audit logs.
 */
export async function getInventoryTransactionById(
  authUserId: string,
  transactionId: string
) {
  const tenantId = await requireTenantId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const transaction = await prisma.inventory_transactions.findFirst({
      where: { id: transactionId, tenant_id: tenantId },
      include: {
        transaction_type: {
          include: { rules: true },
        },
        items: {
          include: {
            product_variants: {
              include: {
                products: true,
              },
            },
            stock_balances: true,
          },
        },
        audit_logs: {
          orderBy: { created_at: 'desc' },
        },
      },
    })

    if (!transaction) {
      throw new ApiError('Inventory transaction not found.', 404)
    }

    return transaction
  })
}

// ============================================================================
// SPECIFIC ERP FLOW WRAPPERS
// ============================================================================

/**
 * Helper to post Goods Receipt / Vendor Purchase into inventory.
 */
export async function postPurchaseReceipt(
  authUserId: string,
  params: {
    destWarehouseId?: string | null
    destStoreId?: string | null
    destLocationId?: string | null
    referenceId?: string | null
    notes?: string | null
    idempotencyKey?: string | null
    items: Array<{
      productVariantId: string
      quantity: number | string
      unitCost: number | string
      batchNumber?: string | null
      expiryDate?: string | null
      notes?: string | null
    }>
  }
) {
  return await createInventoryTransaction(authUserId, {
    typeCode: 'PURCHASE_RECEIPT',
    destWarehouseId: params.destWarehouseId,
    destStoreId: params.destStoreId,
    destLocationId: params.destLocationId,
    referenceType: 'goods_receipt',
    referenceId: params.referenceId,
    notes: params.notes,
    idempotencyKey: params.idempotencyKey,
    autoPost: true,
    items: params.items.map((i) => ({
      productVariantId: i.productVariantId,
      quantity: i.quantity,
      unitCost: i.unitCost,
      lotNumber: i.batchNumber,
      notes: i.notes,
    })),
  })
}

/**
 * Helper to post immediate POS sale stock deduction.
 */
export async function postPosSale(
  authUserId: string,
  params: {
    sourceWarehouseId?: string | null
    sourceStoreId?: string | null
    saleId: string
    idempotencyKey?: string | null
    items: Array<{
      productVariantId: string
      quantity: number | string
      unitCost?: number | string
    }>
  }
) {
  return await createInventoryTransaction(authUserId, {
    typeCode: 'SALE_POS',
    sourceWarehouseId: params.sourceWarehouseId,
    sourceStoreId: params.sourceStoreId,
    referenceType: 'financial_transaction',
    referenceId: params.saleId,
    idempotencyKey: params.idempotencyKey,
    autoPost: true,
    items: params.items.map((i) => ({
      productVariantId: i.productVariantId,
      quantity: i.quantity,
      unitCost: i.unitCost,
    })),
  })
}

/**
 * Helper to reserve stock for sales order or marketplace checkout.
 */
export async function reserveInventoryStock(
  authUserId: string,
  params: {
    warehouseId?: string | null
    storeId?: string | null
    referenceType: string
    referenceId: string
    referenceItemId?: string | null
    productVariantId: string
    quantity: number | string
    expiresAt?: Date | null
  }
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    // 1. Check current available stock
    const balance = await prisma.stock_balances.findFirst({
      where: {
        tenant_id: tenantId,
        product_variant_id: params.productVariantId,
        warehouse_id: params.warehouseId ?? undefined,
        store_id: params.storeId ?? undefined,
      },
    })

    const qty = toDecimal(params.quantity)
    const available = toDecimal(
      balance?.qty_available ?? balance?.qty_on_hand ?? 0
    )

    if (available.lt(qty)) {
      throw new ApiError(
        `Insufficient available stock to reserve. Requested: ${qty.toString()}, Available: ${available.toString()}`,
        400
      )
    }

    // 2. Post STOCK_RESERVATION transaction
    await createInventoryTransaction(authUserId, {
      typeCode: 'STOCK_RESERVATION',
      sourceWarehouseId: params.warehouseId,
      sourceStoreId: params.storeId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      autoPost: true,
      items: [
        {
          productVariantId: params.productVariantId,
          quantity: qty,
          referenceItemType: params.referenceType,
          referenceItemId: params.referenceItemId,
        },
      ],
    })

    // 3. Create stock_reservations record
    const reservation = await prisma.stock_reservations.create({
      data: {
        tenant_id: tenantId,
        reservation_no: `RES-${Date.now().toString().slice(-6)}`,
        warehouse_id: params.warehouseId ?? null,
        store_id: params.storeId ?? null,
        product_variant_id: params.productVariantId,
        stock_balance_id: balance?.id ?? null,
        qty,
        qty_consumed: 0,
        status: 'active',
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        reference_item_id: params.referenceItemId ?? null,
        expires_at: params.expiresAt ?? null,
        created_by_user_id: tenantUserId,
      },
    })

    return reservation
  })
}

/**
 * Helper to release an active stock reservation.
 */
export async function releaseInventoryReservation(
  authUserId: string,
  reservationId: string,
  reason = 'Cancelled by user'
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const reservation = await prisma.stock_reservations.findFirst({
      where: { id: reservationId, tenant_id: tenantId },
    })

    if (!reservation) {
      throw new ApiError('Reservation not found.', 404)
    }

    if (reservation.status !== 'active') {
      throw new ApiError(
        `Reservation is in '${reservation.status}' status, cannot be released.`,
        400
      )
    }

    const unconsumedQty = reservation.qty.minus(reservation.qty_consumed)

    if (unconsumedQty.gt(0)) {
      // Post un-reservation transaction
      await createInventoryTransaction(authUserId, {
        typeCode: 'STOCK_UNRESERVATION',
        sourceWarehouseId: reservation.warehouse_id,
        sourceStoreId: reservation.store_id,
        referenceType: 'stock_reservation',
        referenceId: reservation.id,
        autoPost: true,
        items: [
          {
            productVariantId: reservation.product_variant_id,
            quantity: unconsumedQty,
          },
        ],
      })
    }

    const updated = await prisma.stock_reservations.update({
      where: { id: reservationId },
      data: {
        status: 'released',
        release_reason: reason,
        released_at: new Date(),
        updated_by_user_id: tenantUserId,
      },
    })

    return updated
  })
}

// ============================================================================
// UTILITY MAPPING
// ============================================================================

function mapCategoryToLegacyMovement(
  category: string,
  direction: string
): movement_type_enum {
  switch (category) {
    case 'purchase':
      return 'purchase'
    case 'sale':
      return 'sale'
    case 'transfer':
      return direction === 'outbound' ? 'transfer_out' : 'transfer_in'
    case 'adjustment':
      return direction === 'inbound' ? 'adjustment_in' : 'adjustment_out'
    case 'reservation':
      return 'reserved'
    case 'return_':
      return direction === 'inbound' ? 'sale_return' : 'purchase_return'
    case 'production':
      return direction === 'outbound'
        ? 'production_consumption'
        : 'production_output'
    case 'opening':
      return 'opening_stock'
    default:
      return direction === 'inbound' ? 'adjustment_in' : 'adjustment_out'
  }
}
