import type {
  SOVariantOption,
  SOVariantStockBalance,
} from '../components/so-product-variant-picker'

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
  const balances: SOVariantStockBalance[] | undefined = variant.stock_balances
  if (balances && balances.length > 0) {
    if (targetWarehouseId) {
      const whBalances = balances.filter((b) => b.warehouse_id === targetWarehouseId)
      if (whBalances.length > 0) {
        return Math.max(
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
      }
      return 0
    }
    if (targetStoreId) {
      const storeBalances = balances.filter((b) => b.store_id === targetStoreId)
      if (storeBalances.length > 0) {
        return Math.max(
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
      }
    }
    return Math.max(
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
  }
  return Math.max(0, Number(variant.stock_quantity ?? 0))
}
