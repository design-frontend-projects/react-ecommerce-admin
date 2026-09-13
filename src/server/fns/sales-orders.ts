'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

export interface OrderItemInput {
  productVariantId: string
  qtyOrdered: number
  unitPrice: number
  discountAmount?: number
  taxAmount?: number
  uomId?: string | null
}

export interface CreateOrderInput {
  storeId: string
  warehouseId?: string | null
  customerId?: string | null
  channelId?: string | null
  currency?: string | null
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
  const orders = await prisma.sales_orders.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
  })
  if (orders.length === 0) return []

  const customerIds = Array.from(
    new Set(orders.map((o) => o.customer_id).filter(Boolean) as string[])
  )
  const storeIds = Array.from(
    new Set(orders.map((o) => o.store_id).filter(Boolean) as string[])
  )
  const warehouseIds = Array.from(
    new Set(orders.map((o) => o.warehouse_id).filter(Boolean) as string[])
  )
  const channelIds = Array.from(
    new Set(orders.map((o) => o.channel_id).filter(Boolean) as string[])
  )
  const orderIds = orders.map((o) => o.id)

  const [customers, stores, warehouses, channels, itemCounts] = await Promise.all([
    customerIds.length > 0
      ? prisma.customers.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            code: true,
          },
        })
      : [],
    storeIds.length > 0
      ? prisma.stores.findMany({
          where: { store_id: { in: storeIds } },
          select: { store_id: true, name: true },
        })
      : [],
    warehouseIds.length > 0
      ? prisma.warehouses.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
    channelIds.length > 0
      ? prisma.channels.findMany({
          where: { id: { in: channelIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
    prisma.sales_order_items.groupBy({
      by: ['sales_order_id'],
      where: { sales_order_id: { in: orderIds } },
      _count: { id: true },
    }),
  ])

  const customerMap = new Map(customers.map((c) => [c.id, c]))
  const storeMap = new Map(stores.map((s) => [s.store_id, s]))
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))
  const channelMap = new Map(channels.map((ch) => [ch.id, ch]))
  const countMap = new Map(
    itemCounts.map((c) => [c.sales_order_id, c._count.id])
  )

  return orders.map((order) => ({
    ...order,
    customers: order.customer_id
      ? customerMap.get(order.customer_id) ?? null
      : null,
    stores: order.store_id ? storeMap.get(order.store_id) ?? null : null,
    warehouses: order.warehouse_id
      ? warehouseMap.get(order.warehouse_id) ?? null
      : null,
    channels: order.channel_id
      ? channelMap.get(order.channel_id) ?? null
      : null,
    _count: {
      sales_order_items: countMap.get(order.id) ?? 0,
    },
  }))
}

export async function getOrder(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const order = await prisma.sales_orders.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!order) {
    throw new ApiError('Sales order not found.', 404)
  }

  const items = await prisma.sales_order_items.findMany({
    where: { sales_order_id: id },
    orderBy: { line_no: 'asc' },
  })

  const variantIds = Array.from(
    new Set(items.map((i) => i.product_variant_id).filter(Boolean) as string[])
  )
  const uomIds = Array.from(
    new Set(items.map((i) => i.uom_id).filter(Boolean) as string[])
  )

  const [customer, store, warehouse, channel, variants, uoms] = await Promise.all([
    order.customer_id
      ? prisma.customers.findFirst({
          where: { id: order.customer_id },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            code: true,
            address_line1: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
          },
        })
      : null,
    order.store_id
      ? prisma.stores.findFirst({
          where: { store_id: order.store_id },
          select: {
            store_id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        })
      : null,
    order.warehouse_id
      ? prisma.warehouses.findFirst({
          where: { id: order.warehouse_id },
          select: { id: true, name: true, code: true },
        })
      : null,
    order.channel_id
      ? prisma.channels.findFirst({
          where: { id: order.channel_id },
          select: { id: true, name: true, code: true },
        })
      : null,
    variantIds.length > 0
      ? prisma.product_variants.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            sku: true,
            name: true,
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        })
      : [],
    uomIds.length > 0
      ? prisma.uoms.findMany({
          where: { id: { in: uomIds } },
          select: { id: true, name: true, code: true },
        })
      : [],
  ])

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const uomMap = new Map(uoms.map((u) => [u.id, u]))

  const enrichedItems = items.map((item) => {
    const v = variantMap.get(item.product_variant_id)
    const u = item.uom_id ? uomMap.get(item.uom_id) : null
    return {
      ...item,
      product_variants: v
        ? {
            id: v.id,
            sku: v.sku,
            name: v.name,
            products: v.products,
          }
        : null,
      uoms: u
        ? {
            id: u.id,
            name: u.name,
            code: u.code,
          }
        : null,
    }
  })

  return {
    ...order,
    customers: customer,
    stores: store,
    warehouses: warehouse,
    channels: channel,
    sales_order_items: enrichedItems,
  }
}

