"use server"

import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/server/supabase'
import { ApiError, rpcError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'

export async function listSuggestions(authUserId: string) {
  const tenantId = await requireTenantId(authUserId)
  return prisma.reorder_suggestions.findMany({
    where: { tenant_id: tenantId },
    orderBy: { run_at: 'desc' },
    include: {
      product_variants: {
        select: {
          id: true,
          sku: true,
          products: { select: { name: true } },
        },
      },
      stores: { select: { store_id: true, name: true } },
      suppliers: { select: { supplier_id: true, name: true } },
    },
  })
}

export async function runCheck(authUserId: string, storeId?: string) {
  const tenantId = await requireTenantId(authUserId)

  const { data, error } = await supabaseAdmin.rpc('run_reorder_check', {
    p_tenant: tenantId,
    p_store: storeId ?? null,
  })
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function convertSuggestions(authUserId: string, ids: string[]) {
  const tenantId = await requireTenantId(authUserId)

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError('Select at least one suggestion to convert.', 400)
  }

  const { data, error } = await supabaseAdmin.rpc(
    'convert_reorder_suggestions',
    {
      p_tenant: tenantId,
      p_suggestion_ids: ids,
    }
  )
  if (error) {
    throw rpcError(error)
  }
  return data
}

export async function dismissSuggestion(authUserId: string, id: string) {
  const tenantId = await requireTenantId(authUserId)

  const existing = (await prisma.reorder_suggestions.findFirst({
    where: { id, tenant_id: tenantId },
    select: { status: true },
  })) as { status: string } | null
  if (!existing) {
    throw new ApiError('Suggestion not found.', 404)
  }
  if (existing.status !== 'open') {
    throw new ApiError('Only an open suggestion can be dismissed.', 409)
  }

  return prisma.reorder_suggestions.update({
    where: { id },
    data: { status: 'dismissed' },
  })
}
