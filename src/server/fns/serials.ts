"use server"

import prisma from '@/lib/prisma'
import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

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

  return prisma.product_serials.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.search
        ? {
            serial_number: { contains: filters.search, mode: 'insensitive' },
          }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      product_variants: {
        select: {
          id: true,
          sku: true,
          products: { select: { name: true } },
        },
      },
      stores: { select: { store_id: true, name: true } },
      product_batches: { select: { id: true, batch_number: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 500,
  })
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

  const entries = (await prisma.inventory_movement_serials.findMany({
    where: { serial_id: serialId },
    include: {
      inventory_movements: {
        select: {
          id: true,
          movement_type: true,
          movement_date: true,
          qty_in: true,
          qty_out: true,
          reference_type: true,
          reference_id: true,
          remarks: true,
        },
      },
    },
  })) as Array<{
    inventory_movements: { movement_date: Date }
  }>

  return [...entries].sort(
    (a, b) =>
      new Date(a.inventory_movements.movement_date).getTime() -
      new Date(b.inventory_movements.movement_date).getTime()
  )
}
