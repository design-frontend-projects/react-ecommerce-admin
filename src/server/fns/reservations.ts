'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export async function listReservations(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.stock_reservations.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: 'desc' },
    take: 500,
    include: {
      product_variants: {
        select: { id: true, sku: true, products: { select: { name: true } } },
      },
      stores: { select: { store_id: true, name: true } },
    },
  })
}

interface ReservationRow {
  id: string
  tenant_id: string
  store_id: string
  product_variant_id: string
  qty: unknown
  qty_consumed: unknown
  status: string
  reference_type: string
  reference_id: string | null
  reference_item_id: string | null
}

export async function releaseReservation(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)
  const reservation = (await prisma.stock_reservations.findFirst({
    where: { id, tenant_id: tenantId },
    select: {
      id: true,
      tenant_id: true,
      store_id: true,
      product_variant_id: true,
      qty: true,
      qty_consumed: true,
      status: true,
      reference_type: true,
      reference_id: true,
      reference_item_id: true,
    },
  })) as ReservationRow | null
  if (!reservation) {
    throw new ApiError('Reservation not found.', 404)
  }
  if (reservation.status !== 'active') {
    throw new ApiError(
      `A ${reservation.status} reservation cannot be released.`,
      409
    )
  }

  const { error } = await supabaseAdmin.rpc('apply_inventory_movements', {
    p_movements: [
      {
        tenant_id: reservation.tenant_id,
        store_id: reservation.store_id,
        product_variant_id: reservation.product_variant_id,
        movement_type: 'released',
        qty: Number(reservation.qty) - Number(reservation.qty_consumed),
        reference_type: reservation.reference_type,
        reference_id: reservation.reference_id,
        idempotency_key: `res-manual-release:${id}`,
        remarks: 'Manual release',
        created_by: authUserId,
      },
    ],
  })
  if (error) {
    throw rpcError(error)
  }

  const updated = await prisma.stock_reservations.update({
    where: { id },
    data: { status: 'released', released_at: new Date() },
  })

  if (reservation.reference_item_id) {
    await prisma.sales_order_items.update({
      where: { id: reservation.reference_item_id },
      data: { qty_reserved: 0 },
    })
  }

  return updated
}
