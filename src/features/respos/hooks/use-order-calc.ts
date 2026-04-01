import { useResposStore } from '@/stores/respos-store'
import { useMemo } from 'react'

/**
 * Hook to access and compute centralized real-time totals, tax, and discounts
 * for the current order in the POS system.
 */
export function useOrderCalc() {
  const cart = useResposStore((state) => state.cart)

  return useMemo(() => {
    return {
      subtotal: cart.subtotal,
      manualDiscountAmount: cart.manualDiscountAmount,
      manualDiscountType: cart.manualDiscountType,
      promoDiscountAmount: cart.promoDiscountAmount,
      totalDiscount: cart.manualDiscountAmount + cart.promoDiscountAmount,
      taxAmount: cart.taxAmount,
      tipAmount: cart.tipAmount,
      total: cart.total,
      receivedAmount: cart.receivedAmount,
      changeAmount: cart.changeAmount,
      promoCode: cart.promoCode,
      promotion: cart.promotion,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      items: cart.items,
    }
  }, [cart])
}
