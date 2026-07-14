'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateCountInput {
  storeId: string
  warehouseLocationId?: string | null
  categoryId?: number | null
  isBlind?: boolean
  notes?: string | null
}

export interface CountEntryInput {
  itemId: string
  qtyCounted: number
}

export async function listCounts(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.stock_counts.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      stores: { select: { store_id: true, name: true } },
      _count: { select: { stock_count_items: true } },
    },
  })
}

export async function getCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const count = await prisma.stock_counts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: { select: { store_id: true, name: true } },
      stock_count_items: {
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              products: { select: { name: true } },
            },
          },
          warehouse_locations: { select: { id: true, path: true } },
        },
      },
    },
  })
  if (!count) {
    throw new ApiError('Stock count not found.', 404)
  }
  return count
}

export async function createCount(authUserId: string, input: CreateCountInput) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.storeId) {
    throw new ApiError('A store is required.', 400)
  }

  return prisma.stock_counts.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      store_id: input.storeId,
      warehouse_location_id: input.warehouseLocationId ?? null,
      category_id: input.categoryId ?? null,
      is_blind: input.isBlind ?? false,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft',
    },
  })
}

async function requireCount(
  tenantId: string,
  id: string
): Promise<{ id: string; status: string }> {
  const existing = (await prisma.stock_counts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true, status: true },
  })) as { id: string; status: string } | null
  if (!existing) {
    throw new ApiError('Stock count not found.', 404)
  }
  return existing
}

export async function snapshotCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('snapshot_stock_count', {
    p_count_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function saveCounts(
  authUserId: string,
  id: string,
  entries: CountEntryInput[]
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await requireCount(tenantId, id)
  if (existing.status !== 'counting') {
    throw new ApiError(
      `Counts can only be recorded while the count is in counting status (currently ${existing.status}).`,
      409
    )
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ApiError('At least one count entry is required.', 400)
  }
  for (const entry of entries) {
    if (!entry.itemId) {
      throw new ApiError('Each entry requires an item id.', 400)
    }
    if (
      typeof entry.qtyCounted !== 'number' ||
      Number.isNaN(entry.qtyCounted) ||
      entry.qtyCounted < 0
    ) {
      throw new ApiError('Each entry requires a counted quantity >= 0.', 400)
    }
  }

  const now = new Date()
  for (const entry of entries) {
    await prisma.stock_count_items.updateMany({
      where: { id: entry.itemId, stock_count_id: id },
      data: {
        qty_counted: entry.qtyCounted,
        counted_at: now,
        counted_by: authUserId,
      },
    })
  }
  return { count_id: id, entries_saved: entries.length }
}

export async function reviewCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('review_stock_count', {
    p_count_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function postCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('post_stock_count', {
    p_count_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function cancelCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = await requireCount(tenantId, id)
  if (!['draft', 'counting'].includes(existing.status)) {
    throw new ApiError(
      `A ${existing.status} stock count cannot be cancelled.`,
      409
    )
  }
  return prisma.stock_counts.update({
    where: { id },
    data: { status: 'cancelled' },
  })
}
