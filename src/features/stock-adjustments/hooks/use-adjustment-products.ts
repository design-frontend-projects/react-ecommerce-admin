import { useAuthQuery } from '@/hooks/use-auth-query'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'

export interface AdjustmentProductVariant {
  id: string
  sku: string
  barcode: string | null
  name: string
  productId: string
  productName: string
  brand: string | null
  category: string | null
  uom: string | null
  weight: number
  costPrice: number
  listPrice: number
  priceListName: string | null
  priceSource: string
  isBatchTracked: boolean
  isSerialTracked: boolean
  searchString: string
  facilityStock?: {
    facilityId: string
    facilityType: 'warehouse' | 'store'
    facilityName?: string | null
    facilityCode?: string | null
    qtyOnHand: number
    qtyReserved: number
    qtyAvailable: number
  } | null
}

export interface UseAdjustmentProductVariantsOptions {
  facilityType: 'warehouse' | 'store'
  facilityId?: string | null
  enabled?: boolean
}

interface ApiVariantItem {
  id: string
  product_id?: string
  sku: string
  barcode?: string | null
  name?: string | null
  product_name?: string
  brand_name?: string | null
  category_name?: string | null
  uom_id?: string | null
  weight?: number | null
  price?: number
  cost_price?: number | null
  products?: { id?: string; name: string } | null
  qty_on_hand?: number
  qty_available?: number
  qty_reserved?: number
  source_stock?: {
    warehouse_id?: string
    warehouse_name?: string | null
    warehouse_code?: string | null
    store_id?: string
    store_name?: string | null
    facility_type?: 'warehouse' | 'store'
    qty_on_hand: number
    qty_reserved: number
    qty_available: number
  } | null
}

