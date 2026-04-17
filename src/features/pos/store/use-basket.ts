import { create } from 'zustand'
import { type BasketItem, type PosDiscount } from '../data/schema'

interface BasketState {
  items: BasketItem[]
  cartDiscount?: PosDiscount

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
  setBasketItems: (items: BasketItem[]) => void
  clearBasket: () => void

  // Computed Values getters (convenience)
  getSubtotal: () => number
  getTaxAmount: () => number
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

  addItem: (newItem) =>
    set((state) => {
      const existingItem = state.items.find(
        (i) =>
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
    }),

  removeCartDiscount: () =>
    set({
      cartDiscount: undefined,
    }),

  setBasketItems: (items) =>
    set({
      items,
      cartDiscount: undefined,
    }),

  clearBasket: () =>
    set({
      items: [],
      cartDiscount: undefined,
    }),

  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.total, 0)
  },

  getTaxAmount: () => {
    // Basic tax logic placeholder. Depends on requirements.
    return 0
  },

  getTotalAmount: () => {
    const { getSubtotal, cartDiscount, getTaxAmount } = get()
    const subtotal = getSubtotal()

    let discountAmount = 0
    if (cartDiscount) {
      if (cartDiscount.type === 'fixed') {
        discountAmount = cartDiscount.value
      } else if (cartDiscount.type === 'percentage') {
        discountAmount = subtotal * (cartDiscount.value / 100)
      }
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount)
    return afterDiscount + getTaxAmount()
  },
}))
