'use server'

import {
  type transfer_status_enum,
  type stock_condition_enum,
  type movement_type_enum,
  Prisma,
} from '@/generated/prisma/client'

const Decimal = Prisma.Decimal
import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface TransferItemInput {
  productVariantId: string
  sourceLocationId?: string | null
  destinationLocationId?: string | null
  qty: number
  unitCost?: number
  condition?: 'good' | 'damaged' | 'quarantine' | 'expired' | 'blocked'
  batchId?: string | null
  serialId?: string | null
}

export interface CreateTransferInput {
  sourceWarehouseId?: string | null
  destinationWarehouseId?: string | null
  fromStoreId?: string | null
  toStoreId?: string | null
  fromBranchId?: string | null
  toBranchId?: string | null
  referenceNo?: string | null
  notes?: string | null
  items: TransferItemInput[]
}

export interface UpdateTransferInput {
  referenceNo?: string | null
  notes?: string | null
  items?: TransferItemInput[]
}

function assertItems(items: TransferItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A transfer must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (!(item.qty > 0)) {
      throw new ApiError('Each item quantity must be greater than zero.', 400)
    }
  }
}

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

export function serializeTransfer<
  T extends {
    transfer_no?: bigint | number | string | null
    stock_transfer_items?: Array<Record<string, unknown>>
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
            received_qty: toNumeric(it.received_qty, 0),
            unit_cost: it.unit_cost == null ? null : toNumeric(it.unit_cost, 0),
            weight: it.weight == null ? 0 : toNumeric(it.weight, 0),
            list_price: it.list_price == null ? null : toNumeric(it.list_price, 0),
          })),
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

