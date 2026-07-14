'use server'

import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
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
  poId: number,
  status: PurchaseOrderLifecycleStatus
) {
  const tenantId = await requireTenantId(authUserId)
  const existing = (await prisma.purchase_orders.findFirst({
    where: { po_id: poId, auth_user_id: tenantId },
    select: { po_id: true },
  })) as { po_id: number } | null
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
  return data
}
