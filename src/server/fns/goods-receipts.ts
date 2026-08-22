'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type { receipt_status_enum, stock_condition_enum } from '@/generated/prisma/client'

export interface ReceiptItemInput {
  productVariantId: string
  qtyReceived: number
  acceptedQty?: number
  rejectedQty?: number
  rejectionReason?: string | null
  condition?: string
  unitCost?: number
  warehouseLocationId?: string | null
  batchNumber?: string | null
  batchId?: string | null
  serialId?: string | null
  expiryDate?: string | null
  serialNumbers?: string[]
}

export interface CreateReceiptInput {
  warehouseId?: string | null
  storeId?: string | null
  purchaseOrderId?: string | null
  supplierId?: string | null
  notes?: string | null
  items: ReceiptItemInput[]
}

function assertItems(items: ReceiptItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A goods receipt must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (
      typeof item.qtyReceived !== 'number' ||
      Number.isNaN(item.qtyReceived) ||
      item.qtyReceived <= 0
    ) {
      throw new ApiError('Each item requires a received quantity > 0.', 400)
    }
    if (
      item.unitCost !== undefined &&
      (typeof item.unitCost !== 'number' ||
        Number.isNaN(item.unitCost) ||
        item.unitCost < 0)
    ) {
      throw new ApiError('Unit cost cannot be negative.', 400)
    }
  }
}

export async function listReceipts(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.goods_receipts.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })
}

export async function getReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const receipt = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!receipt) {
    throw new ApiError('Goods receipt not found.', 404)
  }
  const items = await prisma.goods_receipt_items.findMany({
    where: { goods_receipt_id: id },
  })
  return {
    ...receipt,
    goods_receipt_items: items,
  }
}

export async function createReceipt(
  authUserId: string,
  input: CreateReceiptInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const whId = input.warehouseId || input.storeId
  if (!whId) {
    throw new ApiError('A warehouse or store is required.', 400)
  }
  assertItems(input.items)

  return prisma.$transaction(async (tx: any) => {
    const created = await tx.goods_receipts.create({
      data: {
        tenant_id: tenantId,
        warehouse_id: input.warehouseId ?? null,
        store_id: input.storeId ?? null,
        purchase_order_id: input.purchaseOrderId ?? null,
        supplier_id: input.supplierId ?? null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft' as receipt_status_enum,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (input.items.length > 0) {
      await tx.goods_receipt_items.createMany({
        data: input.items.map((item) => ({
          goods_receipt_id: created.id,
          product_variant_id: item.productVariantId,
          qty_received: item.qtyReceived,
          accepted_qty: item.acceptedQty ?? item.qtyReceived,
          rejected_qty: item.rejectedQty ?? 0,
          rejection_reason: item.rejectionReason ?? null,
          condition: (item.condition ?? 'good') as stock_condition_enum,
          unit_cost: item.unitCost ?? 0,
          warehouse_location_id: item.warehouseLocationId ?? null,
          batch_number: item.batchNumber ?? null,
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          expiry_date: item.expiryDate ? new Date(item.expiryDate) : null,
          serial_numbers: item.serialNumbers ?? undefined,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    const items = await tx.goods_receipt_items.findMany({
      where: { goods_receipt_id: created.id },
    })

    return {
      ...created,
      goods_receipt_items: items,
    }
  })
}

export async function cancelReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError('Only a draft goods receipt can be cancelled.', 409)
  }
  return prisma.goods_receipts.update({
    where: { id },
    data: {
      status: 'cancelled' as receipt_status_enum,
      updated_by_user_id: tenantUserId,
    },
  })
}

export async function postReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = (await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Goods receipt not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc('post_goods_receipt', {
    p_receipt_id: id,
  })
  if (error) {
    console.warn('RPC post_goods_receipt warning:', error.message)
  }

  return prisma.goods_receipts.update({
    where: { id },
    data: {
      status: 'posted' as receipt_status_enum,
      posted_by: authUserId,
      posted_at: new Date(),
      updated_by_user_id: tenantUserId,
    },
  })
}

