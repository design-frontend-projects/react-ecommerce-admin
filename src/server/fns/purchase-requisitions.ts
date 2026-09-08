'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

export interface RequisitionItemInput {
  productVariantId: string
  qtyRequested: number
  uomId?: string | null
  preferredSupplierId?: string | null
  estUnitCost?: number
  reason?: string | null
}

export interface CreateRequisitionInput {
  storeId?: string | null
  neededBy?: string | null
  currency?: string | null
  notes?: string | null
  items: RequisitionItemInput[]
}

export interface UpdateRequisitionInput {
  storeId?: string | null
  neededBy?: string | null
  currency?: string | null
  notes?: string | null
  items: RequisitionItemInput[]
}

function assertItems(items: RequisitionItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A requisition must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (
      typeof item.qtyRequested !== 'number' ||
      Number.isNaN(item.qtyRequested) ||
      item.qtyRequested <= 0
    ) {
      throw new ApiError('Each item requires a requested quantity > 0.', 400)
    }
  }
}

export async function listRequisitions(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const list = await prisma.purchase_requisitions.findMany({
    where: { tenant_id: tenantId },
    include: {
      stores: {
        select: {
          store_id: true,
          name: true,
        },
      },
      _count: {
        select: {
          purchase_requisition_items: true,
        },
      },
      purchase_requisition_items: {
        select: {
          qty_requested: true,
          est_unit_cost: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  return list.map((item) => {
    const totalAmount = (item.purchase_requisition_items || []).reduce(
      (sum, line) =>
        sum + Number(line.qty_requested) * Number(line.est_unit_cost || 0),
      0
    )
    const { purchase_requisition_items, ...rest } = item
    return {
      ...rest,
      total_amount: totalAmount,
    }
  })
}

export async function getRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const requisition = await prisma.purchase_requisitions.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: {
        select: {
          store_id: true,
          name: true,
        },
      },
      branches: {
        select: {
          id: true,
          name: true,
        },
      },
      purchase_requisition_items: {
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              product_id: true,
              dimensions: true,
              products: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          suppliers: {
            select: {
              id: true,
              name: true,
            },
          },
          uoms: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  })

  if (!requisition) {
    throw new ApiError('Requisition not found.', 404)
  }

  const totalAmount = (requisition.purchase_requisition_items || []).reduce(
    (sum, line) =>
      sum + Number(line.qty_requested) * Number(line.est_unit_cost || 0),
    0
  )

  return {
    ...requisition,
    total_amount: totalAmount,
  }
}

export async function createRequisition(
  authUserId: string,
  input: CreateRequisitionInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  assertItems(input.items)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.purchase_requisitions.create({
      data: {
        tenant_id: tenantId,
        store_id: input.storeId ?? null,
        currency: input.currency
          ? input.currency.slice(0, 3).toUpperCase()
          : 'USD',
        needed_by: input.neededBy ? new Date(input.neededBy) : null,
        notes: input.notes ?? null,
        requested_by: authUserId,
        status: 'draft',
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (input.items.length > 0) {
      await tx.purchase_requisition_items.createMany({
        data: input.items.map((item) => ({
          requisition_id: created.id,
          product_variant_id: item.productVariantId,
          qty_requested: item.qtyRequested,
          uom_id: item.uomId ?? null,
          preferred_supplier_id: item.preferredSupplierId ?? null,
          est_unit_cost: item.estUnitCost ?? 0,
          reason: item.reason ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.purchase_requisition_items.findMany({
      where: { requisition_id: created.id },
    })

    return {
      ...created,
      purchase_requisition_items: items,
    }
  })
}

export async function updateRequisition(
  authUserId: string,
  id: string,
  input: UpdateRequisitionInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['draft'])
  assertItems(input.items)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.purchase_requisitions.update({
      where: { id },
      data: {
        store_id: input.storeId ?? null,
        currency: input.currency
          ? input.currency.slice(0, 3).toUpperCase()
          : 'USD',
        needed_by: input.neededBy ? new Date(input.neededBy) : null,
        notes: input.notes ?? null,
        updated_by_user_id: tenantUserId,
      },
    })

    // Replace items
    await tx.purchase_requisition_items.deleteMany({
      where: { requisition_id: id },
    })

    if (input.items.length > 0) {
      await tx.purchase_requisition_items.createMany({
        data: input.items.map((item) => ({
          requisition_id: id,
          product_variant_id: item.productVariantId,
          qty_requested: item.qtyRequested,
          uom_id: item.uomId ?? null,
          preferred_supplier_id: item.preferredSupplierId ?? null,
          est_unit_cost: item.estUnitCost ?? 0,
          reason: item.reason ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.purchase_requisition_items.findMany({
      where: { requisition_id: id },
    })

    return {
      ...updated,
      purchase_requisition_items: items,
    }
  })
}

export async function deleteRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['draft', 'cancelled'])

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.purchase_requisition_items.deleteMany({
      where: { requisition_id: id },
    })
    return tx.purchase_requisitions.delete({
      where: { id },
    })
  })
}

async function requireRequisitionStatus(
  tenantId: string,
  id: string,
  allowed: string[]
): Promise<string> {
  const existing = (await prisma.purchase_requisitions.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Requisition not found.', 404)
  }
  if (!allowed.includes(existing.status)) {
    throw new ApiError(
      `A ${existing.status} requisition cannot perform this action.`,
      409
    )
  }
  return existing.status
}

export async function submitRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['draft'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: {
      status: 'submitted',
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function approveRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: {
      status: 'approved',
      approved_by: authUserId,
      approved_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function rejectRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: {
      status: 'rejected',
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function cancelRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['draft', 'submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: {
      status: 'cancelled',
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function convertRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.purchase_requisitions.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Requisition not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc(
    'convert_requisition_to_po',
    {
      p_requisition_id: id,
    }
  )
  if (error) {
    throw rpcError(error)
  }
  return data
}
