'use server'

import type {
  stock_count_status_enum,
  adjustment_type_enum,
  adjustment_reason_enum,
} from '@/generated/prisma/client'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface CreateCountInput {
  warehouseId?: string | null
  storeId?: string | null
  warehouseLocationId?: string | null
  categoryId?: string | null
  variantIds?: string[] | null
  scopeType?: 'full' | 'category' | 'variants'
  isBlind?: boolean
  notes?: string | null
}

export interface CountEntryInput {
  itemId: string
  qtyCounted: number
}

export async function listCounts(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const counts = await prisma.stock_counts.findMany({
    where: { tenant_id: tenantId },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
      categories: { select: { id: true, name: true, name_ar: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  const countIds = counts.map((c) => c.id)
  let itemCountsMap = new Map<string, number>()
  if (countIds.length > 0) {
    const itemCounts = await prisma.stock_count_items.groupBy({
      by: ['stock_count_id'],
      where: { stock_count_id: { in: countIds } },
      _count: { id: true },
    })
    itemCountsMap = new Map(
      itemCounts.map((ic) => [ic.stock_count_id, ic._count.id])
    )
  }

  return counts.map((c) => ({
    ...c,
    _count: { stock_count_items: itemCountsMap.get(c.id) ?? 0 },
  }))
}

export async function getCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const count = await prisma.stock_counts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      warehouses: { select: { id: true, name: true, code: true } },
      categories: { select: { id: true, name: true, name_ar: true } },
    },
  })
  if (!count) {
    throw new ApiError('Stock count not found.', 404)
  }

  const items = await prisma.stock_count_items.findMany({
    where: { stock_count_id: id },
    orderBy: { created_at: 'asc' },
  })

  const variantIds = Array.from(
    new Set(items.map((it) => it.product_variant_id))
  )
  const locationIds = Array.from(
    new Set(
      items
        .map((it) => it.warehouse_location_id)
        .filter(Boolean) as string[]
    )
  )

  const [variants, locations] = await Promise.all([
    variantIds.length > 0
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            name: true,
            barcode: true,
            products: {
              select: {
                id: true,
                name: true,
                category_id: true,
              },
            },
          },
        })
      : [],
    locationIds.length > 0
      ? prisma.warehouse_locations.findMany({
          where: { id: { in: locationIds } },
          select: {
            id: true,
            code: true,
            name: true,
            path: true,
          },
        })
      : [],
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const locationMap = new Map(locations.map((l) => [l.id, l]))

  const enrichedItems = items.map((it) => ({
    ...it,
    product_variants: variantMap.get(it.product_variant_id) ?? null,
    warehouse_locations: it.warehouse_location_id
      ? locationMap.get(it.warehouse_location_id) ?? null
      : null,
  }))

  return {
    ...count,
    stock_count_items: enrichedItems,
  }
}

export async function createCount(
  authUserId: string,
  input: CreateCountInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const whId = input.warehouseId || input.storeId
  if (!whId) {
    throw new ApiError('A warehouse or store is required.', 400)
  }

  const newCount = await prisma.stock_counts.create({
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

  // If specific variantIds were targeted, create draft stock_count_items for them
  if (Array.isArray(input.variantIds) && input.variantIds.length > 0) {
    const itemsData = input.variantIds.map((vId) => ({
      tenant_id: tenantId,
      stock_count_id: newCount.id,
      product_variant_id: vId,
      warehouse_location_id: input.warehouseLocationId ?? null,
      qty_snapshot: 0,
      unit_cost: 0,
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    }))

    await prisma.stock_count_items.createMany({
      data: itemsData,
    })
  }

  return newCount
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
  const existing = await requireCount(tenantId, id)
  if (existing.status !== 'draft') {
    throw new ApiError(`Cannot start count in status ${existing.status}`, 400)
  }

  const countRecord = await prisma.stock_counts.findUnique({ where: { id } })
  if (!countRecord) throw new ApiError('Stock count not found.', 404)

  // Try RPC first
  let rpcSuccess = false
  try {
    const { error } = await supabaseAdmin.rpc('snapshot_stock_count', {
      p_count_id: id,
    })
    if (!error) {
      rpcSuccess = true
    }
  } catch {
    // fallback to Prisma engine below
  }

  if (!rpcSuccess) {
    // Check if stock_count_items already pre-created (e.g. targeted variantIds)
    const existingItems = await prisma.stock_count_items.findMany({
      where: { stock_count_id: id },
    })

    if (existingItems.length > 0) {
      // Refresh quantities from stock_balances
      const vIds = existingItems.map((i) => i.product_variant_id)
      const balances = await prisma.stock_balances.findMany({
        where: {
          tenant_id: tenantId,
          product_variant_id: { in: vIds },
          OR: [
            ...(countRecord.warehouse_id
              ? [{ warehouse_id: countRecord.warehouse_id }]
              : []),
            ...(countRecord.store_id
              ? [{ store_id: countRecord.store_id }]
              : []),
          ],
        },
      })
      const balanceMap = new Map(
        balances.map((b) => [b.product_variant_id, b])
      )

      for (const item of existingItems) {
        const bal = balanceMap.get(item.product_variant_id)
        await prisma.stock_count_items.update({
          where: { id: item.id },
          data: {
            qty_snapshot: bal?.qty_on_hand ?? 0,
            unit_cost: bal?.avg_cost ?? 0,
            updated_by_user_id: tenantUserId,
          },
        })
      }
    } else {
      // Find all stock_balances matching the facility and optional category
      const balances = await prisma.stock_balances.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            ...(countRecord.warehouse_id
              ? [{ warehouse_id: countRecord.warehouse_id }]
              : []),
            ...(countRecord.store_id
              ? [{ store_id: countRecord.store_id }]
              : []),
          ],
          ...(countRecord.warehouse_location_id
            ? { location_id: countRecord.warehouse_location_id }
            : {}),
          ...(countRecord.category_id
            ? {
                product_variants: {
                  products: {
                    category_id: countRecord.category_id,
                  },
                },
              }
            : {}),
        },
        select: {
          product_variant_id: true,
          location_id: true,
          batch_id: true,
          qty_on_hand: true,
          avg_cost: true,
        },
      })

      if (balances.length > 0) {
        await prisma.stock_count_items.createMany({
          data: balances.map((b) => ({
            tenant_id: tenantId,
            stock_count_id: id,
            product_variant_id: b.product_variant_id,
            warehouse_location_id:
              b.location_id ?? countRecord.warehouse_location_id ?? null,
            batch_id: b.batch_id ?? null,
            qty_snapshot: b.qty_on_hand ?? 0,
            unit_cost: b.avg_cost ?? 0,
            created_by_user_id: tenantUserId,
            updated_by_user_id: tenantUserId,
          })),
        })
      } else {
        // Fallback: populate variants matching category or facility
        const variants = await prisma.product_variants.findMany({
          where: {
            tenant_id: tenantId,
            is_active: true,
            ...(countRecord.category_id
              ? {
                  products: {
                    category_id: countRecord.category_id,
                  },
                }
              : {}),
          },
          take: 100,
        })

        if (variants.length > 0) {
          await prisma.stock_count_items.createMany({
            data: variants.map((v) => ({
              tenant_id: tenantId,
              stock_count_id: id,
              product_variant_id: v.id,
              warehouse_location_id: countRecord.warehouse_location_id ?? null,
              qty_snapshot: 0,
              unit_cost: 0,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            })),
          })
        }
      }
    }
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

  return { count_id: id, status: 'counting' }
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

  // Compute variance for every item: (qty_counted ?? 0) - qty_snapshot
  const items = await prisma.stock_count_items.findMany({
    where: { stock_count_id: id },
  })

  for (const item of items) {
    const counted =
      item.qty_counted !== null ? Number(item.qty_counted) : 0
    const snapshot = Number(item.qty_snapshot || 0)
    const variance = counted - snapshot
    await prisma.stock_count_items.update({
      where: { id: item.id },
      data: {
        variance,
        updated_by_user_id: tenantUserId,
      },
    })
  }

  await prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'review' as stock_count_status_enum,
      reviewed_by: authUserId,
      updated_by_user_id: tenantUserId,
    },
  })

  return { success: true, count_id: id, status: 'review' }
}

