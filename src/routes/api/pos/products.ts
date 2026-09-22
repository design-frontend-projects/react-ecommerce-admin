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
 * - Live stock availability from stock_balances (store + linked warehouses)
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
    const storeParam = url.searchParams.get('storeId')
    const validWarehouseId = isUuid(warehouseParam)
      ? warehouseParam.trim()
      : null
    const validStoreId = isUuid(storeParam) ? storeParam.trim() : null
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const pageSize = Math.min(
      Math.max(1, Number(url.searchParams.get('pageSize') ?? 50)),
      100
    )
    const skip = (page - 1) * pageSize

    return await runWithTenantContext(
      { tenantId, userId: auth.userId },
      async () => {
        // ── Resolve store-linked warehouse IDs for stock lookups ──
        let storeWarehouseIds: string[] = []
        if (validStoreId) {
          const storeWarehouses = await prisma.store_warehouses.findMany({
            where: {
              store_id: validStoreId,
              tenant_id: tenantId,
              is_active: true,
            },
            select: { warehouse_id: true },
          })
          storeWarehouseIds = storeWarehouses.map((sw) => sw.warehouse_id)
        }

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

        // ── Collect all variant IDs across products ──
        const allVariantIds = products.flatMap((p) =>
          p.product_variants.map((v) => v.id)
        )

        // ── Query stock_balances for all variants at once ──
        // Scope: by store_id OR by linked warehouse IDs OR by direct warehouseId
        let stockBalances: Array<{
          product_variant_id: string
          qty_on_hand: any
          qty_available: any
          qty_reserved: any
        }> = []

        if (allVariantIds.length > 0) {
          // Build the OR conditions for stock balance lookup
          const stockOrConditions: any[] = []

          if (validStoreId) {
            // Direct store stock_balances
            stockOrConditions.push({ store_id: validStoreId })
          }

          if (storeWarehouseIds.length > 0) {
            // Stock at warehouses linked to this store
            stockOrConditions.push({ warehouse_id: { in: storeWarehouseIds } })
          } else if (validWarehouseId) {
            // Fallback to direct warehouse param
            stockOrConditions.push({ warehouse_id: validWarehouseId })
          }

          const stockWhere: Prisma.stock_balancesWhereInput = {
            tenant_id: tenantId,
            product_variant_id: { in: allVariantIds },
            ...(stockOrConditions.length > 0 ? { OR: stockOrConditions } : {}),
          }

          stockBalances = await prisma.stock_balances.findMany({
            where: stockWhere,
            select: {
              product_variant_id: true,
              qty_on_hand: true,
              qty_available: true,
              qty_reserved: true,
            },
          })
        }

        // ── Aggregate stock per variant (sum across all matching balance rows) ──
        const stockMap = new Map<
          string,
          { totalAvailable: number; totalOnHand: number; totalReserved: number }
        >()

        for (const sb of stockBalances) {
          const variantId = sb.product_variant_id
          const existing = stockMap.get(variantId) ?? {
            totalAvailable: 0,
            totalOnHand: 0,
            totalReserved: 0,
          }
          const onHand = Number(sb.qty_on_hand ?? 0)
          const reserved = Number(sb.qty_reserved ?? 0)
          const available =
            sb.qty_available != null
              ? Number(sb.qty_available)
              : Math.max(0, onHand - reserved)

          existing.totalAvailable += available
          existing.totalOnHand += onHand
          existing.totalReserved += reserved
          stockMap.set(variantId, existing)
        }

        // Flatten and enrich for POS display
        const items = products.flatMap((p) => {
          if (!p.product_variants || p.product_variants.length === 0) {
            const priceItem = (p as any).price_list_items?.[0]
            return [
              {
                productId: p.id,
                productVariantId: p.id,
                productName: p.name,
                description: p.description ?? null,
                variantName: null,
                sku: p.sku,
                barcode: p.barcode,
                weight: null,
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
                stockReserved: '0',
                variantAttributes: null,
              },
            ]
          }

          return p.product_variants.map((v) => {
            const stock = stockMap.get(v.id)
            const priceItem =
              (v as any).price_list_items?.[0] ??
              (p as any).price_list_items?.[0]
            return {
              productId: p.id,
              productVariantId: v.id,
              productName: p.name,
              description: p.description ?? null,
              variantName: v.name,
              sku: v.sku,
              barcode: v.barcode ?? p.barcode,
              weight: v.weight?.toString() ?? null,
              basePrice: priceItem?.price?.toString() ?? '0',
              costPrice: priceItem?.cost_price?.toString() ?? '0',
              categoryId: p.category_id,
              categoryName: p.categories?.name ?? null,
              brandName: p.brands?.name ?? null,
              imageUrl: null,
              taxRateId: activeTaxRate?.id ?? null,
              taxRate: activeTaxRate?.rate?.toString() ?? '0',
              taxInclusive: activeTaxRate?.is_inclusive ?? false,
              stockAvailable: stock?.totalAvailable?.toString() ?? '0',
              stockOnHand: stock?.totalOnHand?.toString() ?? '0',
              stockReserved: stock?.totalReserved?.toString() ?? '0',
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
