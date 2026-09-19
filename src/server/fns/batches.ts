'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export type BatchToggleStatus = 'active' | 'blocked'

export async function listBatches(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)

  const batches = await prisma.product_batches.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })

  if (!batches.length) {
    return []
  }

  const variantIds = Array.from(
    new Set(batches.map((b) => b.product_variant_id).filter(Boolean))
  )
  const supplierIds = Array.from(
    new Set(
      batches
        .map((b) => b.supplier_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )
  const batchIds = batches.map((b) => b.id)

  const [variants, supplierList, sums] = await Promise.all([
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
    supplierIds.length
      ? prisma.suppliers.findMany({
          where: { id: { in: supplierIds } },
          select: {
            id: true,
            name: true,
          },
        })
      : [],
    prisma.stock_by_location.groupBy({
      by: ['batch_id'],
      where: { tenant_id: tenantId, batch_id: { in: batchIds } },
      _sum: { qty_on_hand: true },
    }),
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const supplierMap = new Map(supplierList.map((s) => [s.id, s]))

  const onHandByBatch = new Map<string, number>()
  for (const row of sums || []) {
    if (row.batch_id) {
      onHandByBatch.set(row.batch_id, Number(row._sum.qty_on_hand ?? 0))
    }
  }

  return batches.map((batch) => ({
    ...batch,
    unit_cost: batch.unit_cost ? Number(batch.unit_cost.toString()) : 0,
    qty_on_hand: onHandByBatch.get(batch.id) ?? 0,
    product_variants: variantMap.get(batch.product_variant_id) ?? null,
    suppliers: batch.supplier_id ? supplierMap.get(batch.supplier_id) ?? null : null,
  }))
}


export async function setBatchStatus(
  authUserId: string,
  id: string,
  status: BatchToggleStatus
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

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
    data: {
      status,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function expireBatches(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const result = await prisma.product_batches.updateMany({
    where: {
      tenant_id: tenantId,
      status: 'active',
      expiry_date: { lt: new Date() },
    },
    data: {
      status: 'expired',
      updated_by_user_id: tenantUserId,
    },
  })

  return { expired: result.count }
}
