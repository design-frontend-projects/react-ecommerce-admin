'use server'

import { supabaseAdmin } from '@/server/supabase'
import { rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import prisma from '@/lib/prisma'

export async function listStockByLocation(
  authUserId: string,
  filters: { storeId?: string; warehouseId?: string } = {}
) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.stock_by_location.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.storeId ? { store_id: filters.storeId } : {}),
      ...(filters.warehouseId ? { warehouse_id: filters.warehouseId } : {}),
    },
    orderBy: [{ warehouse_id: 'asc' }, { updated_at: 'desc' }],
    take: 1000,
  })
}

export async function getReconcileReport(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  const { data, error } = await supabaseAdmin.rpc('inventory_reconcile', {
    p_tenant: tenantId,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}
