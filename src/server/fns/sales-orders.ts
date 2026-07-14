'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export interface OrderItemInput {
  productVariantId: string
  qtyOrdered: number
  unitPrice: number
  discountAmount?: number
  taxAmount?: number
}

export interface CreateOrderInput {
  storeId: string
  customerId?: number | null
  expectedDate?: string | null
  notes?: string | null
  items: OrderItemInput[]
}

export type OrderStepStatus = 'picking' | 'packed' | 'completed'

function assertItems(items: OrderItemInput[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError('A sales order must contain at least one item.', 400)
  }
  for (const item of items) {
    if (!item.productVariantId) {
      throw new ApiError('Each item requires a product variant.', 400)
    }
    if (
      typeof item.qtyOrdered !== 'number' ||
      Number.isNaN(item.qtyOrdered) ||
      item.qtyOrdered <= 0
    ) {
      throw new ApiError('Each item requires an ordered quantity > 0.', 400)
    }
    if (
      typeof item.unitPrice !== 'number' ||
      Number.isNaN(item.unitPrice) ||
      item.unitPrice < 0
    ) {
      throw new ApiError('Each item requires a unit price >= 0.', 400)
    }
  }
}

export async function listOrders(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.sales_orders.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    include: {
      stores: { select: { store_id: true, name: true } },
      customers: {
        select: { customer_id: true, first_name: true, last_name: true },
      },
      _count: { select: { sales_order_items: true } },
    },
  })
}

export async function getOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const order = await prisma.sales_orders.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      stores: { select: { store_id: true, name: true } },
      customers: {
        select: { customer_id: true, first_name: true, last_name: true },
      },
      sales_order_items: {
        include: {
          product_variants: {
            select: {
              id: true,
              sku: true,
              products: { select: { name: true } },
            },
          },
        },
      },
    },
  })
  if (!order) {
    throw new ApiError('Sales order not found.', 404)
  }
  return order
}

export async function createOrder(authUserId: string, input: CreateOrderInput) {
  const tenantId = await requireTenantId(authUserId)

  if (!input.storeId) {
    throw new ApiError('A store is required.', 400)
  }
  assertItems(input.items)

  const lines = input.items.map((item, index) => {
    const discount = item.discountAmount ?? 0
    const tax = item.taxAmount ?? 0
    return {
      product_variant_id: item.productVariantId,
      line_no: index + 1,
      qty_ordered: item.qtyOrdered,
      unit_price: item.unitPrice,
      discount_amount: discount,
      tax_amount: tax,
      line_total: item.qtyOrdered * item.unitPrice - discount + tax,
    }
  })
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty_ordered * line.unit_price,
    0
  )
  const discountAmount = lines.reduce(
    (sum, line) => sum + line.discount_amount,
    0
  )
  const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0)

  return prisma.sales_orders.create({
    data: {
      tenant_id: tenantId,
      auth_user_id: tenantId,
      store_id: input.storeId,
      customer_id: input.customerId ?? null,
      expected_date: input.expectedDate ? new Date(input.expectedDate) : null,
      notes: input.notes ?? null,
      created_by: authUserId,
      status: 'draft',
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: subtotal - discountAmount + taxAmount,
      sales_order_items: { create: lines },
    },
    include: { sales_order_items: true },
  })
}

async function requireOrder(tenantId: string, id: string): Promise<void> {
  const existing = (await prisma.sales_orders.findFirst({
    where: { id, tenant_id: tenantId },
    select: { id: true },
  })) as { id: string } | null
  if (!existing) {
    throw new ApiError('Sales order not found.', 404)
  }
}

export async function confirmOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireOrder(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('confirm_sales_order', {
    p_order_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function setOrderStatus(
  authUserId: string,
  id: string,
  status: OrderStepStatus
) {
  const tenantId = await requireTenantId(authUserId)
  await requireOrder(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('set_sales_order_status', {
    p_order_id: id,
    p_status: status,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function fulfillOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireOrder(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('fulfill_sales_order', {
    p_order_id: id,
    p_lines: null,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function invoiceOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireOrder(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('invoice_sales_order', {
    p_order_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function cancelOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  await requireOrder(tenantId, id)

  const { data, error } = await supabaseAdmin.rpc('cancel_sales_order', {
    p_order_id: id,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
