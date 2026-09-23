'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export type BatchToggleStatus = 'active' | 'blocked'
export type BatchStatus = 'active' | 'depleted' | 'expired' | 'blocked'

export interface CreateBatchInput {
  product_variant_id: string
  batch_number: string
  manufacture_date?: string | null
  expiry_date?: string | null
  unit_cost?: number
  supplier_id?: string | null
  received_reference_type?: string | null
  received_reference_id?: string | null
  notes?: string | null
  status?: 'active' | 'blocked'
}

export interface UpdateBatchInput {
  batch_number?: string
  manufacture_date?: string | null
  expiry_date?: string | null
  unit_cost?: number
  supplier_id?: string | null
  notes?: string | null
  status?: BatchStatus
}

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

  const [variants, supplierList, locationRows] = await Promise.all([
    variantIds.length
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            products: {
              select: {
                id: true,
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
            code: true,
          },
        })
      : [],
    prisma.stock_by_location.findMany({
      where: { tenant_id: tenantId, batch_id: { in: batchIds } },
      select: {
        batch_id: true,
        warehouse_id: true,
        warehouse_location_id: true,
        qty_on_hand: true,
        qty_reserved: true,
        condition: true,
        warehouses: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        warehouse_locations: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }),
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const supplierMap = new Map(supplierList.map((s) => [s.id, s]))

  // Aggregate on_hand, reserved, and location breakdown by batch_id
  const onHandByBatch = new Map<string, number>()
  const reservedByBatch = new Map<string, number>()
  const locationsByBatch = new Map<
    string,
    Array<{
      warehouse_id: string
      warehouse_name: string
      warehouse_code: string | null
      location_code: string
      aisle: string | null
      shelf: string | null
      condition: string
      qty_on_hand: number
      qty_reserved: number
    }>
  >()

  for (const row of locationRows || []) {
    if (!row.batch_id) continue

    const prevHand = onHandByBatch.get(row.batch_id) ?? 0
    onHandByBatch.set(row.batch_id, prevHand + Number(row.qty_on_hand ?? 0))

    const prevRes = reservedByBatch.get(row.batch_id) ?? 0
    reservedByBatch.set(row.batch_id, prevRes + Number(row.qty_reserved ?? 0))

    const list = locationsByBatch.get(row.batch_id) ?? []
    list.push({
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouses?.name ?? '—',
      warehouse_code: row.warehouses?.code ?? null,
      location_code: row.warehouse_locations?.code ?? '—',
      aisle: null,
      shelf: null,
      condition: row.condition,
      qty_on_hand: Number(row.qty_on_hand ?? 0),
      qty_reserved: Number(row.qty_reserved ?? 0),
    })
    locationsByBatch.set(row.batch_id, list)
  }

  const nowMs = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  return batches.map((batch) => {
    const unitCostNum = batch.unit_cost ? Number(batch.unit_cost.toString()) : 0
    const onHand = onHandByBatch.get(batch.id) ?? 0
    const reserved = reservedByBatch.get(batch.id) ?? 0
    const available = Math.max(0, onHand - reserved)
    const totalValue = Number((onHand * unitCostNum).toFixed(4))

    let daysUntilExpiry: number | null = null
    let expiryUrgency: 'expired' | 'critical' | 'warning' | 'healthy' | 'none' =
      'none'

    if (batch.expiry_date) {
      const expDate = new Date(batch.expiry_date)
      daysUntilExpiry = Math.ceil((expDate.getTime() - nowMs) / DAY_MS)

      if (daysUntilExpiry <= 0 || batch.status === 'expired') {
        expiryUrgency = 'expired'
      } else if (daysUntilExpiry <= 30) {
        expiryUrgency = 'critical'
      } else if (daysUntilExpiry <= 60) {
        expiryUrgency = 'warning'
      } else {
        expiryUrgency = 'healthy'
      }
    }

    return {
      id: batch.id,
      tenant_id: batch.tenant_id,
      product_variant_id: batch.product_variant_id,
      batch_number: batch.batch_number,
      manufacture_date: batch.manufacture_date
        ? batch.manufacture_date.toISOString().split('T')[0]
        : null,
      expiry_date: batch.expiry_date
        ? batch.expiry_date.toISOString().split('T')[0]
        : null,
      unit_cost: unitCostNum,
      status: batch.status,
      received_reference_type: batch.received_reference_type,
      received_reference_id: batch.received_reference_id,
      notes: batch.notes,
      created_at: batch.created_at.toISOString(),
      updated_at: batch.updated_at.toISOString(),
      supplier_id: batch.supplier_id,
      created_by_user_id: batch.created_by_user_id,
      updated_by_user_id: batch.updated_by_user_id,
      qty_on_hand: onHand,
      qty_reserved: reserved,
      qty_available: available,
      total_value: totalValue,
      days_until_expiry: daysUntilExpiry,
      expiry_urgency: expiryUrgency,
      product_variants: variantMap.get(batch.product_variant_id) ?? null,
      suppliers: batch.supplier_id
        ? supplierMap.get(batch.supplier_id) ?? null
        : null,
      locations: locationsByBatch.get(batch.id) ?? [],
    }
  })
}

export async function createBatch(
  authUserId: string,
  input: CreateBatchInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.product_variant_id) {
    throw new ApiError('Product variant is required.', 400)
  }
  if (!input.batch_number || !input.batch_number.trim()) {
    throw new ApiError('Batch number is required.', 400)
  }

  const existing = await prisma.product_batches.findFirst({
    where: {
      tenant_id: tenantId,
      batch_number: input.batch_number.trim(),
    },
  })
  if (existing) {
    throw new ApiError('A batch with this batch number already exists.', 409)
  }

  const variant = await prisma.product_variants.findFirst({
    where: { id: input.product_variant_id, tenant_id: tenantId },
  })
  if (!variant) {
    throw new ApiError('Product variant not found.', 404)
  }

  return prisma.product_batches.create({
    data: {
      tenant_id: tenantId,
      product_variant_id: input.product_variant_id,
      batch_number: input.batch_number.trim(),
      manufacture_date: input.manufacture_date
        ? new Date(input.manufacture_date)
        : null,
      expiry_date: input.expiry_date ? new Date(input.expiry_date) : null,
      unit_cost: input.unit_cost !== undefined ? Number(input.unit_cost) : 0,
      supplier_id: input.supplier_id || null,
      received_reference_type: input.received_reference_type || null,
      received_reference_id: input.received_reference_id || null,
      notes: input.notes || null,
      status: input.status || 'active',
      created_by_user_id: tenantUserId,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function updateBatch(
  authUserId: string,
  id: string,
  input: UpdateBatchInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.product_batches.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!existing) {
    throw new ApiError('Batch not found.', 404)
  }

  if (
    input.batch_number &&
    input.batch_number.trim() !== existing.batch_number
  ) {
    const duplicate = await prisma.product_batches.findFirst({
      where: {
        tenant_id: tenantId,
        batch_number: input.batch_number.trim(),
        id: { not: id },
      },
    })
    if (duplicate) {
      throw new ApiError('Another batch with this batch number already exists.', 409)
    }
  }

  const data: Record<string, unknown> = {
    updated_by_user_id: tenantUserId,
    updated_at: new Date(),
  }

  if (input.batch_number !== undefined) {
    data.batch_number = input.batch_number.trim()
  }
  if (input.manufacture_date !== undefined) {
    data.manufacture_date = input.manufacture_date
      ? new Date(input.manufacture_date)
      : null
  }
  if (input.expiry_date !== undefined) {
    data.expiry_date = input.expiry_date ? new Date(input.expiry_date) : null
  }
  if (input.unit_cost !== undefined) {
    data.unit_cost = Number(input.unit_cost)
  }
  if (input.supplier_id !== undefined) {
    data.supplier_id = input.supplier_id || null
  }
  if (input.notes !== undefined) {
    data.notes = input.notes || null
  }
  if (input.status !== undefined) {
    data.status = input.status
  }

  return prisma.product_batches.update({
    where: { id },
    data,
  })
}

export async function deleteBatch(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const existing = await prisma.product_batches.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stock_by_location: true,
    },
  })
  if (!existing) {
    throw new ApiError('Batch not found.', 404)
  }

  const hasStock = existing.stock_by_location.some(
    (loc) => Number(loc.qty_on_hand) > 0 || Number(loc.qty_reserved) > 0
  )
  if (hasStock) {
    throw new ApiError(
      'Cannot delete a batch with remaining stock on hand or reserved. Block the batch instead.',
      409
    )
  }

  await prisma.stock_by_location.deleteMany({
    where: { batch_id: id, tenant_id: tenantId },
  })

  return prisma.product_batches.delete({
    where: { id },
  })
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
      updated_at: new Date(),
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
      updated_at: new Date(),
    },
  })

  return { expired: result.count }
}