export async function postCount(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await requireCount(tenantId, id)
  if (existing.status !== 'review') {
    throw new ApiError(
      'Only stock counts in review status can be posted.',
      400
    )
  }

  const countRecord = await prisma.stock_counts.findUnique({ where: { id } })
  if (!countRecord) throw new ApiError('Stock count not found.', 404)

  const items = await prisma.stock_count_items.findMany({
    where: { stock_count_id: id },
  })

  const varianceItems = items.filter(
    (it) => Number(it.variance || 0) !== 0
  )

  let adjustmentId: string | null = null
  if (varianceItems.length > 0) {
    const adj = await prisma.stock_adjustments.create({
      data: {
        tenant_id: tenantId,
        warehouse_id: countRecord.warehouse_id ?? null,
        store_id: countRecord.store_id ?? null,
        type: 'stocktake' as adjustment_type_enum,
        reason: 'stocktake_discrepancy' as adjustment_reason_enum,
        status: 'approved',
        notes: `Auto-generated from Stock Count ${countRecord.count_number}`,
        created_by: authUserId,
        approved_by: authUserId,
        approved_at: new Date(),
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })
    adjustmentId = adj.id

    for (const vItem of varianceItems) {
      await prisma.stock_adjustment_items.create({
        data: {
          stock_adjustment_id: adj.id,
          product_variant_id: vItem.product_variant_id,
          location_id: vItem.warehouse_location_id,
          qty_before: vItem.qty_snapshot,
          qty_after: vItem.qty_counted ?? 0,
          qty_adjusted: vItem.variance ?? 0,
          unit_cost: vItem.unit_cost,
          reason: 'stocktake_discrepancy' as adjustment_reason_enum,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      // Update active stock balances
      const existingBal = await prisma.stock_balances.findFirst({
        where: {
          tenant_id: tenantId,
          product_variant_id: vItem.product_variant_id,
          OR: [
            ...(countRecord.warehouse_id
              ? [{ warehouse_id: countRecord.warehouse_id }]
              : []),
            ...(countRecord.store_id
              ? [{ store_id: countRecord.store_id }]
              : []),
          ],
        },
      })
      if (existingBal) {
        await prisma.stock_balances.update({
          where: { id: existingBal.id },
          data: {
            qty_on_hand: vItem.qty_counted ?? 0,
            last_movement_at: new Date(),
            updated_by_user_id: tenantUserId,
          },
        })
      }
    }
  }

  await prisma.stock_counts.update({
    where: { id },
    data: {
      status: 'posted' as stock_count_status_enum,
      posted_by: authUserId,
      posted_at: new Date(),
      posted_adjustment_id: adjustmentId,
      updated_by_user_id: tenantUserId,
    },
  })

  return {
    success: true,
    count_id: id,
    status: 'posted',
    adjustment_id: adjustmentId,
  }
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
