import { useMemo } from 'react'
import { useAuthQuery } from '@/hooks/use-auth-query'
import { authorizedRequest } from '@/lib/authorized-request'
import { supabase } from '@/lib/supabase'

export interface StockTransferProductVariant {
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
}

export interface WarehouseStockEntry {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  qtyOnHand: number
  qtyReserved: number
  qtyAvailable: number
}

interface RawVariantQueryRow {
  id: string
  sku: string
  barcode: string | null
  name: string | null
  weight: number | string | null
  products?: {
    id?: string
    name?: string
    sku?: string | null
    barcode?: string | null
    weight?: number | string | null
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

/**
 * Fetch product variants enriched with brands, categories, UOM, weight,
 * and pricing from active or default Price Lists.
 */
export function useStockTransferProductVariants(search?: string) {
  return useAuthQuery<StockTransferProductVariant[]>({
    queryKey: ['stock-transfers', 'product-variants-enriched', search ?? ''],
    rbac: { permission: 'inventory.stock.view' },
    queryFn: async (getToken) => {
      // 1. First attempt: Query via Supabase client with rich joins
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
              weight,
              is_batch_tracked,
              is_serial_tracked,
              brands:brand_id ( name ),
              categories:category_id ( name ),
              uoms:base_uom_id ( name, code )
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
          .limit(300)

        if (search && search.trim()) {
          const q = search.trim()
          query = query.or(`sku.ilike.%${q}%,barcode.ilike.%${q}%,name.ilike.%${q}%`)
        }

        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) {
          return (data as unknown as RawVariantQueryRow[]).map(mapVariantRow)
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useStockTransferProductVariants] Supabase join fallback:', err)
      }

      // 2. Second attempt: Query through standard API if available
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/product-variants?limit=300${search ? `&search=${encodeURIComponent(search)}` : ''}`
        )) as { data?: RawVariantQueryRow[] }

        if (payload?.data && Array.isArray(payload.data)) {
          return payload.data.map(mapVariantRow)
        }
      } catch (apiErr) {
        // eslint-disable-next-line no-console
        console.warn('[useStockTransferProductVariants] API route fallback:', apiErr)
      }

      // 3. Fallback: query product variants directly
      const { data: fallbackData } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, name, products(id, name)')
        .limit(100)

      return (fallbackData ?? []).map((row) => ({
        id: row.id,
        sku: row.sku,
        barcode: row.barcode,
        name: row.name || (row.products as { name?: string })?.name || row.sku,
        productId: (row.products as { id?: string })?.id || '',
        productName: (row.products as { name?: string })?.name || 'Item',
        brand: null,
        category: null,
        uom: 'PCS',
        weight: 0,
        costPrice: 0,
        listPrice: 0,
        priceListName: null,
        priceSource: 'Standard',
        isBatchTracked: false,
        isSerialTracked: false,
        searchString: `${row.sku} ${row.name || ''} ${(row.products as { name?: string })?.name || ''}`.toLowerCase(),
      }))
    },
  })
}

function mapVariantRow(row: RawVariantQueryRow): StockTransferProductVariant {
  const prod = row.products
  const pli = row.price_list_items?.[0]
  const listPrice = pli?.price != null ? Number(pli.price) : 0
  const costPrice = pli?.cost_price != null ? Number(pli.cost_price) : 0
  const weight =
    row.weight != null
      ? Number(row.weight)
      : prod?.weight != null
        ? Number(prod.weight)
        : 0

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
    weight,
    costPrice,
    listPrice,
    priceListName: pli?.price_list?.name ?? (listPrice > 0 ? 'Standard Price List' : null),
    priceSource: pli?.price_list?.name ? 'Price List' : 'Standard',
    isBatchTracked: Boolean(prod?.is_batch_tracked),
    isSerialTracked: Boolean(prod?.is_serial_tracked),
    searchString: searchTokens,
  }
}

/**
 * Hook to fetch stock balances for a given variant across ALL warehouses
 * in the current tenant.
 */
export function useCrossWarehouseStock(productVariantId?: string | null) {
  const {
    data: rawStock = [],
    isLoading,
    isFetching,
    refetch,
  } = useAuthQuery<WarehouseStockEntry[]>({
    queryKey: ['stock-balances', 'cross-warehouse', productVariantId ?? 'none'],
    enabled: Boolean(productVariantId),
    queryFn: async (getToken) => {
      if (!productVariantId) return []

      // 1. Try server API
      try {
        const payload = (await authorizedRequest(
          getToken,
          `/api/inventory/stock-balances?productVariantId=${encodeURIComponent(productVariantId)}`
        )) as {
          items?: Array<{
            warehouse_id?: string | null
            qty_on_hand: number | string
            qty_reserved: number | string
            qty_available?: number | string | null
            warehouses?: { id: string; name: string; code: string } | null
          }>
        }

        if (payload?.items && Array.isArray(payload.items)) {
          const map = new Map<string, WarehouseStockEntry>()
          for (const item of payload.items) {
            if (!item.warehouse_id) continue
            const whId = item.warehouse_id
            const whName = item.warehouses?.name || 'Warehouse'
            const whCode = item.warehouses?.code || 'WH'
            const onHand = Number(item.qty_on_hand || 0)
            const reserved = Number(item.qty_reserved || 0)
            const available =
              item.qty_available != null
                ? Number(item.qty_available)
                : Math.max(0, onHand - reserved)

            const existing = map.get(whId)
            if (existing) {
              existing.qtyOnHand += onHand
              existing.qtyReserved += reserved
              existing.qtyAvailable += available
            } else {
              map.set(whId, {
                warehouseId: whId,
                warehouseName: whName,
                warehouseCode: whCode,
                qtyOnHand: onHand,
                qtyReserved: reserved,
                qtyAvailable: available,
              })
            }
          }
          return Array.from(map.values())
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useCrossWarehouseStock] API fallback to Supabase:', err)
      }

      // 2. Direct Supabase Query fallback
      const { data, error } = await supabase
        .from('stock_balances')
        .select(
          `
          warehouse_id,
          qty_on_hand,
          qty_reserved,
          qty_available,
          warehouses ( id, name, code )
        `
        )
        .eq('product_variant_id', productVariantId)

      if (error || !data) return []

      const map = new Map<string, WarehouseStockEntry>()
      for (const row of data as unknown as Array<{
        warehouse_id: string | null
        qty_on_hand: number | string | null
        qty_reserved: number | string | null
        qty_available: number | string | null
        warehouses: { id: string; name: string; code: string } | null
      }>) {
        if (!row.warehouse_id) continue
        const whId = row.warehouse_id
        const whName = row.warehouses?.name || 'Warehouse'
        const whCode = row.warehouses?.code || 'WH'
        const onHand = Number(row.qty_on_hand || 0)
        const reserved = Number(row.qty_reserved || 0)
        const available =
          row.qty_available != null
            ? Number(row.qty_available)
            : Math.max(0, onHand - reserved)

        const existing = map.get(whId)
        if (existing) {
          existing.qtyOnHand += onHand
          existing.qtyReserved += reserved
          existing.qtyAvailable += available
        } else {
          map.set(whId, {
            warehouseId: whId,
            warehouseName: whName,
            warehouseCode: whCode,
            qtyOnHand: onHand,
            qtyReserved: reserved,
            qtyAvailable: available,
          })
        }
      }
      return Array.from(map.values())
    },
  })

  const helpers = useMemo(() => {
    return {
      /**
       * Returns all other warehouses that have stock available, excluding the given sourceWarehouseId.
       */
      getOtherWarehousesWithStock: (sourceWarehouseId?: string | null) => {
        return rawStock.filter(
          (wh) => wh.warehouseId !== sourceWarehouseId && wh.qtyAvailable > 0
        )
      },
      /**
       * Get stock for a specific warehouse.
       */
      getStockForWarehouse: (warehouseId?: string | null) => {
        if (!warehouseId) return null
        return rawStock.find((wh) => wh.warehouseId === warehouseId) || null
      },
      /**
       * Total available stock across all warehouses of the tenant.
       */
      totalTenantAvailable: rawStock.reduce(
        (sum, wh) => sum + (wh.qtyAvailable || 0),
        0
      ),
      /**
       * Total on hand across all warehouses.
       */
      totalTenantOnHand: rawStock.reduce(
        (sum, wh) => sum + (wh.qtyOnHand || 0),
        0
      ),
    }
  }, [rawStock])

  return {
    warehousesStock: rawStock,
    isLoading,
    isFetching,
    refetch,
    ...helpers,
  }
}
