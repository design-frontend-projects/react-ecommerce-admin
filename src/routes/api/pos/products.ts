import { createFileRoute } from '@tanstack/react-router'
import type { Prisma } from '@/generated/prisma/client'
import { runWithTenantContext } from '@/server/context/tenant-context'
import { handleRouteError } from '@/server/utils/api-error'
import { requireTenantId } from '@/server/utils/tenant'
import { withAuth } from '@/server/utils/with-auth'
import prisma from '@/lib/prisma'
import { PERMISSIONS } from '@/features/users/data/permission-constants'

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value?: string | null): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim())
}

export function buildPosProductWhere({
  tenantId,
  categoryId,
  brandId,
  search,
  matchedVariantIds = [],
}: {
  tenantId: string
  categoryId?: string | null
  brandId?: string | null
  search?: string | null
  matchedVariantIds?: string[]
}): Prisma.productsWhereInput {
  const productWhere: Prisma.productsWhereInput = {
    tenant_id: tenantId,
    is_active: true,
    deleted_at: null,
  }

  const cleanCategory = categoryId?.trim()
  if (cleanCategory) {
    if (isUuid(cleanCategory)) {
      productWhere.category_id = cleanCategory
    } else {
      productWhere.categories = {
        OR: [
          { name: { equals: cleanCategory, mode: 'insensitive' } },
          { name_ar: { equals: cleanCategory, mode: 'insensitive' } },
        ],
      }
    }
  }

  const cleanBrand = brandId?.trim()
  if (cleanBrand) {
    if (isUuid(cleanBrand)) {
      productWhere.brand_id = cleanBrand
    } else {
      productWhere.brands = {
        name: { equals: cleanBrand, mode: 'insensitive' },
      }
    }
  }

  const cleanSearch = search?.trim()
  if (cleanSearch && cleanSearch.length > 0) {
    productWhere.OR = [
      { name: { contains: cleanSearch, mode: 'insensitive' } },
      { sku: { contains: cleanSearch, mode: 'insensitive' } },
      { barcode: { contains: cleanSearch, mode: 'insensitive' } },
      {
        product_variants: {
          some: {
            OR: [
              { name: { contains: cleanSearch, mode: 'insensitive' } },
              { sku: { contains: cleanSearch, mode: 'insensitive' } },
              { barcode: { contains: cleanSearch, mode: 'insensitive' } },
              ...(matchedVariantIds.length > 0
                ? [{ id: { in: matchedVariantIds } }]
                : []),
            ],
          },
        },
      },
    ]
  }

  return productWhere
}

/**
 * Fast POS product search supporting:
 * - Barcode scan (exact match on product_barcodes or variant barcode)
 * - SKU search (prefix match)
 * - Product name (fuzzy/contains)
 * - Category filter (by UUID or name)
 * - Brand filter (by UUID or name)
 * - Live stock availability from warehouse
 */