async function validateOrderStock(
  tx: Prisma.TransactionClient,
  tenantId: string,
  warehouseId: string | null | undefined,
  storeId: string | null | undefined,
  lines: Array<{ product_variant_id: string; qty_ordered: number }>
): Promise<void> {
  if (!lines || lines.length === 0) return

  let effectiveWarehouseId = warehouseId
  if (!effectiveWarehouseId && storeId) {
    const defaultLink = await tx.store_warehouses.findFirst({
      where: {
        store_id: storeId,
        tenant_id: tenantId,
        is_active: true,
        is_default: true,
      },
      select: { warehouse_id: true },
    })
    if (defaultLink?.warehouse_id) {
      effectiveWarehouseId = defaultLink.warehouse_id
    }
  }

  if (!effectiveWarehouseId) return

  // Check if warehouse allows negative stock
  const wh = await tx.warehouses.findFirst({
    where: { id: effectiveWarehouseId, tenant_id: tenantId },
    select: { id: true, name: true, allow_negative_stock: true },
  })
  if (wh?.allow_negative_stock) {
    return
  }

  // Aggregate requested quantities by variant
  const requestedByVariant = new Map<string, number>()
  for (const line of lines) {
    const current = requestedByVariant.get(line.product_variant_id) ?? 0
    requestedByVariant.set(line.product_variant_id, current + line.qty_ordered)
  }

  const variantIds = Array.from(requestedByVariant.keys())
  const balances = await tx.stock_balances.findMany({
    where: {
      tenant_id: tenantId,
      warehouse_id: effectiveWarehouseId,
      product_variant_id: { in: variantIds },
    },
    include: {
      product_variants: {
        select: { sku: true, name: true },
      },
    },
  })

  // Aggregate stock per variant
  const stockByVariant = new Map<
    string,
    { onHand: number; reserved: number; available: number; sku: string; name?: string | null }
  >()

  for (const b of balances) {
    const vId = b.product_variant_id
    const onHand = Number(b.qty_on_hand ?? 0)
    const reserved = Number(b.qty_reserved ?? 0)
    const available =
      b.qty_available !== null && b.qty_available !== undefined
        ? Number(b.qty_available)
        : Math.max(0, onHand - reserved)

    const existing = stockByVariant.get(vId)
    if (existing) {
      existing.onHand += onHand
      existing.reserved += reserved
      existing.available += available
    } else {
      stockByVariant.set(vId, {
        onHand,
        reserved,
        available,
        sku: b.product_variants?.sku || 'Unknown SKU',
        name: b.product_variants?.name,
      })
    }
  }

  for (const [variantId, reqQty] of requestedByVariant.entries()) {
    const stock = stockByVariant.get(variantId)
    const available = stock?.available ?? 0
    const onHand = stock?.onHand ?? 0
    if (reqQty > available) {
      let sku = stock?.sku
      if (!sku) {
        const v = await tx.product_variants.findFirst({
          where: { id: variantId, tenant_id: tenantId },
          select: { sku: true },
        })
        sku = v?.sku || variantId
      }
      throw new ApiError(
        `Insufficient stock for variant "${sku}" in warehouse "${wh?.name || effectiveWarehouseId}". Requested: ${reqQty}, Available: ${available} (${onHand} on hand).`,
        400
      )
    }
  }
}

export async function createOrder(authUserId: string, input: CreateOrderInput) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

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
      uom_id: item.uomId ?? null,
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

  return prisma.$transaction(async (tx) => {
    await validateOrderStock(
      tx,
      tenantId,
      input.warehouseId,
      input.storeId,
      lines
    )

    const order = await tx.sales_orders.create({
      data: {
        tenant_id: tenantId,
        store_id: input.storeId,
        warehouse_id: input.warehouseId ?? null,
        customer_id: input.customerId ?? null,
        channel_id: input.channelId ?? null,
        currency: input.currency ?? 'USD',
        expected_date: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes ?? null,
        created_by: authUserId,
        status: 'draft',
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: subtotal - discountAmount + taxAmount,
        created_by_user_id: tenantUserId,
        updated_by_user_id: tenantUserId,
      },
    })

    if (lines.length > 0) {
      await tx.sales_order_items.createMany({
        data: lines.map((l) => ({
          sales_order_id: order.id,
          tenant_id: tenantId,
          ...l,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    return getOrder(authUserId, order.id)
  })
}

export async function updateOrder(
  authUserId: string,
  id: string,
  input: CreateOrderInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  const existing = await prisma.sales_orders.findFirst({
    where: { id, tenant_id: tenantId },
  })
  if (!existing) {
    throw new ApiError('Sales order not found.', 404)
  }
  if (existing.status !== 'draft') {
    throw new ApiError('Only draft sales orders can be updated.', 400)
  }

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
      uom_id: item.uomId ?? null,
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

  return prisma.$transaction(async (tx) => {
    await validateOrderStock(
      tx,
      tenantId,
      input.warehouseId,
      input.storeId,
      lines
    )

    await tx.sales_orders.update({
      where: { id },
      data: {
        store_id: input.storeId,
        warehouse_id: input.warehouseId ?? null,
        customer_id: input.customerId ?? null,
        channel_id: input.channelId ?? null,
        currency: input.currency ?? 'USD',
        expected_date: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes ?? null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: subtotal - discountAmount + taxAmount,
        updated_by_user_id: tenantUserId,
      },
    })

    await tx.sales_order_items.deleteMany({
      where: { sales_order_id: id, tenant_id: tenantId },
    })

    if (lines.length > 0) {
      await tx.sales_order_items.createMany({
        data: lines.map((l) => ({
          sales_order_id: id,
          tenant_id: tenantId,
          ...l,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })
    }

    return getOrder(authUserId, id)
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
