"use server"

import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

export interface RequisitionItemInput {
  productVariantId: string
  qtyRequested: number
  preferredSupplierId?: number | null
  estUnitCost?: number
  reason?: string | null
}

export interface CreateRequisitionInput {
  storeId?: string | null
  neededBy?: string | null
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
  return prisma.purchase_requisitions.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      stores: { select: { store_id: true, name: true } },
      _count: { select: { purchase_requisition_items: true } },
    },
  })
}

export async function getRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const requisition = await prisma.purchase_requisitions.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: { select: { store_id: true, name: true } },
      purchase_requisition_items: {
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
      },
    },
  })
  if (!requisition) {
    throw new ApiError('Requisition not found.', 404)
  }
  return requisition
}

export async function createRequisition(
  authUserId: string,
  input: CreateRequisitionInput
) {
  const tenantId = await requireTenantId(authUserId)
  assertItems(input.items)

  return prisma.purchase_requisitions.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      store_id: input.storeId ?? null,
      needed_by: input.neededBy ? new Date(input.neededBy) : null,
      notes: input.notes ?? null,
      requested_by: authUserId,
      status: 'draft',
      purchase_requisition_items: {
        create: input.items.map((item) => ({
          product_variant_id: item.productVariantId,
          qty_requested: item.qtyRequested,
          preferred_supplier_id: item.preferredSupplierId ?? null,
          est_unit_cost: item.estUnitCost ?? 0,
          reason: item.reason ?? null,
        })),
      },
    },
    include: { purchase_requisition_items: true },
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
  await requireRequisitionStatus(tenantId, id, ['draft'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: { status: 'submitted' },
  })
}

export async function approveRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: {
      status: 'approved',
      approved_by: authUserId,
      approved_at: new Date(),
    },
  })
}

export async function rejectRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: { status: 'rejected' },
  })
}

export async function cancelRequisition(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireRequisitionStatus(tenantId, id, ['draft', 'submitted'])
  return prisma.purchase_requisitions.update({
    where: { id },
    data: { status: 'cancelled' },
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

  const { data, error } = await supabaseAdmin.rpc('convert_requisition_to_po', {
    p_requisition_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
