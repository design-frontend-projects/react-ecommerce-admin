'use server'

import type { Prisma } from '@/generated/prisma/client'
import { requireTenantId } from '@/server/utils/tenant'
import { runWithTenantContext } from '@/server/context/tenant-context'
import prisma from '@/lib/prisma'
import type { VariantSearchResult, VariantSearchResponse } from '@/features/stock-balances/data/schema'

/**
 * Search product variants with tenant isolation, debounced lookup, and price/cost resolution.
 */
export async function searchProductVariants(
  authUserId: string,
  search = '',
  limit = 25
): Promise<VariantSearchResponse> {
  const tenantId = await requireTenantId(authUserId)
  const cappedLimit = Math.min(Math.max(1, limit), 50)

  return runWithTenantContext({ tenantId, userId: authUserId }, async () => {
    const trimmed = search.trim()
    const where: Prisma.product_variantsWhereInput = {
      tenant_id: tenantId,
      is_active: { not: false },
    }

    if (trimmed) {
      where.OR = [
        { sku: { contains: trimmed, mode: 'insensitive' } },
        { barcode: { contains: trimmed, mode: 'insensitive' } },
        { name: { contains: trimmed, mode: 'insensitive' } },
        { products: { name: { contains: trimmed, mode: 'insensitive' } } },
      ]
    }

    const variants = await prisma.product_variants.findMany({
      where,
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        products: {
          select: {
            id: true,
            name: true,
          },
        },
        price_list_items: {
          select: {
            price: true,
            cost_price: true,
          },
          take: 1,
        },
      },
      take: cappedLimit,
      orderBy: { sku: 'asc' },
    })

    const items: VariantSearchResult[] = variants.map((v) => {
      const pli = v.price_list_items?.[0]
      return {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode ?? null,
        name: v.name ?? null,
        product_name: v.products?.name ?? '',
        price: pli?.price ? Number(pli.price) : 0,
        cost_price: pli?.cost_price != null ? Number(pli.cost_price) : null,
      }
    })

    return {
      success: true,
      items,
    }
  })
}
