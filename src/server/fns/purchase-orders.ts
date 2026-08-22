'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId, resolveTenantUserId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export type PurchaseOrderLifecycleStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

export async function setPurchaseOrderStatus(
  authUserId: string,
  poId: string,
  status: PurchaseOrderLifecycleStatus
) {
  const tenantId = await requireTenantId(authUserId)
  const tenantUserId = await resolveTenantUserId(authUserId)
  const existing = await prisma.purchase_orders.findFirst({
    where: { id: poId, tenant_id: tenantId },
    select: { id: true },
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

  return data
}
