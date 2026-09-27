'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'
import { BusinessEventNotifications } from '@/server/services/business-event-notifications'
import {
  PurchaseOrderService,
  type CreatePurchaseOrderDto,
  type UpdatePurchaseOrderDto,
} from '@/server/services/purchase-order-service'

export type PurchaseOrderLifecycleStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

export async function createPurchaseOrder(
  authUserId: string,
  dto: CreatePurchaseOrderDto
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  return await PurchaseOrderService.createPurchaseOrder(
    authUserId,
    tenantId,
    tenantUserId,
    dto
  )
}

export async function updatePurchaseOrder(
  authUserId: string,
  dto: UpdatePurchaseOrderDto
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  return await PurchaseOrderService.updatePurchaseOrder(
    authUserId,
    tenantId,
    tenantUserId,
    dto
  )
}

export async function getPurchaseOrderById(
  authUserId: string,
  poId: string
) {
  const tenantId = await requireTenantId(authUserId)
  return await PurchaseOrderService.getPurchaseOrderById(tenantId, poId)
}

export async function setPurchaseOrderStatus(
  authUserId: string,
  poId: string,
  status: PurchaseOrderLifecycleStatus
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.purchase_orders.findFirst({
    where: { id: poId, tenant_id: tenantId },
    select: {
      id: true,
      po_number: true,
      lifecycle_status: true,
      grand_total: true,
      suppliers: { select: { name: true } },
    },
  })
  if (!existing) {
    throw new ApiError('Purchase order not found.', 404)
  }

  const { data, error } = await supabaseAdmin.rpc('set_purchase_order_status', {
    p_po_id: poId,
    p_status: status,
  })
  if (error) {
    throw rpcError(error)
  }

  await prisma.purchase_orders.update({
    where: { id: poId },
    data: { updated_by_user_id: tenantUserId },
  })

  // Real-time Business Event Notification Trigger
  const poNumber = existing.po_number != null ? String(existing.po_number) : poId.slice(0, 8)
  const supplierName = existing.suppliers?.name ?? null

  try {
    if (status === 'approved') {
      await BusinessEventNotifications.notifyPurchaseOrderApproved({
        tenantId,
        poId,
        poNumber,
        supplierName,
        totalAmount: existing.grand_total ? Number(existing.grand_total) : null,
        createdByUserId: tenantUserId,
      })
    } else if (status === 'received') {
      await BusinessEventNotifications.notifyPurchaseOrderReceived({
        tenantId,
        poId,
        poNumber,
        supplierName,
        createdByUserId: tenantUserId,
      })
    } else {
      await BusinessEventNotifications.notifyPurchaseOrderStatusChanged({
        tenantId,
        poId,
        poNumber,
        oldStatus: existing.lifecycle_status,
        newStatus: status,
        supplierName,
        updatedByUserId: tenantUserId,
      })
    }
  } catch (err: any) {
    console.warn('[setPurchaseOrderStatus] Notification dispatch deferred:', err?.message)
  }

  return data
}
