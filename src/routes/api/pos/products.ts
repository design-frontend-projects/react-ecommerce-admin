import { createFileRoute } from '@tanstack/react-router'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { handleRouteError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

/**
 * Fast POS product search supporting:
 * - Barcode scan (exact match on product_barcodes or variant barcode)
 * - SKU search (prefix match)
 * - Product name (fuzzy/contains)
 * - Category filter
 * - Brand filter
 * - Live stock availability from warehouse
 */
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)

    const search = url.searchParams.get('q') ?? ''
    const categoryId = url.searchParams.get('categoryId')
    const brandId = url.searchParams.get('brandId')
    const warehouseId = url.searchParams.get('warehouseId')
    const page = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Math.min(
      Number(url.searchParams.get('pageSize') ?? 50),
      100
    )
    const skip = (page - 1) * pageSize

    return await runWithTenantContext(
      { tenantId, userId: auth.userId },
      async () => {
        // Build WHERE clause for products
        const productWhere: Prisma.productsWhereInput = {
          tenant_id: tenantId,
          is_active: true,
          deleted_at: null,
          ...(categoryId && { category_id: categoryId }),
          ...(brandId && { brand_id: brandId }),
        }

        // Search conditions
        if (search.length > 0) {
          productWhere.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            {
              product_variants: {
                some: { sku: { startsWith: search, mode: 'insensitive' } },
              },
            },
            { product_variants: { some: { barcode: search } } },
            { product_barcodes: { some: { barcode: search } } },
          ]
        }

        const [products, total] = await Promise.all([
          prisma.products.findMany({
            where: productWhere,
            skip,
            take: pageSize,
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              name_ar: true,
              description: true,
              category_id: true,
              brand_id: true,
              tax_rate_id: true,
              categories: { select: { id: true, name: true } },
              brands: { select: { id: true, name: true } },
              tax_rates: {
                select: { id: true, rate: true, is_inclusive: true },
              },
              product_variants: {
                where: { is_active: true },
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  barcode: true,
                  base_price: true,
                  cost_price: true,
                  weight: true,
                  variant_attributes: true,
                  product_images: {
                    select: { image_url: true, is_primary: true },
                    take: 1,
                    orderBy: { is_primary: 'desc' },
                  },
                  // Stock at specified warehouse
                  ...(warehouseId
                    ? {
                        stock_balances: {
                          where: {
                            warehouse_id: warehouseId,
                            tenant_id: tenantId,
                          },
                          select: {
                            qty_on_hand: true,
                            qty_available: true,
                            qty_reserved: true,
                          },
                          take: 1,
                        },
                      }
                    : {}),
                },
                orderBy: { sku: 'asc' },
              },
            },
          }),
          prisma.products.count({ where: productWhere }),
        ])

        // Flatten and enrich for POS display
        const items = products.flatMap((p) =>
          p.product_variants.map((v) => {
            const stock = (v as any).stock_balances?.[0]
            return {
              productId: p.id,
              productVariantId: v.id,
              productName: p.name,
              variantName: v.name,
              sku: v.sku,
              barcode: v.barcode,
              basePrice: v.base_price?.toString() ?? '0',
              costPrice: v.cost_price?.toString() ?? '0',
              categoryId: p.category_id,
              categoryName: p.categories?.name ?? null,
              brandName: p.brands?.name ?? null,
              imageUrl: v.product_images?.[0]?.image_url ?? null,
              taxRateId: p.tax_rate_id ?? null,
              taxRate: p.tax_rates?.rate?.toString() ?? '0',
              taxInclusive: p.tax_rates?.is_inclusive ?? false,
              stockAvailable: stock?.qty_available?.toString() ?? '0',
              stockOnHand: stock?.qty_on_hand?.toString() ?? '0',
              variantAttributes: v.variant_attributes,
            }
          })
        )

        return Response.json({
          success: true,
          data: {
            items,
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize),
            },
          },
        })
      }
    )
  } catch (error: unknown) {
    return handleRouteError(error, 'Product search failed')
  }
})

export const Route = createFileRoute('/api/pos/products')({
  server: {
    handlers: { GET },
  },
})
