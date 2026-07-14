'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface ReceiptItemInput {
  productVariantId: string
  qtyReceived: number
  unitCost?: number
  warehouseLocationId?: string
  batchNumber?: string
  expiryDate?: string
  serialNumbers?: string[]
}

export interface CreateReceiptInput {
  storeId: string
  purchaseOrderId?: number | null
  supplierId?: number | null
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
    include: {
      stores: { select: { store_id: true, name: true } },
      suppliers: { select: { supplier_id: true, name: true } },
      _count: { select: { goods_receipt_items: true } },
    },
  })
}

export async function getReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const receipt = await prisma.goods_receipts.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: { select: { store_id: true, name: true } },
      suppliers: { select: { supplier_id: true, name: true } },
      goods_receipt_items: {
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              products: { select: { name: true } },
            },
          },
          warehouse_locations: { select: { id: true, path: true } },
        },
      },
    },
  })
  if (!receipt) {
    throw new ApiError('Goods receipt not found.', 404)
  }
  return receipt
}

export async function createReceipt(
  authUserId: string,
  input: CreateReceiptInput
) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.storeId) {
    throw new ApiError('A store is required.', 400)
  }
  assertItems(input.items)

  return prisma.goods_receipts.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      store_id: input.storeId,
      purchase_order_id: input.purchaseOrderId ?? null,
      supplier_id: input.supplierId ?? null,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft',
      goods_receipt_items: {
        create: input.items.map((item) => ({
          product_variant_id: item.productVariantId,
          qty_received: item.qtyReceived,
          unit_cost: item.unitCost ?? 0,
          warehouse_location_id: item.warehouseLocationId ?? null,
          batch_number: item.batchNumber ?? null,
          expiry_date: item.expiryDate ? new Date(item.expiryDate) : null,
          serial_numbers: item.serialNumbers ?? undefined,
        })),
      },
    },
    include: { goods_receipt_items: true },
  })
}

export async function cancelReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
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
    data: { status: 'cancelled' },
  })
}

export async function postReceipt(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
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
    throw rpcError(error)
  }
  return data
}
