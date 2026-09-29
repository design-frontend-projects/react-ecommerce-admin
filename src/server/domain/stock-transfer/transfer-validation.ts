import { ApiError } from '@/server/utils/api-error'
import { Prisma } from '@/generated/prisma/client'

export interface ValidatePartiesInput {
  tenantId: string
  sourceWarehouseId?: string | null
  destinationWarehouseId?: string | null
  fromStoreId?: string | null
  toStoreId?: string | null
  fromBranchId?: string | null
  toBranchId?: string | null
}

export interface ValidateItemInput {
  productVariantId: string
  qty: number
  unitCost?: number
  sourceLocationId?: string | null
  destinationLocationId?: string | null
  condition?: string
  batchId?: string | null
  serialId?: string | null
}

/**
 * Validates that source and destination entities exist, belong to tenant, and are distinct.
 */
export async function validateTransferParties(
  tx: Prisma.TransactionClient,
  input: ValidatePartiesInput
): Promise<void> {
  const sourceEntity =
    input.sourceWarehouseId || input.fromStoreId || input.fromBranchId
  const destEntity =
    input.destinationWarehouseId || input.toStoreId || input.toBranchId

  if (!sourceEntity || !destEntity) {
    throw new ApiError('Both source and destination must be specified.', 400)
  }

  // Prevent transferring to the exact same destination
  if (
    sourceEntity === destEntity &&
    Boolean(input.sourceWarehouseId) === Boolean(input.destinationWarehouseId) &&
    Boolean(input.fromStoreId) === Boolean(input.toStoreId) &&
    Boolean(input.fromBranchId) === Boolean(input.toBranchId)
  ) {
    throw new ApiError('Source and destination cannot be the same.', 422)
  }

  // Verify source warehouse if specified
  if (input.sourceWarehouseId) {
    const sWh = await tx.warehouses.findFirst({
      where: { id: input.sourceWarehouseId, tenant_id: input.tenantId },
      select: { id: true, name: true, is_active: true },
    })
    if (!sWh) {
      throw new ApiError(`Source warehouse '${input.sourceWarehouseId}' not found.`, 404)
    }
    if (!sWh.is_active) {
      throw new ApiError(`Source warehouse '${sWh.name}' is inactive.`, 400)
    }
  }

  // Verify destination warehouse if specified
  if (input.destinationWarehouseId) {
    const dWh = await tx.warehouses.findFirst({
      where: { id: input.destinationWarehouseId, tenant_id: input.tenantId },
      select: { id: true, name: true, is_active: true },
    })
    if (!dWh) {
      throw new ApiError(`Destination warehouse '${input.destinationWarehouseId}' not found.`, 404)
    }
    if (!dWh.is_active) {
      throw new ApiError(`Destination warehouse '${dWh.name}' is inactive.`, 400)
    }
  }

  // Verify stores if specified
  if (input.fromStoreId) {
    const sStore = await tx.stores.findFirst({
      where: { store_id: input.fromStoreId, tenant_id: input.tenantId },
      select: { store_id: true, name: true },
    })
    if (!sStore) {
      throw new ApiError(`Source store '${input.fromStoreId}' not found.`, 404)
    }
  }
  if (input.toStoreId) {
    const dStore = await tx.stores.findFirst({
      where: { store_id: input.toStoreId, tenant_id: input.tenantId },
      select: { store_id: true, name: true },
    })
    if (!dStore) {
      throw new ApiError(`Destination store '${input.toStoreId}' not found.`, 404)
    }
  }
}

/**
 * Validates items: checks positive quantity, variant existence, and active status.
 */
export async function validateTransferItems(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: ValidateItemInput[]
): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A stock transfer must contain at least one item.', 400)
  }

  const variantIds = items.map((it) => it.productVariantId)
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Every item requires a product variant ID.', 400)
    }
    if (!(item.qty > 0)) {
      throw new ApiError('Item quantity must be strictly greater than zero.', 400)
    }
  }

  const variants = await tx.product_variants.findMany({
    where: {
      id: { in: variantIds },
      tenant_id: tenantId,
    },
    select: {
      id: true,
      sku: true,
      name: true,
      is_active: true,
    },
  })

  const foundIds = new Set(variants.map((v) => v.id))
  for (const item of items) {
    if (!foundIds.has(item.productVariantId)) {
      throw new ApiError(
        `Product variant '${item.productVariantId}' not found for this tenant.`,
        404
      )
    }
  }

  const inactive = variants.filter((v) => v.is_active === false)
  if (inactive.length > 0) {
    throw new ApiError(
      `Cannot transfer inactive product variant(s): ${inactive.map((v) => v.sku || v.name).join(', ')}.`,
      400
    )
  }
}