const GET = withAuth(PERMISSIONS.POS_ACCESS, async ({ request, auth }) => {
  try {
    const tenantId = await requireTenantId(auth.userId)
    const url = new URL(request.url)

    const search = (url.searchParams.get('q') ?? '').trim()
    const categoryParam =
      url.searchParams.get('categoryId') ?? url.searchParams.get('category')
    const brandParam =
      url.searchParams.get('brandId') ?? url.searchParams.get('brand')
    const warehouseParam = url.searchParams.get('warehouseId')
    const validWarehouseId = isUuid(warehouseParam)
      ? warehouseParam.trim()
      : null
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(
      Math.max(1, Number(url.searchParams.get('pageSize') ?? 50)),
      100
    )
    const skip = (page - 1) * pageSize

    return await runWithTenantContext(
      { tenantId, userId: auth.userId },
      async () => {
        let matchedVariantIds: string[] = []
        if (search.length > 0) {
          // Look up secondary barcodes from product_barcodes table
          const barcodeMatches = await prisma.product_barcodes.findMany({
            where: {
              tenant_id: tenantId,
              barcode: { contains: search, mode: 'insensitive' },
            },
            select: { product_variant_id: true },
            take: 50,
          })
          matchedVariantIds = barcodeMatches.map((b) => b.product_variant_id)
        }

        const productWhere = buildPosProductWhere({
          tenantId,
          categoryId: categoryParam,
          brandId: brandParam,
          search,
          matchedVariantIds,
        })

        const now = new Date()
        const [products, total, activeTaxRate, categoriesList] =
          await Promise.all([
            prisma.products.findMany({
              where: productWhere,
              skip,
              take: pageSize,
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                sku: true,
                barcode: true,
                category_id: true,
                brand_id: true,
                categories: { select: { id: true, name: true } },
                brands: { select: { id: true, name: true } },
                price_list_items: {
                  select: { price: true, cost_price: true },
                  take: 1,
                },
                product_variants: {
                  where: { is_active: true },
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    barcode: true,
                    weight: true,
                    dimensions: true,
                    price_list_items: {
                      select: { price: true, cost_price: true },
                      take: 1,
                    },
                    // Stock at specified warehouse
                    ...(validWarehouseId
                      ? {
                          stock_balances: {
                            where: {
                              warehouse_id: validWarehouseId,
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
            prisma.tax_rates.findFirst({
              where: {
                tenant_id: tenantId,
                is_active: true,
                effective_from: { lte: now },
                OR: [{ effective_to: null }, { effective_to: { gte: now } }],
              },
              orderBy: { effective_from: 'desc' },
            }),
            prisma.categories.findMany({
              where: {
                OR: [{ tenant_id: tenantId }, { tenant_id: null }],
                is_active: true,
                deleted_at: null,
              },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            }),
          ])

        // Flatten and enrich for POS display
        const items = products.flatMap((p) => {
          if (!p.product_variants || p.product_variants.length === 0) {
            const priceItem = (p as any).price_list_items?.[0]
            return [
              {
                productId: p.id,
                productVariantId: p.id,
                productName: p.name,
                variantName: null,
                sku: p.sku,
                barcode: p.barcode,
                basePrice: priceItem?.price?.toString() ?? '0',
                costPrice: priceItem?.cost_price?.toString() ?? '0',
                categoryId: p.category_id,
                categoryName: p.categories?.name ?? null,
                brandName: p.brands?.name ?? null,
                imageUrl: null,
                taxRateId: activeTaxRate?.id ?? null,
                taxRate: activeTaxRate?.rate?.toString() ?? '0',
                taxInclusive: activeTaxRate?.is_inclusive ?? false,
                stockAvailable: '0',
                stockOnHand: '0',
                variantAttributes: null,
              },
            ]
          }

          return p.product_variants.map((v) => {
            const stock = (v as any).stock_balances?.[0]
            const priceItem =
              (v as any).price_list_items?.[0] ??
              (p as any).price_list_items?.[0]
            return {
              productId: p.id,
              productVariantId: v.id,
              productName: p.name,
              variantName: v.name,
              sku: v.sku,
              barcode: v.barcode ?? p.barcode,
              basePrice: priceItem?.price?.toString() ?? '0',
              costPrice: priceItem?.cost_price?.toString() ?? '0',
              categoryId: p.category_id,
              categoryName: p.categories?.name ?? null,
              brandName: p.brands?.name ?? null,
              imageUrl: null,
              taxRateId: activeTaxRate?.id ?? null,
              taxRate: activeTaxRate?.rate?.toString() ?? '0',
              taxInclusive: activeTaxRate?.is_inclusive ?? false,
              stockAvailable: stock?.qty_available?.toString() ?? '0',
              stockOnHand: stock?.qty_on_hand?.toString() ?? '0',
              variantAttributes: v.dimensions,
            }
          })
        })

        return Response.json({
          success: true,
          data: {
            items,
            categories: categoriesList.map((c) => ({ id: c.id, name: c.name })),
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