export function useAdjustmentProductVariants(
  search?: string,
  options?: UseAdjustmentProductVariantsOptions
) {
  const facilityType = options?.facilityType || 'warehouse'
  const facilityId = options?.facilityId?.trim() || null

  return useAuthQuery<AdjustmentProductVariant[]>({
    queryKey: [
      'stock-adjustments',
      'product-variants',
      facilityType,
      facilityId ?? 'all',
      search?.trim() ?? '',
    ],
    rbac: { permission: 'inventory.view' },
    enabled: options?.enabled !== false,
    staleTime: 30_000,
    queryFn: async (getToken) => {
      // 1. Primary: Server API query backed by Prisma 7 & tenant isolation
      try {
        const params = new URLSearchParams({ limit: '100' })
        if (search?.trim()) {
          params.set('search', search.trim())
        }
        if (facilityId) {
          if (facilityType === 'warehouse') {
            params.set('warehouseId', facilityId)
          } else {
            params.set('storeId', facilityId)
          }
          params.set('facilityType', facilityType)
        }

        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/product-variants?${params.toString()}`
        )) as {
          success?: boolean
          items?: ApiVariantItem[]
        }

        if (payload?.items && Array.isArray(payload.items) && payload.items.length > 0) {
          return payload.items.map((item) =>
            mapApiVariantItem(item, facilityType, facilityId)
          )
        }
      } catch (apiErr) {
        // eslint-disable-next-line no-console
        console.warn('[useAdjustmentProductVariants] API route fallback:', apiErr)
      }

      // 2. Resilient Supabase fallback
      try {
        let query = supabase
          .from('product_variants')
          .select(
            `
            id,
            sku,
            barcode,
            name,
            weight,
            products (
              id,
              name,
              sku,
              barcode,
              is_batch_tracked,
              is_serial_tracked,
              brands ( name ),
              categories ( name ),
              uoms ( name, code )
            ),
            price_list_items (
              price,
              cost_price,
              price_list (
                name,
                is_default,
                type
              )
            )
          `
          )
          .order('sku')
          .limit(100)

        if (search && search.trim()) {
          const q = search.trim()
          query = query.or(`sku.ilike.%${q}%,barcode.ilike.%${q}%,name.ilike.%${q}%`)
        }

        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) {
          interface RawSupabaseVariantRow {
            id: string
            sku: string
            barcode?: string | null
            name?: string | null
            weight?: number | string | null
            products?: {
              id?: string
              name?: string
              sku?: string | null
              barcode?: string | null
              is_batch_tracked?: boolean | null
              is_serial_tracked?: boolean | null
              brands?: { name?: string | null } | null
              categories?: { name?: string | null } | null
              uoms?: { name?: string | null; code?: string | null } | null
            } | null
            price_list_items?: Array<{
              price?: number | string | null
              cost_price?: number | string | null
              price_list?: {
                name?: string | null
                is_default?: boolean | null
                type?: string | null
              } | null
            }> | null
          }

          interface RawBalanceRow {
            product_variant_id?: string | null
            qty_on_hand?: number | string | null
            inventory_items?: {
              product_variant_id?: string | null
            } | null
          }

          // If facilityId is provided, also fetch on-hand balances for these variants
          const balanceMap: Record<string, number> = {}
          const typedData = data as unknown as RawSupabaseVariantRow[]
          if (facilityId) {
            const variantIds = typedData.map((d) => d.id)
            let balanceQuery = supabase
              .from('stock_balances')
              .select('product_variant_id, qty_on_hand, inventory_items(product_variant_id)')
              .in('product_variant_id', variantIds)

            if (facilityType === 'warehouse') {
              balanceQuery = balanceQuery.eq('warehouse_id', facilityId)
            } else {
              balanceQuery = balanceQuery.eq('store_id', facilityId)
            }

            const { data: bData } = await balanceQuery
            if (bData && Array.isArray(bData)) {
              for (const row of bData as unknown as RawBalanceRow[]) {
                const vid = row.product_variant_id || row.inventory_items?.product_variant_id
                if (vid) {
                  balanceMap[vid] = Number(row.qty_on_hand || 0)
                }
              }
            }
          }

          return typedData.map((row) => {
            const prod = row.products
            const pli = row.price_list_items?.[0]
            const listPrice = pli?.price != null ? Number(pli.price) : 0
            const costPrice = pli?.cost_price != null ? Number(pli.cost_price) : 0
            const pName = prod?.name || row.name || row.sku
            const brandName = prod?.brands?.name ?? null
            const categoryName = prod?.categories?.name ?? null
            const uomName = prod?.uoms?.code || prod?.uoms?.name || 'PCS'
            const barcode = row.barcode || prod?.barcode || null

            const searchTokens = [
              row.sku,
              row.name,
              prod?.name,
              prod?.sku,
              barcode,
              brandName,
              categoryName,
              uomName,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()

            const onHand = facilityId ? (balanceMap[row.id] ?? 0) : 0

            return {
              id: row.id,
              sku: row.sku,
              barcode,
              name: row.name || pName,
              productId: prod?.id || '',
              productName: pName,
              brand: brandName,
              category: categoryName,
              uom: uomName,
              weight: row.weight != null ? Number(row.weight) : 0,
              costPrice,
              listPrice,
              priceListName: pli?.price_list?.name ?? (listPrice > 0 ? 'Standard Price List' : null),
              priceSource: pli?.price_list?.name ? 'Price List' : 'Standard',
              isBatchTracked: Boolean(prod?.is_batch_tracked),
              isSerialTracked: Boolean(prod?.is_serial_tracked),
              searchString: searchTokens,
              facilityStock: facilityId
                ? {
                    facilityId,
                    facilityType,
                    qtyOnHand: onHand,
                    qtyReserved: 0,
                    qtyAvailable: onHand,
                  }
                : null,
            }
          })
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useAdjustmentProductVariants] Supabase join fallback:', err)
      }

      return []
    },
  })
}

function mapApiVariantItem(
  item: ApiVariantItem,
  fallbackFacilityType: 'warehouse' | 'store',
  fallbackFacilityId: string | null
): AdjustmentProductVariant {
  const pName = item.product_name || item.name || item.sku
  const searchTokens = [
    item.sku,
    item.name,
    item.product_name,
    item.barcode,
    item.brand_name,
    item.category_name,
    item.uom_id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const listPrice = item.price != null ? Number(item.price) : 0
  const costPrice = item.cost_price != null ? Number(item.cost_price) : 0

  let facilityStock: AdjustmentProductVariant['facilityStock'] = null

  if (item.source_stock) {
    const s = item.source_stock
    facilityStock = {
      facilityId: s.warehouse_id || s.store_id || fallbackFacilityId || '',
      facilityType: s.facility_type || fallbackFacilityType,
      facilityName: s.warehouse_name || s.store_name || null,
      facilityCode: s.warehouse_code || null,
      qtyOnHand: Number(s.qty_on_hand || 0),
      qtyReserved: Number(s.qty_reserved || 0),
      qtyAvailable: Number(s.qty_available || 0),
    }
  } else if (fallbackFacilityId) {
    facilityStock = {
      facilityId: fallbackFacilityId,
      facilityType: fallbackFacilityType,
      qtyOnHand: Number(item.qty_on_hand || 0),
      qtyReserved: Number(item.qty_reserved || 0),
      qtyAvailable: Number(item.qty_available || 0),
    }
  }

  return {
    id: item.id,
    sku: item.sku,
    barcode: item.barcode ?? null,
    name: item.name || pName,
    productId: item.product_id || item.products?.id || '',
    productName: pName,
    brand: item.brand_name ?? null,
    category: item.category_name ?? null,
    uom: item.uom_id || 'PCS',
    weight: item.weight != null ? Number(item.weight) : 0,
    costPrice,
    listPrice,
    priceListName: listPrice > 0 ? 'Standard Price List' : null,
    priceSource: 'API',
    isBatchTracked: false,
    isSerialTracked: false,
    searchString: searchTokens,
    facilityStock,
  }
}
