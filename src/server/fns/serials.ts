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

  const entries = await prisma.inventory_movement_serials.findMany({
    where: { serial_id: serialId },
  })

  return entries
}
