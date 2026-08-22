'use server'

import { supabaseAdmin } from '@/server/supabase'
import { rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'

export async function listStockByLocation(
  authUserId: string,
  filters: { storeId?: string; warehouseId?: string } = {}
) {
  const tenantId = await requireTenantId(authUserId)
  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    return prisma.stock_by_location.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters.storeId ? { store_id: filters.storeId } : {}),
        ...(filters.warehouseId ? { warehouse_id: filters.warehouseId } : {}),
      },
      include: {
        product_variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            products: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        warehouses: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        warehouse_locations: {
          select: {
            id: true,
            code: true,
            name: true,
            location_type: true,
          },
        },
        product_batches: {
          select: {
            id: true,
            batch_number: true,
            expiry_date: true,
          },
        },
        stores: {
          select: {
            store_id: true,
            name: true,
          },
        },
      },
      orderBy: [{ warehouse_id: 'asc' }, { updated_at: 'desc' }],
      take: 1000,
    })
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

