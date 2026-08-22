'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import type { customer_return_status_enum } from '@/generated/prisma/client'

export interface CustomerReturnItemInput {
  productVariantId: string
  locationId?: string | null
  batchId?: string | null
  serialId?: string | null
  quantity: number
  goodQty?: number
  damagedQty?: number
  unitCost?: number
  reason?: string | null
}

export interface CreateCustomerReturnInput {
  warehouseId: string
  customerId?: string | null
  storeId?: string | null
  branchId?: string | null
  salesInvoiceId?: string | null
  reason?: string | null
  notes?: string | null
  items: CustomerReturnItemInput[]
}

export async function listCustomerReturns(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const returns = await prisma.customer_returns.findMany({
      where: { tenant_id: tenantId },
      include: {
        items: true,
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    })

    const warehouseIds = Array.from(new Set(returns.map((r) => r.warehouse_id).filter(Boolean)))
    const customerIds = Array.from(new Set(returns.map((r) => r.customer_id).filter(Boolean))) as string[]

    const [warehouses, customers] = await Promise.all([
      warehouseIds.length
        ? prisma.warehouses.findMany({
            where: { id: { in: warehouseIds } },
            select: { id: true, name: true, code: true },
          })
        : [],
      customerIds.length
        ? prisma.customers.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, first_name: true, last_name: true, phone: true },
          })
        : [],
    ])

    const whMap = new Map(warehouses.map((w) => [w.id, w]))
    const custMap = new Map(customers.map((c) => [c.id, c]))

    return returns.map((r) => ({
      ...r,
      warehouses: whMap.get(r.warehouse_id) ?? null,
      customers: r.customer_id ? custMap.get(r.customer_id) ?? null : null,
    }))
  })
}

export async function getCustomerReturn(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const returnRecord = await prisma.customer_returns.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        items: true,
      },
    })
    if (!returnRecord) {
      throw new ApiError('Customer return not found.', 404)
    }

    const variantIds = Array.from(new Set(returnRecord.items.map((i) => i.product_variant_id)))
    const variants = await prisma.product_variants.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        sku: true,
        barcode: true,
        products: { select: { name: true } },
      },
    })
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    return {
      ...returnRecord,
      items: returnRecord.items.map((item) => ({
        ...item,
        product_variants: variantMap.get(item.product_variant_id) ?? null,
      })),
    }
  })
}

export async function createCustomerReturn(
  authUserId: string,
  input: CreateCustomerReturnInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.warehouseId) {
    throw new ApiError('Receiving warehouse is required.', 400)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError('At least one return line item is required.', 400)
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const count = await prisma.customer_returns.count({ where: { tenant_id: tenantId } })
    const returnNo = `CR-${String(count + 1).padStart(5, '0')}`

    return prisma.$transaction(async (tx: any) => {
      const created = await tx.customer_returns.create({
        data: {
          tenant_id: tenantId,
          return_no: returnNo,
          warehouse_id: input.warehouseId,
          customer_id: input.customerId ?? null,
          store_id: input.storeId ?? null,
          branch_id: input.branchId ?? null,
          sales_invoice_id: input.salesInvoiceId ?? null,
          status: 'draft' as customer_return_status_enum,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
          created_by: authUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      await tx.customer_return_items.createMany({
        data: input.items.map((item) => ({
          tenant_id: tenantId,
          customer_return_id: created.id,
          product_variant_id: item.productVariantId,
          location_id: item.locationId ?? null,
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          quantity: item.quantity,
          good_qty: item.goodQty ?? item.quantity,
          damaged_qty: item.damagedQty ?? 0,
          unit_cost: item.unitCost ?? 0,
          reason: item.reason ?? null,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })

      return created
    })
  })
}

export async function receiveCustomerReturn(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await prisma.customer_returns.findFirst({
      where: { id, tenant_id: tenantId },
      include: { items: true },
    })
    if (!existing) {
      throw new ApiError('Customer return not found.', 404)
    }
    if (existing.status !== 'draft' && existing.status !== 'approved') {
      throw new ApiError(`Cannot receive return with status: ${existing.status}`, 409)
    }

    return prisma.$transaction(async (tx: any) => {
      // 1. Mark return completed
      const updated = await tx.customer_returns.update({
        where: { id },
        data: {
          status: 'completed' as customer_return_status_enum,
          updated_by_user_id: tenantUserId,
        },
      })

      // 2. Record inventory movements for returned items
      for (const item of existing.items) {
        const qty = Number(item.good_qty ?? item.quantity)
        if (qty > 0) {
          await tx.inventory_movements.create({
            data: {
              tenant_id: tenantId,
              warehouse_id: existing.warehouse_id,
              store_id: existing.store_id ?? null,
              product_variant_id: item.product_variant_id,
              movement_type: 'sale_return',
              qty_in: qty,
              qty_out: 0,
              unit_cost: item.unit_cost,
              total_cost: Number(item.unit_cost) * qty,
              reference_type: 'customer_return',
              reference_id: existing.id,
              batch_id: item.batch_id ?? null,
              serial_id: item.serial_id ?? null,
              condition: 'good',
              remarks: `Customer return ${existing.return_no}`,
              created_by: authUserId,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })

          // Upsert stock balances
          const balance = await tx.stock_balances.findFirst({
            where: {
              tenant_id: tenantId,
              warehouse_id: existing.warehouse_id,
              product_variant_id: item.product_variant_id,
              condition: 'good',
            },
          })

          if (balance) {
            await tx.stock_balances.update({
              where: { id: balance.id },
              data: {
                qty_on_hand: { increment: qty },
                qty_available: { increment: qty },
                last_movement_at: new Date(),
                updated_by_user_id: tenantUserId,
              },
            })
          } else {
            await tx.stock_balances.create({
              data: {
                tenant_id: tenantId,
                warehouse_id: existing.warehouse_id,
                store_id: existing.store_id ?? null,
                product_variant_id: item.product_variant_id,
                qty_on_hand: qty,
                qty_available: qty,
                qty_reserved: 0,
                condition: 'good',
                avg_cost: item.unit_cost,
                last_movement_at: new Date(),
                created_by_user_id: tenantUserId,
                updated_by_user_id: tenantUserId,
              },
            })
          }
        }
      }

      return updated
    })
  })
}
