'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface TransferItemInput {
  productVariantId: string
  qty: number
  unitCost?: number
}

export interface CreateTransferInput {
  fromStoreId: string
  toStoreId: string
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

async function resolveStoreBranch(storeId: string): Promise<string | null> {
  const store = (await prisma.stores.findUnique({
    where: { store_id: storeId },
    select: { branch_id: true },
  })) as { branch_id: string | null } | null
  return store?.branch_id ?? null
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

  if (!input.fromStoreId || !input.toStoreId) {
    throw new ApiError('Source and destination stores are required.', 400)
  }
  if (input.fromStoreId === input.toStoreId) {
    throw new ApiError('Source and destination store must differ.', 422)
  }
  assertItems(input.items)

  const [fromBranchId, toBranchId] = await Promise.all([
    resolveStoreBranch(input.fromStoreId),
    resolveStoreBranch(input.toStoreId),
  ])

  return prisma.$transaction(async (tx: any) => {
    const created = await tx.stock_transfers.create({
      data: {
        tenant_id: tenantId,
        from_store_id: input.fromStoreId,
        to_store_id: input.toStoreId,
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        reference_no: input.referenceNo ?? null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft',
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (input.items.length > 0) {
      await tx.stock_transfer_items.createMany({
        data: input.items.map((item) => ({
          stock_transfer_id: created.id,
          product_variant_id: item.productVariantId,
          qty: item.qty,
          unit_cost: item.unitCost ?? 0,
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
          qty: item.qty,
          unit_cost: item.unitCost ?? 0,
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
  if (existing.status === 'received') {
    throw new ApiError('A received transfer cannot be cancelled.', 409)
  }
  return prisma.stock_transfers.update({
    where: { id },
    data: {
      status: 'cancelled',
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function applyTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Transfer not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc('apply_stock_transfer', {
    p_transfer_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