/**
 * Validates that the source warehouse has sufficient available stock for each shipping item.
 */
export async function validateStockAvailabilityForShipment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  sourceWarehouseId: string,
  shippingItems: Array<{
    productVariantId: string
    quantity: number
    batchId?: string | null
    sourceLocationId?: string | null
  }>
): Promise<void> {
  for (const item of shippingItems) {
    if (item.quantity <= 0) continue

    // Find inventory item
    const invItem = await tx.inventory_items.findUnique({
      where: {
        tenant_id_product_variant_id: {
          tenant_id: tenantId,
          product_variant_id: item.productVariantId,
        },
      },
      select: { id: true, sku: true },
    })

    if (!invItem) {
      throw new ApiError(
        `No inventory item record exists for variant '${item.productVariantId}' in warehouse. Insufficient stock to ship.`,
        400
      )
    }

    // Query balances in source warehouse
    const balances = await tx.stock_balances.findMany({
      where: {
        tenant_id: tenantId,
        inventory_item_id: invItem.id,
        warehouse_id: sourceWarehouseId,
        ...(item.batchId ? { batch_id: item.batchId } : {}),
        ...(item.sourceLocationId ? { location_id: item.sourceLocationId } : {}),
      },
    })

    let totalAvailable = new Prisma.Decimal(0)
    for (const b of balances) {
      const onHand = b.qty_on_hand ?? new Prisma.Decimal(0)
      const reserved = b.qty_reserved ?? new Prisma.Decimal(0)
      const avail = onHand.minus(reserved)
      if (avail.gt(0)) {
        totalAvailable = totalAvailable.plus(avail)
      }
    }

    if (totalAvailable.lt(item.quantity)) {
      throw new ApiError(
        `Insufficient stock for SKU '${invItem.sku}' in source warehouse. Available: ${totalAvailable.toString()}, Requested to ship: ${item.quantity}.`,
        400
      )
    }
  }
}

/**
 * Validates batches if provided for an item.
 */
export async function validateBatch(
  tx: Prisma.TransactionClient,
  tenantId: string,
  variantId: string,
  batchId: string
): Promise<void> {
  const batch = await tx.product_batches.findFirst({
    where: {
      id: batchId,
      product_variant_id: variantId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      batch_number: true,
      status: true,
      expiry_date: true,
    },
  })

  if (!batch) {
    throw new ApiError(`Product batch '${batchId}' not found for variant '${variantId}'.`, 404)
  }

  if (batch.status && batch.status !== 'active') {
    throw new ApiError(
      `Product batch '${batch.batch_number}' is '${batch.status}' and cannot be transferred.`,
      400
    )
  }

  if (batch.expiry_date && new Date(batch.expiry_date) < new Date()) {
    throw new ApiError(
      `Product batch '${batch.batch_number}' expired on ${batch.expiry_date.toISOString().slice(0, 10)}.`,
      400
    )
  }
}

/**
 * Validates serial numbers if provided for an item.
 */
export async function validateSerial(
  tx: Prisma.TransactionClient,
  tenantId: string,
  variantId: string,
  serialId: string,
  _sourceWarehouseId?: string | null
): Promise<void> {
  const serial = await tx.product_serials.findFirst({
    where: {
      id: serialId,
      product_variant_id: variantId,
      tenant_id: tenantId,
    },
    select: {
      id: true,
      serial_number: true,
      status: true,
      warehouse_location_id: true,
    },
  })

  if (!serial) {
    throw new ApiError(`Product serial '${serialId}' not found for variant '${variantId}'.`, 404)
  }

  if (serial.status && serial.status !== 'in_stock') {
    throw new ApiError(
      `Product serial '${serial.serial_number}' is '${serial.status}' and cannot be transferred.`,
      400
    )
  }

  // Note: product_serials tracks warehouse_location_id, not warehouse_id directly.
  // Cross-warehouse validation would require resolving the location's parent warehouse.
  // For now, we skip direct warehouse comparison since the schema doesn't have warehouse_id on serials.
}
