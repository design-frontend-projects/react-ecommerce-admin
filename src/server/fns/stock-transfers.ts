'use server'

import type { transfer_status_enum } from '@/generated/prisma/client'
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
  return prisma.stock_transfers.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })
}

export async function getTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const transfer = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!transfer) {
    throw new ApiError('Transfer not found.', 404)
  }
  const items = await prisma.stock_transfer_items.findMany({
    where: { stock_transfer_id: id },
  })
  return {
    ...transfer,
    stock_transfer_items: items,
  }
}

export async function createTransfer(
  authUserId: string,
  input: CreateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const sourceWh = input.sourceWarehouseId || input.fromStoreId
  const destWh = input.destinationWarehouseId || input.toStoreId

  if (!sourceWh || !destWh) {
    throw new ApiError('Source and destination warehouses are required.', 400)
  }
  if (sourceWh === destWh) {
    throw new ApiError('Source and destination must differ.', 422)
  }
  assertItems(input.items)

  return prisma.$transaction(async (tx: any) => {
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
          stock_transfer_id: created.id,
          product_variant_id: item.productVariantId,
          source_location_id: item.sourceLocationId ?? null,
          destination_location_id: item.destinationLocationId ?? null,
          qty: item.qty,
          unit_cost: item.unitCost ?? 0,
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

  return prisma.$transaction(async (tx: any) => {
    if (input.items) {
      await tx.stock_transfer_items.deleteMany({
        where: { stock_transfer_id: id },
      })
      await tx.stock_transfer_items.createMany({
        data: input.items.map((item) => ({
          stock_transfer_id: id,
          product_variant_id: item.productVariantId,
          source_location_id: item.sourceLocationId ?? null,
          destination_location_id: item.destinationLocationId ?? null,
          qty: item.qty,
          unit_cost: item.unitCost ?? 0,
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
  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'approved' as transfer_status_enum,
      approved_by: authUserId,
      approved_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function pickTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'picked' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function shipTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'in_transit' as transfer_status_enum,
      shipped_by: authUserId,
      shipped_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function receiveTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  // Call Supabase RPC to record movements and balance adjustments
  const { error } = await supabaseAdmin.rpc('apply_stock_transfer', {
    p_transfer_id: id,
  })
  if (error) {
    // If RPC is missing/fails, update status in prisma
    console.warn('RPC apply_stock_transfer warning:', error.message)
  }

  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'received' as transfer_status_enum,
      received_by: authUserId,
      received_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function completeTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  return prisma.stock_transfers.update({
    where: { id, tenant_id: tenantId },
    data: {
      status: 'completed' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
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
    throw new ApiError('A completed transfer cannot be cancelled.', 409)
  }
  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'cancelled' as transfer_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function applyTransfer(authUserId: string, id: string) {
  return receiveTransfer(authUserId, id)
}
