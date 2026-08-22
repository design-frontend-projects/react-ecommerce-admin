'use server'

import { ApiError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import type { sales_order_status_enum } from '@/generated/prisma/client'

export interface ShipmentItemInput {
  productVariantId: string
  locationId?: string | null
  batchId?: string | null
  serialId?: string | null
  shippedQty: number
  unitCost?: number
}

export interface CreateShipmentInput {
  warehouseId: string
  salesOrderId?: string | null
  items: ShipmentItemInput[]
}

export async function listSalesShipments(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const shipments = await prisma.sales_shipments.findMany({
      where: { tenant_id: tenantId },
      include: {
        items: true,
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    })

    const warehouseIds = Array.from(new Set(shipments.map((s) => s.warehouse_id).filter(Boolean)))
    const warehouses = warehouseIds.length
      ? await prisma.warehouses.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, name: true, code: true },
        })
      : []

    const whMap = new Map(warehouses.map((w) => [w.id, w]))

    return shipments.map((s) => ({
      ...s,
      warehouses: whMap.get(s.warehouse_id) ?? null,
    }))
  })
}

export async function createSalesShipment(
  authUserId: string,
  input: CreateShipmentInput
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  if (!input.warehouseId) {
    throw new ApiError('Fulfilling warehouse is required.', 400)
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError('At least one shipment item is required.', 400)
  }

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const count = await prisma.sales_shipments.count({ where: { tenant_id: tenantId } })
    const shipmentNo = `SH-${String(count + 1).padStart(5, '0')}`

    return prisma.$transaction(async (tx: any) => {
      const created = await tx.sales_shipments.create({
        data: {
          tenant_id: tenantId,
          shipment_no: shipmentNo,
          warehouse_id: input.warehouseId,
          sales_order_id: input.salesOrderId ?? null,
          status: 'draft' as sales_order_status_enum,
          created_by: authUserId,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        },
      })

      await tx.sales_shipment_items.createMany({
        data: input.items.map((item) => ({
          tenant_id: tenantId,
          shipment_id: created.id,
          product_variant_id: item.productVariantId,
          location_id: item.locationId ?? null,
          batch_id: item.batchId ?? null,
          serial_id: item.serialId ?? null,
          shipped_qty: item.shippedQty,
          unit_cost: item.unitCost ?? 0,
          created_by_user_id: tenantUserId,
          updated_by_user_id: tenantUserId,
        })),
      })

      return created
    })
  })
}

export async function dispatchSalesShipment(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const existing = await prisma.sales_shipments.findFirst({
      where: { id, tenant_id: tenantId },
      include: { items: true },
    })
    if (!existing) {
      throw new ApiError('Shipment not found.', 404)
    }
    if (existing.status !== 'draft' && existing.status !== 'confirmed') {
      throw new ApiError(`Shipment cannot be dispatched with status ${existing.status}`, 409)
    }

    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.sales_shipments.update({
        where: { id },
        data: {
          status: 'delivered' as sales_order_status_enum,
          shipped_at: new Date(),
          updated_by_user_id: tenantUserId,
        },
      })

      for (const item of existing.items) {
        const qty = Number(item.shipped_qty)
        if (qty > 0) {
          await tx.inventory_movements.create({
            data: {
              tenant_id: tenantId,
              warehouse_id: existing.warehouse_id,
              product_variant_id: item.product_variant_id,
              movement_type: 'sale',
              qty_in: 0,
              qty_out: qty,
              unit_cost: item.unit_cost ?? 0,
              total_cost: Number(item.unit_cost ?? 0) * qty,
              reference_type: 'sales_shipment',
              reference_id: existing.id,
              batch_id: item.batch_id ?? null,
              serial_id: item.serial_id ?? null,
              condition: 'good',
              remarks: `Sales shipment ${existing.shipment_no}`,
              created_by: authUserId,
              created_by_user_id: tenantUserId,
              updated_by_user_id: tenantUserId,
            },
          })

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
                qty_on_hand: { decrement: qty },
                qty_available: { decrement: qty },
                last_movement_at: new Date(),
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