export async function listTransfers(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const transfers = await prisma.stock_transfers.findMany({
    where: { tenant_id: tenantId },
    include: {
      source_warehouse: {
        select: { id: true, name: true, code: true },
      },
      destination_warehouse: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  if (transfers.length === 0) {
    return []
  }

  const transferIds = transfers.map((t) => t.id)
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

  const [itemCounts, stores, branches] = await Promise.all([
    prisma.stock_transfer_items.groupBy({
      by: ['stock_transfer_id'],
      _count: { id: true },
      where: { stock_transfer_id: { in: transferIds } },
    }),
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

  const countsMap = new Map(
    itemCounts.map((c) => [c.stock_transfer_id, c._count.id])
  )
  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const branchMap = new Map(branches.map((b) => [b.id, b]))

  return transfers.map((t) => {
    const fromStore = t.from_store_id ? storeMap.get(t.from_store_id) : null
    const toStore = t.to_store_id ? storeMap.get(t.to_store_id) : null
    const fromBranch = t.from_branch_id ? branchMap.get(t.from_branch_id) : null
    const toBranch = t.to_branch_id ? branchMap.get(t.to_branch_id) : null

    return {
      ...t,
      transfer_no: t.transfer_no != null ? t.transfer_no.toString() : null,
      from_store: fromStore
        ? { store_id: fromStore.store_id, name: fromStore.name }
        : null,
      to_store: toStore
        ? { store_id: toStore.store_id, name: toStore.name }
        : null,
      from_branch: fromBranch
        ? { id: fromBranch.id, name: fromBranch.name }
        : null,
      to_branch: toBranch
        ? { id: toBranch.id, name: toBranch.name }
        : null,
      _count: {
        stock_transfer_items: countsMap.get(t.id) ?? 0,
      },
    }
  })
}

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
    },
  })
  if (!transfer) {
    throw new ApiError('Transfer not found.', 404)
  }

  const items = await prisma.stock_transfer_items.findMany({
    where: { stock_transfer_id: id },
    orderBy: { created_at: 'asc' },
  })

  // Enrich items with variants & locations
  const variantIds = Array.from(
    new Set(items.map((it) => it.product_variant_id).filter(Boolean))
  )
  const locationIds = Array.from(
    new Set(
      items
        .flatMap((it) => [it.source_location_id, it.destination_location_id])
        .filter(Boolean) as string[]
    )
  )

  const storeIds = [transfer.from_store_id, transfer.to_store_id].filter(
    Boolean
  ) as string[]
  const branchIds = [transfer.from_branch_id, transfer.to_branch_id].filter(
    Boolean
  ) as string[]

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
            price_list: {
              is_active: true,
            },
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

  // Build price item lookup
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

  // Enrich inventory movements with warehouse & variant names
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

  const fromStore = transfer.from_store_id
    ? storeMap.get(transfer.from_store_id)
    : null
  const toStore = transfer.to_store_id
    ? storeMap.get(transfer.to_store_id)
    : null
  const fromBranch = transfer.from_branch_id
    ? branchMap.get(transfer.from_branch_id)
    : null
  const toBranch = transfer.to_branch_id
    ? branchMap.get(transfer.to_branch_id)
    : null

  return serializeTransfer({
    ...transfer,
    total_weight: totalWeight,
    total_cost_valuation: totalCostValuation,
    total_price_valuation: totalPriceValuation,
    from_store: fromStore
      ? { store_id: fromStore.store_id, name: fromStore.name }
      : null,
    to_store: toStore
      ? { store_id: toStore.store_id, name: toStore.name }
      : null,
    from_branch: fromBranch
      ? { id: fromBranch.id, name: fromBranch.name }
      : null,
    to_branch: toBranch
      ? { id: toBranch.id, name: toBranch.name }
      : null,
    stock_transfer_items: enrichedItems,
    inventory_movements: enrichedMovements,
    _count: {
      stock_transfer_items: items.length,
    },
  })
}

export async function createTransfer(
  authUserId: string,
  input: CreateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const sourceEntity =
    input.sourceWarehouseId || input.fromStoreId || input.fromBranchId
  const destEntity =
    input.destinationWarehouseId || input.toStoreId || input.toBranchId

  if (!sourceEntity || !destEntity) {
    throw new ApiError('Source and destination are required.', 400)
  }
  if (
    sourceEntity === destEntity &&
    Boolean(input.sourceWarehouseId) === Boolean(input.destinationWarehouseId) &&
    Boolean(input.fromStoreId) === Boolean(input.toStoreId) &&
    Boolean(input.fromBranchId) === Boolean(input.toBranchId)
  ) {
    throw new ApiError('Source and destination must differ.', 422)
  }
  assertItems(input.items)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.stock_transfers.create({
      data: {
        tenant_id: tenantId,
        source_warehouse_id: input.sourceWarehouseId ?? null,
        destination_warehouse_id: input.destinationWarehouseId ?? null,
        from_store_id: input.fromStoreId ?? null,
        to_store_id: input.toStoreId ?? null,
        from_branch_id: input.fromBranchId ?? null,
        to_branch_id: input.toBranchId ?? null,
        reference_no: input.referenceNo ?? null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft' as transfer_status_enum,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (input.items.length > 0) {
      await tx.stock_transfer_items.createMany({
        data: input.items.map((item) => ({
          tenant_id: tenantId,
          stock_transfer_id: created.id,
          product_variant_id: item.productVariantId,
          source_location_id: item.sourceLocationId ?? null,
          destination_location_id: item.destinationLocationId ?? null,
          qty: item.qty,
          received_qty: 0,
          unit_cost: item.unitCost ?? 0,
          condition: (item.condition as stock_condition_enum) || 'good',
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: created.id },
    })

    return serializeTransfer({
      ...created,
      stock_transfer_items: items,
    })
  })
}

export async function updateTransferDraft(
  authUserId: string,
  id: string,
  input: UpdateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError('Only draft transfers can be edited.', 409)
  }

  if (input.items) {
    assertItems(input.items)
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.items) {
      await tx.stock_transfer_items.deleteMany({
        where: { stock_transfer_id: id },
      })
      await tx.stock_transfer_items.createMany({
        data: input.items.map((item) => ({
          tenant_id: tenantId,
          stock_transfer_id: id,
          product_variant_id: item.productVariantId,
          source_location_id: item.sourceLocationId ?? null,
          destination_location_id: item.destinationLocationId ?? null,
          qty: item.qty,
          received_qty: 0,
          unit_cost: item.unitCost ?? 0,
          condition: (item.condition as stock_condition_enum) || 'good',
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }
    const updated = await tx.stock_transfers.update({
      where: { id },
      data: {
        reference_no: input.referenceNo ?? undefined,
        notes: input.notes ?? undefined,
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
    })
    const items = await tx.stock_transfer_items.findMany({
      where: { stock_transfer_id: id },
    })
    return serializeTransfer({
      ...updated,
      stock_transfer_items: items,
    })
  })
}

export async function approveTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError(
      `Cannot approve transfer in '${existing.status}' status. Only draft transfers can be approved.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'approved' as transfer_status_enum,
      approved_by: authUserId,
      approved_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

export async function pickTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'approved') {
    throw new ApiError(
      `Cannot pick transfer in '${existing.status}' status. Transfer must be approved first.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'picked' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

export async function shipTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const [existing, transferItems] = await Promise.all([
    prisma.stock_transfers.findFirst({
      where: { id, tenant_id: tenantId },
    }),
    prisma.stock_transfer_items.findMany({
      where: { stock_transfer_id: id },
    }),
  ])
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'picked' && existing.status !== 'approved') {
    throw new ApiError(
      `Cannot ship transfer in '${existing.status}' status. Transfer must be picked or approved first.`,
      409
    )
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.stock_transfers.update({
      where: { id, tenant_id: tenantId },
      data: {
        status: 'in_transit' as transfer_status_enum,
        shipped_by: authUserId,
        shipped_at: new Date(),
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
    })

    // If source_warehouse_id exists, record transfer_out movements and adjust stock balances
    if (existing.source_warehouse_id && transferItems.length > 0) {
      for (const item of transferItems) {
        const itemQty = toNumeric(item.qty, 0)
        if (itemQty <= 0) continue

        const balance = await tx.stock_balances.findFirst({
          where: {
            tenant_id: tenantId,
            warehouse_id: existing.source_warehouse_id,
            product_variant_id: item.product_variant_id,
          },
        })

        const currentOnHand = balance ? toNumeric(balance.qty_on_hand, 0) : 0
        const newOnHand = currentOnHand - itemQty

        if (balance) {
          await tx.stock_balances.update({
            where: { id: balance.id },
            data: {
              qty_on_hand: new Decimal(newOnHand),
              qty_available: new Decimal(toNumeric(balance.qty_available, 0) - itemQty),
              qty_in_transit: new Decimal(toNumeric(balance.qty_in_transit, 0) + itemQty),
              last_movement_at: new Date(),
              updated_by_user_id: tenantUserId,
            },
          })
        }

        const unitCostNum = item.unit_cost != null ? toNumeric(item.unit_cost, 0) : 0
        await tx.inventory_movements.create({
          data: {
            tenant_id: tenantId,
            warehouse_id: existing.source_warehouse_id,
            warehouse_location_id: item.source_location_id ?? null,
            product_variant_id: item.product_variant_id,
            movement_type: 'transfer_out' as movement_type_enum,
            status: 'posted',
            condition: item.condition,
            quantity_delta: new Decimal(-itemQty),
            unit_cost: new Decimal(unitCostNum),
            total_cost: new Decimal(itemQty * unitCostNum),
            qty_before: new Decimal(currentOnHand),
            qty_after: new Decimal(newOnHand),
            reference_type: 'stock_transfer',
            reference_id: id,
            remarks: `Stock transfer dispatched: ${existing.reference_no ?? id}`,
            created_by: authUserId,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }
    }

    return updated
  })
}

export async function receiveTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const [existing, transferItems] = await Promise.all([
    prisma.stock_transfers.findFirst({
      where: { id, tenant_id: tenantId },
    }),
    prisma.stock_transfer_items.findMany({
      where: { stock_transfer_id: id },
    }),
  ])
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'in_transit') {
    throw new ApiError(
      `Cannot receive transfer in '${existing.status}' status. Transfer must be in transit.`,
      409
    )
  }

  // Call Supabase RPC to record movements and balance adjustments if available
  try {
    const { error } = await supabaseAdmin.rpc('apply_stock_transfer', {
      p_transfer_id: id,
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('RPC apply_stock_transfer warning:', error.message)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('RPC invocation failed:', (e as Error)?.message)
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Ensure all items have received_qty populated
    for (const item of transferItems) {
      const sentQty = toNumeric(item.qty, 0)
      const currentRecv = toNumeric(item.received_qty, 0)
      const recvQty = currentRecv > 0 ? currentRecv : sentQty

      await tx.stock_transfer_items.update({
        where: { id: item.id },
        data: { received_qty: recvQty },
      })

      // If destination_warehouse_id exists, record transfer_in movements and increment stock balances
      if (existing.destination_warehouse_id && recvQty > 0) {
        const destBalance = await tx.stock_balances.findFirst({
          where: {
            tenant_id: tenantId,
            warehouse_id: existing.destination_warehouse_id,
            product_variant_id: item.product_variant_id,
          },
        })

        const currentOnHand = destBalance ? toNumeric(destBalance.qty_on_hand, 0) : 0
        const newOnHand = currentOnHand + recvQty

        if (destBalance) {
          await tx.stock_balances.update({
            where: { id: destBalance.id },
            data: {
              qty_on_hand: new Decimal(newOnHand),
              qty_available: new Decimal(toNumeric(destBalance.qty_available, 0) + recvQty),
              last_movement_at: new Date(),
              updated_by_user_id: tenantUserId,
            },
          })
        } else {
          await tx.stock_balances.create({
            data: {
              tenant_id: tenantId,
              warehouse_id: existing.destination_warehouse_id,
              location_id: item.destination_location_id ?? null,
              product_variant_id: item.product_variant_id,
              condition: item.condition,
              qty_on_hand: new Decimal(newOnHand),
              qty_available: new Decimal(newOnHand),
              qty_reserved: new Decimal(0),
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })
        }

        const unitCostNum = item.unit_cost != null ? toNumeric(item.unit_cost, 0) : 0
        await tx.inventory_movements.create({
          data: {
            tenant_id: tenantId,
            warehouse_id: existing.destination_warehouse_id,
            warehouse_location_id: item.destination_location_id ?? null,
            product_variant_id: item.product_variant_id,
            movement_type: 'transfer_in' as movement_type_enum,
            status: 'posted',
            condition: item.condition,
            quantity_delta: new Decimal(recvQty),
            unit_cost: new Decimal(unitCostNum),
            total_cost: new Decimal(recvQty * unitCostNum),
            qty_before: new Decimal(currentOnHand),
            qty_after: new Decimal(newOnHand),
            reference_type: 'stock_transfer',
            reference_id: id,
            remarks: `Stock transfer received: ${existing.reference_no ?? id}`,
            created_by: authUserId,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          },
        })
      }
    }

    return tx.stock_transfers.update({
      where: { id, tenant_id: tenantId },
      data: {
        status: 'received' as transfer_status_enum,
        received_by: authUserId,
        received_at: new Date(),
        updated_by_user_id: tenantUserId,
        updated_at: new Date(),
      },
    })
  })
}

export async function completeTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'received') {
    throw new ApiError(
      `Cannot complete transfer in '${existing.status}' status. Transfer must be received first.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'completed' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

export async function cancelTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status === 'received' || existing.status === 'completed') {
    throw new ApiError('A completed or received transfer cannot be cancelled.', 409)
  }
  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'cancelled' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

export async function applyTransfer(authUserId: string, id: string) {
  return receiveTransfer(authUserId, id)
}
