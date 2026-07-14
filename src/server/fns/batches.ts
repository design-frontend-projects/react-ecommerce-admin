'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export type BatchToggleStatus = 'active' | 'blocked'

export async function listBatches(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const batches = (await prisma.product_batches.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      product_variants: {
        select: {
          id: true,
          sku: true,
          products: { select: { name: true } },
        },
      },
      suppliers: { select: { supplier_id: true, name: true } },
    },
  })) as Array<Record<string, unknown> & { id: string }>

  const sums = (await prisma.stock_by_location.groupBy({
    by: ['batch_id'],
    where: { tenant_id: tenantId, batch_id: { not: null } },
    _sum: { qty_on_hand: true },
  })) as Array<{
    batch_id: string | null
    _sum: { qty_on_hand: unknown }
  }>

  const onHandByBatch = new Map<string, number>()
  for (const row of sums) {
    if (row.batch_id) {
      onHandByBatch.set(row.batch_id, Number(row._sum.qty_on_hand ?? 0))
    }
  }

  return batches.map((batch) => ({
    ...batch,
    qty_on_hand: onHandByBatch.get(batch.id) ?? 0,
  }))
}

export async function setBatchStatus(
  authUserId: string,
  id: string,
  status: BatchToggleStatus
) {
  const tenantId = await requireTenantId(authUserId)

  if (status !== 'active' && status !== 'blocked') {
    throw new ApiError('Status must be either active or blocked.', 400)
  }

  const existing = (await prisma.product_batches.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Batch not found.', 404)
  }

  const allowed =
    (existing.status === 'active' && status === 'blocked') ||
    (existing.status === 'blocked' && status === 'active')
  if (!allowed) {
    throw new ApiError(
      'Only active batches can be blocked, and blocked batches unblocked.',
      409
    )
  }

  return prisma.product_batches.update({
    where: { id },
    data: { status },
  })
}

export async function expireBatches(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const result = await prisma.product_batches.updateMany({
    where: {
      tenant_id: tenantId,
      status: 'active',
      expiry_date: { lt: new Date() },
    },
    data: { status: 'expired' },
  })

  return { expired: result.count }
}
