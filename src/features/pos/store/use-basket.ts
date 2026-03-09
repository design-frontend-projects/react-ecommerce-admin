import { create } from 'zustand'
import { type BasketItem, type PosDiscount } from '../data/schema'

interface BasketState {
  items: BasketItem[]
  cartDiscount?: PosDiscount

  // Actions
  addItem: (item: Omit<BasketItem, 'subtotal' | 'total'>) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  applyItemDiscount: (productId: number, discount: PosDiscount) => void
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

export const useBasket = create<BasketState>((set, get) => ({
  items: [],
  cartDiscount: undefined,

  addItem: (newItem) =>
    set((state) => {
      const existingItem = state.items.find(
        (i) => i.productId === newItem.productId
      )

      if (existingItem) {
        // Increase quantity
        const updatedQuantity = existingItem.quantity + newItem.quantity
        const updatedItems = state.items.map((i) =>
          i.productId === newItem.productId
            ? calculateItemTotals({ ...i, quantity: updatedQuantity })
            : i
        )
        return { items: updatedItems }
      }

      // Add new
      return { items: [...state.items, calculateItemTotals(newItem)] }
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) }
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId
            ? calculateItemTotals({ ...i, quantity })
            : i
        ),
      }
    }),

  applyItemDiscount: (productId, discount) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? calculateItemTotals({ ...i, discount }) : i
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
