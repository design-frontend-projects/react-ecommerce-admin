'use server'

import type { stock_count_status_enum } from '@/generated/prisma/client'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateCountInput {
  warehouseId?: string | null
  storeId?: string | null
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
  })
}

export async function getCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const count = await prisma.stock_counts.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!count) {
    throw new ApiError('Stock count not found.', 404)
  }
  const items = await prisma.stock_count_items.findMany({
    where: { stock_count_id: id },
  })
  return {
    ...count,
    stock_count_items: items,
  }
}

export async function createCount(authUserId: string, input: CreateCountInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const whId = input.warehouseId || input.storeId
  if (!whId) {
    throw new ApiError('A warehouse or store is required.', 400)
  }

  return prisma.stock_counts.create({
    data: {
      tenant_id: tenantId,
      warehouse_id: input.warehouseId ?? null,
      store_id: input.storeId ?? null,
      warehouse_location_id: input.warehouseLocationId ?? null,
      category_id: input.categoryId ?? null,
      is_blind: input.isBlind ?? false,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft' as stock_count_status_enum,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
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
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('snapshot_stock_count', {
    p_count_id: id,
  })
  if (error) {
    console.warn('RPC snapshot_stock_count warning:', error.message)
  }

  // Update status to counting in prisma
  await prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'counting' as stock_count_status_enum,
      snapshot_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })

  return data ?? { success: true }
}

export async function saveCounts(
  authUserId: string,
  id: string,
  entries: CountEntryInput[]
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
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
        updated_by_user_id: tenantUserId,
      },
    })
  }
  return { count_id: id, entries_saved: entries.length }
}

export async function reviewCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('review_stock_count', {
    p_count_id: id,
  })
  if (error) {
    console.warn('RPC review_stock_count warning:', error.message)
  }

  await prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'review' as stock_count_status_enum,
      reviewed_by: authUserId,
      updated_by_user_id: tenantUserId,
    },
  })

  return data ?? { success: true }
}

export async function postCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireCount(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('post_stock_count', {
    p_count_id: id,
  })
  if (error) {
    console.warn('RPC post_stock_count warning:', error.message)
  }

  await prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'posted' as stock_count_status_enum,
      posted_by: authUserId,
      posted_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })

  return data ?? { success: true }
}

export async function cancelCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await requireCount(tenantId, id)
  if (!['draft', 'counting', 'review'].includes(existing.status)) {
    throw new ApiError(
      `A ${existing.status} stock count cannot be cancelled.`,
      409
    )
  }
  return prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'cancelled' as stock_count_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}
