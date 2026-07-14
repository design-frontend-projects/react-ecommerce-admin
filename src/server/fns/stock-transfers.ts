'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
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
    include: {
      from_store: { select: { store_id: true, name: true } },
      to_store: { select: { store_id: true, name: true } },
      _count: { select: { stock_transfer_items: true } },
    },
  })
}

export async function getTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const transfer = await prisma.stock_transfers.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      from_store: { select: { store_id: true, name: true } },
      to_store: { select: { store_id: true, name: true } },
      stock_transfer_items: {
        include: {
          product_variants: { select: { id: true, sku: true } },
        },
      },
    },
  })
  if (!transfer) {
    throw new ApiError('Transfer not found.', 404)
  }
  return transfer
}

export async function createTransfer(
  authUserId: string,
  input: CreateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)

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

  return prisma.stock_transfers.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      from_store_id: input.fromStoreId,
      to_store_id: input.toStoreId,
      from_branch_id: fromBranchId,
      to_branch_id: toBranchId,
      reference_no: input.referenceNo ?? null,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft',
      stock_transfer_items: {
        create: input.items.map((item) => ({
          product_variant_id: item.productVariantId,
          qty: item.qty,
          unit_cost: item.unitCost ?? 0,
        })),
      },
    },
    include: { stock_transfer_items: true },
  })
}

export async function updateTransferDraft(
  authUserId: string,
  id: string,
  input: UpdateTransferInput
) {
  const tenantId = await requireTenantId(authUserId)
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

  return prisma.$transaction(async (tx: typeof prisma) => {
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
        })),
      })
    }
    return tx.stock_transfers.update({
      where: { id },
      data: {
        reference_no: input.referenceNo ?? undefined,
        notes: input.notes ?? undefined,
      },
      include: { stock_transfer_items: true },
    })
  })
}

export async function cancelTransfer(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
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
    data: { status: 'cancelled' },
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
