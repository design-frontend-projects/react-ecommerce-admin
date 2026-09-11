'use server'

import type {
  transfer_status_enum,
  stock_condition_enum,
  Prisma,
} from '@/generated/prisma/client'
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

  const [variants, locations, stores, branches] = await Promise.all([
    variantIds.length > 0
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            barcode: true,
            products: {
              select: { id: true, name: true },
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
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const locationMap = new Map(locations.map((l) => [l.id, l]))
  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const branchMap = new Map(branches.map((b) => [b.id, b]))

  const enrichedItems = items.map((it) => ({
    ...it,
    product_variants: variantMap.get(it.product_variant_id) || null,
    source_location: it.source_location_id
      ? locationMap.get(it.source_location_id) || null
      : null,
    destination_location: it.destination_location_id
      ? locationMap.get(it.destination_location_id) || null
      : null,
  }))

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

  return {
    ...transfer,
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
    _count: {
      stock_transfer_items: items.length,
    },
  }
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

    return {
      ...created,
      stock_transfer_items: items,
    }
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
    return {
      ...updated,
      stock_transfer_items: items,
    }
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
  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }
  if (existing.status !== 'picked' && existing.status !== 'approved') {
    throw new ApiError(
      `Cannot ship transfer in '${existing.status}' status. Transfer must be picked or approved first.`,
      409
    )
  }

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'in_transit' as transfer_status_enum,
      shipped_by: authUserId,
      shipped_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
  })
}

export async function receiveTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })
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
  const { error } = await supabaseAdmin.rpc('apply_stock_transfer', {
    p_transfer_id: id,
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('RPC apply_stock_transfer warning:', error.message)
  }

  // Set received_qty equal to qty on all items if received_qty is 0
  await prisma.$executeRawUnsafe(
    `UPDATE stock_transfer_items SET received_qty = qty WHERE stock_transfer_id = $1::uuid AND received_qty = 0`,
    id
  ).catch((e: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('Unable to auto-update received_qty:', (e as Error)?.message)
  })

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'received' as transfer_status_enum,
      received_by: authUserId,
      received_at: new Date(),
      updated_by_user_id: tenantUserId,
      updated_at: new Date(),
    },
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
