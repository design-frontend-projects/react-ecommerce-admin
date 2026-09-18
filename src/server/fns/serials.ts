'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export const SERIAL_STATUSES = [
  'in_stock',
  'reserved',
  'sold',
  'returned',
  'damaged',
  'in_transit',
  'written_off',
] as const

export type SerialStatus = (typeof SERIAL_STATUSES)[number]

export interface SerialFilters {
  search?: string
  status?: SerialStatus
}

export async function listSerials(
  authUserId: string,
  filters: SerialFilters = {}
) {
  const tenantId = await requireTenantId(authUserId)

  if (filters.status && !SERIAL_STATUSES.includes(filters.status)) {
    throw new ApiError('Unknown serial status filter.', 400)
  }

  const serials = await prisma.product_serials.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.search
        ? {
            serial_number: { contains: filters.search, mode: 'insensitive' },
          }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { created_at: 'desc' },
    take: 500,
  })

  if (!serials.length) {
    return []
  }

  const variantIds = Array.from(
    new Set(serials.map((s) => s.product_variant_id).filter(Boolean))
  )
  const storeIds = Array.from(
    new Set(
      serials
        .map((s) => s.store_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )
  const batchIds = Array.from(
    new Set(
      serials
        .map((s) => s.batch_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const [variants, storeList, batches] = await Promise.all([
    variantIds.length
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            barcode: true,
            products: {
              select: {
                name: true,
              },
            },
          },
        })
      : [],
    storeIds.length
      ? prisma.stores.findMany({
          where: { store_id: { in: storeIds } },
          select: {
            store_id: true,
            name: true,
          },
        })
      : [],
    batchIds.length
      ? prisma.product_batches.findMany({
          where: { id: { in: batchIds } },
          select: {
            id: true,
            batch_number: true,
          },
        })
      : [],
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const storeMap = new Map(storeList.map((s) => [s.store_id, s]))
  const batchMap = new Map(batches.map((b) => [b.id, b]))

  return serials.map((s) => ({
    ...s,
    unit_cost: s.unit_cost ? Number(s.unit_cost.toString()) : 0,
    product_variants: variantMap.get(s.product_variant_id) ?? null,
    stores: s.store_id ? storeMap.get(s.store_id) ?? null : null,
    product_batches: s.batch_id ? batchMap.get(s.batch_id) ?? null : null,
  }))
}


export async function getSerialTrail(authUserId: string, serialId: string) {
  const tenantId = await requireTenantId(authUserId)

  const serial = (await prisma.product_serials.findFirst({
    where: { id: serialId, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!serial) {
    throw new ApiError('Serial not found.', 404)
  }

  const entries = await prisma.inventory_movement_serials.findMany({
    where: { serial_id: serialId },
  })

  if (!entries.length) {
    return []
  }

  const movementIds = entries.map((e) => e.movement_id)
  const movements = await prisma.inventory_movements.findMany({
    where: { id: { in: movementIds } },
  })
  const movementMap = new Map(movements.map((m) => [m.id, m]))

  return entries
    .map((entry) => {
      const m = movementMap.get(entry.movement_id)
      if (!m) return null
      const delta = m.quantity_delta != null ? Number(m.quantity_delta) : 0
      return {
        id: entry.id,
        inventory_movements: {
          id: m.id,
          movement_type: m.movement_type,
          movement_date:
            m.movement_date instanceof Date
              ? m.movement_date.toISOString()
              : String(m.movement_date),
          qty_in: delta > 0 ? delta : 0,
          qty_out: delta < 0 ? Math.abs(delta) : 0,
          reference_type: m.reference_type,
          reference_id: m.reference_id,
          remarks: m.remarks,
        },
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
}
