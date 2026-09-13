import type {
  SOVariantOption,
  SOVariantStockBalance,
} from '../components/so-product-variant-picker'

export interface VariantStockSummary {
  onHand: number
  reserved: number
  available: number
  isAvailable: boolean
  isLowStock: boolean
  isOutOfStock: boolean
}

/**
 * Calculates a complete stock summary for a product variant based on fulfillment warehouse or store context:
 * - onHand: physical count in the selected warehouse/location
 * - reserved: quantity already committed to confirmed orders
 * - available: usable stock (Math.max(0, onHand - reserved))
 */
export function getVariantStockSummary(
  variant: SOVariantOption,
  targetWarehouseId?: string | null,
  targetStoreId?: string | null
): VariantStockSummary {
  const balances: SOVariantStockBalance[] | undefined = variant.stock_balances

  // 1. If explicit warehouse is targeted, calculate stock strictly for that warehouse
  if (targetWarehouseId) {
    if (balances && balances.length > 0) {
      const whBalances = balances.filter((b) => b.warehouse_id === targetWarehouseId)
      if (whBalances.length > 0) {
        const onHand = whBalances.reduce((sum, b) => sum + Number(b.qty_on_hand || 0), 0)
        const reserved = whBalances.reduce((sum, b) => sum + Number(b.qty_reserved || 0), 0)
        const available = Math.max(
          0,
          whBalances.reduce(
            (sum, b) =>
              sum +
              Number(
                b.qty_available ??
                  (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
              ),
            0
          )
        )
        return {
          onHand,
          reserved,
          available,
          isAvailable: available > 0,
          isLowStock: available > 0 && available <= 5,
          isOutOfStock: available <= 0,
        }
      }
      // Target warehouse specified but has 0 records in balances
      return {
        onHand: 0,
        reserved: 0,
        available: 0,
        isAvailable: false,
        isLowStock: false,
        isOutOfStock: true,
      }
    }

    // Fall back to stock_quantity if stock_balances is empty or absent
    if (variant.stock_quantity !== undefined && variant.stock_quantity !== null) {
      const qty = Math.max(0, Number(variant.stock_quantity))
      return {
        onHand: qty,
        reserved: 0,
        available: qty,
        isAvailable: qty > 0,
        isLowStock: qty > 0 && qty <= 5,
        isOutOfStock: qty <= 0,
      }
    }
  }

  // 2. If explicit store is targeted (without a warehouse), calculate stock strictly for that store
  if (targetStoreId) {
    if (balances && balances.length > 0) {
      const storeBalances = balances.filter((b) => b.store_id === targetStoreId)
      if (storeBalances.length > 0) {
        const onHand = storeBalances.reduce((sum, b) => sum + Number(b.qty_on_hand || 0), 0)
        const reserved = storeBalances.reduce((sum, b) => sum + Number(b.qty_reserved || 0), 0)
        const available = Math.max(
          0,
          storeBalances.reduce(
            (sum, b) =>
              sum +
              Number(
                b.qty_available ??
                  (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
              ),
            0
          )
        )
        return {
          onHand,
          reserved,
          available,
          isAvailable: available > 0,
          isLowStock: available > 0 && available <= 5,
          isOutOfStock: available <= 0,
        }
      }
      // Target store specified but has 0 records in balances
      return {
        onHand: 0,
        reserved: 0,
        available: 0,
        isAvailable: false,
        isLowStock: false,
        isOutOfStock: true,
      }
    }

    // Fall back to stock_quantity if stock_balances is empty or absent
    if (variant.stock_quantity !== undefined && variant.stock_quantity !== null) {
      const qty = Math.max(0, Number(variant.stock_quantity))
      return {
        onHand: qty,
        reserved: 0,
        available: qty,
        isAvailable: qty > 0,
        isLowStock: qty > 0 && qty <= 5,
        isOutOfStock: qty <= 0,
      }
    }
  }

  // 3. If variant has precomputed contextual stock values from live queries (e.g. variantStockMap)
  if (
    variant.qty_available !== undefined &&
    variant.qty_on_hand !== undefined
  ) {
    const onHand = Number(variant.qty_on_hand || 0)
    const reserved = Number(variant.qty_reserved || 0)
    const available = Math.max(0, Number(variant.qty_available || 0))
    return {
      onHand,
      reserved,
      available,
      isAvailable: available > 0,
      isLowStock: available > 0 && available <= 5,
      isOutOfStock: available <= 0,
    }
  }

  // 4. Fallback across all balances if available (only when no specific facility targeted)
  if (balances && balances.length > 0) {
    const onHand = balances.reduce((sum, b) => sum + Number(b.qty_on_hand || 0), 0)
    const reserved = balances.reduce((sum, b) => sum + Number(b.qty_reserved || 0), 0)
    const available = Math.max(
      0,
      balances.reduce(
        (sum, b) =>
          sum +
          Number(
            b.qty_available ??
              (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
          ),
        0
      )
    )
    return {
      onHand,
      reserved,
      available,
      isAvailable: available > 0,
      isLowStock: available > 0 && available <= 5,
      isOutOfStock: available <= 0,
    }
  }

  // 5. Fallback to legacy variant stock_quantity if available
  const legacyStock = Math.max(0, Number(variant.stock_quantity ?? 0))
  return {
    onHand: legacyStock,
    reserved: 0,
    available: legacyStock,
    isAvailable: legacyStock > 0,
    isLowStock: legacyStock > 0 && legacyStock <= 5,
    isOutOfStock: legacyStock <= 0,
  }
}

/**
 * Calculates available stock for a product variant based on fulfillment warehouse or store context.
 * 1. If targetWarehouseId is provided, matches balances specifically for that warehouse.
 * 2. Else if targetStoreId is provided, matches balances for that store.
 * 3. Else aggregates all available balances.
 * 4. Falls back to variant.stock_quantity if stock_balances is empty or not loaded.
 */
export function getAvailableStock(
  variant: SOVariantOption,
  targetWarehouseId?: string | null,
  targetStoreId?: string | null
): number {
  return getVariantStockSummary(variant, targetWarehouseId, targetStoreId).available
}

export interface LocationStockItem {
  locationId: string
  locationName: string
  locationType: 'warehouse' | 'store'
  code?: string | null
  onHand: number
  reserved: number
  available: number
  isCurrentLocation: boolean
  isLinkedToStore?: boolean
}

/**
 * Aggregates and returns the breakdown of stock across all stores and warehouses for a variant.
 * Used by the out-of-stock multi-location side panel to show where inventory exists.
 */
export function getVariantLocationBreakdown(
  variant: SOVariantOption,
  stores: Array<{ store_id: string; name?: string | null }>,
  warehouses: Array<{ id: string; name: string; code?: string | null }>,
  currentStoreId?: string | null,
  currentWarehouseId?: string | null,
  storeWarehouseIds?: string[]
): LocationStockItem[] {
  const balances = variant.stock_balances || []
  const storeMap = new Map(stores.map((s) => [s.store_id, s.name || 'Store']))
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))
  const linkedWhSet = new Set(storeWarehouseIds || [])

  const results: LocationStockItem[] = []
  const whProcessed = new Set<string>()
  const storeProcessed = new Set<string>()

  // Process warehouse balances
  for (const b of balances) {
    if (b.warehouse_id) {
      const whId = b.warehouse_id
      const wh = warehouseMap.get(whId)
      const onHand = Number(b.qty_on_hand || 0)
      const reserved = Number(b.qty_reserved || 0)
      const available = Math.max(0, Number(b.qty_available ?? (onHand - reserved)))

      results.push({
        locationId: whId,
        locationName: wh ? wh.name : `Warehouse (${whId.slice(0, 8)})`,
        locationType: 'warehouse',
        code: wh?.code ?? null,
        onHand,
        reserved,
        available,
        isCurrentLocation: currentWarehouseId === whId,
        isLinkedToStore: linkedWhSet.has(whId),
      })
      whProcessed.add(whId)
    } else if (b.store_id) {
      const sId = b.store_id
      const storeName = storeMap.get(sId)
      const onHand = Number(b.qty_on_hand || 0)
      const reserved = Number(b.qty_reserved || 0)
      const available = Math.max(0, Number(b.qty_available ?? (onHand - reserved)))

      results.push({
        locationId: sId,
        locationName: storeName || `Store (${sId.slice(0, 8)})`,
        locationType: 'store',
        code: null,
        onHand,
        reserved,
        available,
        isCurrentLocation: currentStoreId === sId,
        isLinkedToStore: currentStoreId === sId,
      })
      storeProcessed.add(sId)
    }
  }

  // Include current warehouse if not present with 0 balance
  if (currentWarehouseId && !whProcessed.has(currentWarehouseId)) {
    const wh = warehouseMap.get(currentWarehouseId)
    if (wh) {
      results.push({
        locationId: currentWarehouseId,
        locationName: wh.name,
        locationType: 'warehouse',
        code: wh.code ?? null,
        onHand: 0,
        reserved: 0,
        available: 0,
        isCurrentLocation: true,
        isLinkedToStore: true,
      })
    }
  }

  // Include current store if not present with 0 balance
  if (currentStoreId && !storeProcessed.has(currentStoreId)) {
    const storeName = storeMap.get(currentStoreId)
    if (storeName) {
      results.push({
        locationId: currentStoreId,
        locationName: storeName,
        locationType: 'store',
        code: null,
        onHand: 0,
        reserved: 0,
        available: 0,
        isCurrentLocation: true,
        isLinkedToStore: true,
      })
    }
  }

  // Sort: available > 0 first, current location prioritized, then by name
  return results.sort((a, b) => {
    if (a.available > 0 && b.available <= 0) return -1
    if (a.available <= 0 && b.available > 0) return 1
    if (a.isCurrentLocation) return -1
    if (b.isCurrentLocation) return 1
    return a.locationName.localeCompare(b.locationName)
  })
}

export interface TaxResolutionResult {
  taxRate: number
  taxType: string
  source: 'product_tax_code' | 'tax_rate_table' | 'none'
  label: string
}

/**
 * Extracts the applicable tax percentage from product's tax_code or active tax rates.
 * Examples: "VAT_20" -> 20%, "VAT_14" -> 14%, "TAX_10" -> 10%, "15" -> 15%.
 */
export function extractTaxRate(
  product?: { tax_code?: string | null; tax_classification_id?: string | null } | null,
  activeTaxRates?: Array<{ tax_type: string; rate: number | string; is_active?: boolean }>
): TaxResolutionResult {
  if (!product) return { taxRate: 0, taxType: '', source: 'none', label: '' }

  const code = (product.tax_code || '').trim()
  if (code) {
    // 1. Check if tax_code matches an entry in activeTaxRates table
    if (activeTaxRates && activeTaxRates.length > 0) {
      const matched = activeTaxRates.find(
        (t) => t.tax_type.toLowerCase() === code.toLowerCase() && t.is_active !== false
      )
      if (matched) {
        const rate = Number(matched.rate)
        return {
          taxRate: rate,
          taxType: matched.tax_type,
          source: 'tax_rate_table',
          label: `${matched.tax_type} (${rate}%)`,
        }
      }
    }

    // 2. Parse numbers from tax_code like "VAT_20" -> 20, "VAT_14" -> 14, "TAX_10" -> 10, "15" -> 15
    const match = code.match(/(\d+(\.\d+)?)/)
    if (match) {
      const rate = parseFloat(match[1])
      const taxType = code.replace(/[_\d.]+/g, '').trim() || 'Tax'
      return {
        taxRate: rate,
        taxType,
        source: 'product_tax_code',
        label: `${taxType} (${rate}%)`,
      }
    }
  }

  return { taxRate: 0, taxType: '', source: 'none', label: '' }
}

/**
 * Automatically computes line item tax based on quantity, unit price, discount amount, and tax rate.
 */
export function calculateLineTaxAmount(
  qty: number,
  unitPrice: number,
  discountAmount: number,
  taxRatePercent: number
): number {
  if (taxRatePercent <= 0 || qty <= 0 || unitPrice <= 0) return 0
  const net = Math.max(0, qty * unitPrice - (discountAmount || 0))
  return Number(((net * taxRatePercent) / 100).toFixed(2))
}

export interface TaxPreviewInfo {
  taxCode: string | null
  taxRatePercent: number
  calculatedTax: number
  taxName?: string | null
  taxRate: number
  taxType: string
  unitTax: number
  totalLineTax: number
  netAmount: number
  grossAmount: number
  label: string
}

/**
 * Computes full tax preview breakdown including tax code, rate percentage, line tax, and gross amount.
 * Supports both (product, qty, unitPrice, discount, activeTaxRates) and numeric parameter overloads.
 */
export function computeTaxPreview(
  productOrQty: { tax_code?: string | null } | number | null | undefined,
  qtyOrUnitPrice: number,
  unitPriceOrDiscount: number,
  discountOrTaxRate: number,
  taxRatesOrType?: Array<{ tax_type: string; rate: number | string; name?: string | null; is_active?: boolean }> | string
): TaxPreviewInfo {
  if (typeof productOrQty === 'object' || productOrQty === null || productOrQty === undefined) {
    const product = productOrQty
    const qty = qtyOrUnitPrice
    const unitPrice = unitPriceOrDiscount
    const discountAmount = discountOrTaxRate
    const activeTaxRates = Array.isArray(taxRatesOrType) ? taxRatesOrType : []

    const taxRes = extractTaxRate(product, activeTaxRates)
    const rate = taxRes.taxRate
    const net = Math.max(0, qty * unitPrice - (discountAmount || 0))
    const lineTax = calculateLineTaxAmount(qty, unitPrice, discountAmount, rate)
    const unitTax = qty > 0 ? Number((lineTax / qty).toFixed(2)) : 0
    const gross = net + lineTax

    const matchedRate = activeTaxRates.find(
      (t) => t.tax_type.toLowerCase() === (product?.tax_code || '').trim().toLowerCase()
    )

    return {
      taxCode: product?.tax_code || (rate > 0 ? taxRes.taxType : null),
      taxRatePercent: rate,
      calculatedTax: lineTax,
      taxName: matchedRate?.name || (rate > 0 ? taxRes.label : null),
      taxRate: rate,
      taxType: taxRes.taxType || 'Tax',
      unitTax,
      totalLineTax: lineTax,
      netAmount: net,
      grossAmount: gross,
      label: rate > 0 ? `${taxRes.taxType || 'Tax'} (${rate}%)` : 'No Tax',
    }
  }

  // Overload when invoked with numbers: (qty, unitPrice, discountAmount, taxRatePercent, taxType)
  const qty = productOrQty
  const unitPrice = qtyOrUnitPrice
  const discountAmount = unitPriceOrDiscount
  const taxRatePercent = discountOrTaxRate
  const taxType = typeof taxRatesOrType === 'string' ? taxRatesOrType : 'Tax'

  const net = Math.max(0, qty * unitPrice - (discountAmount || 0))
  const lineTax = calculateLineTaxAmount(qty, unitPrice, discountAmount, taxRatePercent)
  const unitTax = qty > 0 ? Number((lineTax / qty).toFixed(2)) : 0
  const gross = net + lineTax

  return {
    taxCode: taxRatePercent > 0 ? taxType : null,
    taxRatePercent,
    calculatedTax: lineTax,
    taxName: taxRatePercent > 0 ? `${taxType} (${taxRatePercent}%)` : null,
    taxRate: taxRatePercent,
    taxType,
    unitTax,
    totalLineTax: lineTax,
    netAmount: net,
    grossAmount: gross,
    label: taxRatePercent > 0 ? `${taxType} (${taxRatePercent}%)` : 'No Tax',
  }
}

