import { create } from 'zustand'
import { type BasketItem, type PosDiscount } from '../data/schema'

interface BasketState {
  items: BasketItem[]
  cartDiscount?: PosDiscount
  appliedPromotion?: any
  taxRates: any[]

  // Actions
  addItem: (item: Omit<BasketItem, 'subtotal' | 'total'>) => void
  removeItem: (productId: number, productVariantId?: string) => void
  updateQuantity: (
    productId: number,
    quantity: number,
    productVariantId?: string
  ) => void
  applyItemDiscount: (
    productId: number,
    discount: PosDiscount,
    productVariantId?: string
  ) => void
  applyCartDiscount: (discount: PosDiscount) => void
  removeCartDiscount: () => void
  applyPromotion: (promo: any) => void
  removePromotion: () => void
  setTaxRates: (rates: any[]) => void
  setBasketItems: (items: BasketItem[]) => void
  clearBasket: () => void

  // Computed Values getters (convenience)
  getSubtotal: () => number
  getTaxAmount: () => number
  getDiscountAmount: () => number
  getTotalAmount: () => number
}

// Helpers for recalculation
const calculateItemTotals = (
  item: Omit<BasketItem, 'subtotal' | 'total'>
): BasketItem => {
  const subtotal = item.unitPrice * item.quantity
  let discountAmount = 0
  if (item.discount) {
    if (item.discount.type === 'fixed') {
      discountAmount = item.discount.value
    } else if (item.discount.type === 'percentage') {
      discountAmount = subtotal * (item.discount.value / 100)
    }
  }
  return {
    ...item,
    subtotal,
    total: Math.max(0, subtotal - discountAmount),
  }
}

const isSameBasketLine = (
  item: Pick<BasketItem, 'productId' | 'productVariantId'>,
  productId: number,
  productVariantId?: string
) =>
  item.productId === productId &&
  (item.productVariantId ?? null) === (productVariantId ?? null)

export const useBasket = create<BasketState>((set, get) => ({
  items: [],
  cartDiscount: undefined,
  appliedPromotion: undefined,
  taxRates: [],

  addItem: (newItem) =>
    set((state) => {
      const existingItem = state.items.find((i) =>
        isSameBasketLine(i, newItem.productId, newItem.productVariantId)
      )

      if (existingItem) {
        // Increase quantity
        const updatedQuantity = existingItem.quantity + newItem.quantity
        const updatedItems = state.items.map((i) =>
          isSameBasketLine(i, newItem.productId, newItem.productVariantId)
            ? calculateItemTotals({ ...i, quantity: updatedQuantity })
            : i
        )
        return { items: updatedItems }
      }

      // Add new
      return { items: [...state.items, calculateItemTotals(newItem)] }
    }),

  removeItem: (productId, productVariantId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !isSameBasketLine(i, productId, productVariantId)
      ),
    })),

  updateQuantity: (productId, quantity, productVariantId) =>
    set((state) => {
      if (quantity <= 0) {
        return {
          items: state.items.filter(
            (i) => !isSameBasketLine(i, productId, productVariantId)
          ),
        }
      }
      return {
        items: state.items.map((i) =>
          isSameBasketLine(i, productId, productVariantId)
            ? calculateItemTotals({ ...i, quantity })
            : i
        ),
      }
    }),

  applyItemDiscount: (productId, discount, productVariantId) =>
    set((state) => ({
      items: state.items.map((i) =>
        isSameBasketLine(i, productId, productVariantId)
          ? calculateItemTotals({ ...i, discount })
          : i
      ),
    })),

  applyCartDiscount: (discount) =>
    set({
      cartDiscount: discount,
      appliedPromotion: undefined, // Override promotion if manual discount is applied
    }),

  removeCartDiscount: () =>
    set({
      cartDiscount: undefined,
    }),

  applyPromotion: (promo) =>
    set({
      appliedPromotion: promo,
      cartDiscount: undefined, // Override manual discount if promotion is applied
    }),

  removePromotion: () =>
    set({
      appliedPromotion: undefined,
    }),

  setTaxRates: (rates) =>
    set({
      taxRates: rates,
    }),

  setBasketItems: (items) =>
    set({
      items,
      cartDiscount: undefined,
      appliedPromotion: undefined,
    }),

  clearBasket: () =>
    set({
      items: [],
      cartDiscount: undefined,
      appliedPromotion: undefined,
    }),

  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.total, 0)
  },

  getDiscountAmount: () => {
    const { getSubtotal, cartDiscount, appliedPromotion } = get()
    const subtotal = getSubtotal()

    let discountAmount = 0
    if (appliedPromotion) {
      if (appliedPromotion.discount_type === 'fixed') {
        discountAmount = Number(appliedPromotion.discount_value)
      } else if (appliedPromotion.discount_type === 'percentage') {
        discountAmount =
          subtotal * (Number(appliedPromotion.discount_value) / 100)
      }
    } else if (cartDiscount) {
      if (cartDiscount.type === 'fixed') {
        discountAmount = cartDiscount.value
      } else if (cartDiscount.type === 'percentage') {
        discountAmount = subtotal * (cartDiscount.value / 100)
      }
    }
    return discountAmount
  },

  getTaxAmount: () => {
    const { getSubtotal, getDiscountAmount, taxRates } = get()
    const subtotal = getSubtotal()
    const discountAmount = getDiscountAmount()
    const afterDiscount = Math.max(0, subtotal - discountAmount)

    if (!taxRates || taxRates.length === 0) return 0

    let totalTax = 0
    taxRates.forEach((tax) => {
      const rate = Number(tax.rate)
      if (tax.is_inclusive) {
        totalTax += (afterDiscount * rate) / 100
      } else {
        totalTax += afterDiscount * (rate / 100)
      }
    })
    return totalTax
  },

  getTotalAmount: () => {
    const { getSubtotal, getDiscountAmount, taxRates } = get()
    const subtotal = getSubtotal()
    const discountAmount = getDiscountAmount()
    const afterDiscount = Math.max(0, subtotal - discountAmount)
    let exclusiveTax = 0
    if (taxRates) {
      taxRates.forEach((tax) => {
        if (!tax.is_inclusive) {
          exclusiveTax += (afterDiscount * Number(tax.rate)) / 100
        }
      })
    }
    return afterDiscount + exclusiveTax
  },
}))
