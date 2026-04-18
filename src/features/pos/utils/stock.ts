export type StockAwareVariant = {
  stock_quantity?: number | null
  min_stock?: number | null
  is_active?: boolean | null
}

function toSafeNumber(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return value
}

export function isVariantLowStock(variant: StockAwareVariant): boolean {
  const quantity = toSafeNumber(variant.stock_quantity)
  const minStock = toSafeNumber(variant.min_stock)
  return quantity <= minStock
}

export function isVariantSellable(variant: StockAwareVariant): boolean {
  const isActive = variant.is_active ?? true
  return isActive && !isVariantLowStock(variant)
}

export function getProductStockFlags(
  variants: StockAwareVariant[] | null | undefined
) {
  const safeVariants = variants ?? []
  const hasLowStockVariants = safeVariants.some(isVariantLowStock)
  const hasSellableVariants = safeVariants.some(isVariantSellable)

  return {
    hasLowStockVariants,
    hasSellableVariants,
  }
}

