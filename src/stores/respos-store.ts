// ResPOS Store - Zustand state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_TAX_RATE } from '@/features/respos/constants'
import { validatePromoCode } from '@/features/respos/lib/promotion-validator'
import type {
  Cart,
  CartItem,
  ResEmployeeWithRoles,
  ResShift,
  ResTable,
  SelectedProperty,
} from '@/features/respos/types'

interface ResposState {
  // Current employee
  currentEmployee: ResEmployeeWithRoles | null
  setCurrentEmployee: (employee: ResEmployeeWithRoles | null) => void

  // Active shift
  activeShift: ResShift | null
  setActiveShift: (shift: ResShift | null) => void

  // Selected table
  selectedTable: ResTable | null
  setSelectedTable: (table: ResTable | null) => void

  // Selected floor
  selectedFloorId: string | null
  setSelectedFloorId: (floorId: string | null) => void

  // Cart state
  cart: Cart
  addToCart: (
    item: CartItem['item'],
    variant?: CartItem['variant'],
    properties?: SelectedProperty[],
    notes?: string
  ) => void
  updateCartItemQuantity: (index: number, quantity: number) => void
  removeFromCart: (index: number) => void
  clearCart: () => void
  setManualDiscount: (amount: number, type: 'percentage' | 'fixed') => void
  applyPromoCode: (
    code: string
  ) => Promise<{ success: boolean; error?: string }>
  removePromoCode: () => void
  setCustomerMobile: (mobile: string) => void
  setPaymentMethod: (method: string) => void
  setReceivedAmount: (amount: number) => void
  setTip: (amount: number) => void

  // UI state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  isOrderPanelOpen: boolean
  setOrderPanelOpen: (open: boolean) => void
}

const initialCart: Cart = {
  tableId: undefined,
  items: [],
  subtotal: 0,
  manualDiscountAmount: 0,
  manualDiscountType: 'percentage',
  promoDiscountAmount: 0,
  receivedAmount: 0,
  changeAmount: 0,
  taxAmount: 0,
  tipAmount: 0,
  total: 0,
}

const calculateCartTotals = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0)

  let manualDiscountAmount = 0
  if (
    cart.manualDiscountType === 'percentage' &&
    cart.manualDiscountAmount > 0
  ) {
    manualDiscountAmount = subtotal * (cart.manualDiscountAmount / 100)
  } else if (cart.manualDiscountType === 'fixed') {
    manualDiscountAmount = cart.manualDiscountAmount
  }

  const promoDiscountAmount = cart.promoDiscountAmount || 0
  const totalDiscount = manualDiscountAmount + promoDiscountAmount

  const taxableAmount = Math.max(0, subtotal - totalDiscount)
  const taxAmount = taxableAmount * DEFAULT_TAX_RATE

  // Received - Total = Change
  const totalWithoutChange = taxableAmount + taxAmount + cart.tipAmount
  const changeAmount =
    cart.receivedAmount > 0
      ? Math.max(0, cart.receivedAmount - totalWithoutChange)
      : 0

  return {
    ...cart,
    subtotal: Math.round(subtotal * 100) / 100,
    manualDiscountAmount: cart.manualDiscountAmount, // Keep the input value
    promoDiscountAmount: Math.round(promoDiscountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(totalWithoutChange * 100) / 100,
    changeAmount: Math.round(changeAmount * 100) / 100,
  }
}

export const useResposStore = create<ResposState>()(
  persist(
    (set, get) => ({
      // Employee
      currentEmployee: null,
      setCurrentEmployee: (employee) => set({ currentEmployee: employee }),

      // Shift
      activeShift: null,
      setActiveShift: (shift) => set({ activeShift: shift }),

      // Table
      selectedTable: null,
      setSelectedTable: (table) =>
        set({
          selectedTable: table,
          cart: { ...get().cart, tableId: table?.id },
        }),

      // Floor
      selectedFloorId: null,
      setSelectedFloorId: (floorId) => set({ selectedFloorId: floorId }),

      // Cart
      cart: initialCart,

      addToCart: (item, variant, properties = [], notes) => {
        const cart = get().cart
        // const basePrice = item.base_price
        const variantAdjustment = variant?.price_adjustment || 0
        const propertiesTotal = properties.reduce((sum, p) => sum + p.price, 0)
        const unitPrice = variantAdjustment + propertiesTotal

        // Check if same item with same variant and properties exists
        const existingIndex = cart.items.findIndex(
          (ci) =>
            ci.item.id === item.id &&
            ci.variant?.id === variant?.id &&
            JSON.stringify(ci.selectedProperties) === JSON.stringify(properties)
        )

        let newItems: CartItem[]
        if (existingIndex >= 0) {
          // Update quantity
          newItems = cart.items.map((ci, i) =>
            i === existingIndex
              ? {
                  ...ci,
                  quantity: ci.quantity + 1,
                  lineTotal: (ci.quantity + 1) * unitPrice,
                }
              : ci
          )
        } else {
          // Add new item
          const newItem: CartItem = {
            item,
            variant,
            quantity: 1,
            selectedProperties: properties,
            notes,
            lineTotal: unitPrice,
          }
          newItems = [...cart.items, newItem]
        }

        const updatedCart = calculateCartTotals({ ...cart, items: newItems })
        set({ cart: updatedCart })
      },

      updateCartItemQuantity: (index, quantity) => {
        const cart = get().cart
        if (quantity <= 0) {
          get().removeFromCart(index)
          return
        }

        const newItems = cart.items.map((ci, i) => {
          if (i !== index) return ci
          const basePrice = ci.item.base_price
          const variantAdjustment = ci.variant?.price_adjustment || 0
          const propertiesTotal = ci.selectedProperties.reduce(
            (sum, p) => sum + p.price,
            0
          )
          const unitPrice = basePrice + variantAdjustment + propertiesTotal
          return {
            ...ci,
            quantity,
            lineTotal: quantity * unitPrice,
          }
        })

        const updatedCart = calculateCartTotals({ ...cart, items: newItems })
        set({ cart: updatedCart })
      },

      removeFromCart: (index) => {
        const cart = get().cart
        const newItems = cart.items.filter((_, i) => i !== index)
        const updatedCart = calculateCartTotals({ ...cart, items: newItems })
        set({ cart: updatedCart })
      },

      clearCart: () => {
        set({ cart: { ...initialCart, tableId: get().selectedTable?.id } })
      },

      setManualDiscount: (amount, type) => {
        const cart = get().cart

        // Validation: Max 10%
        let validatedAmount = amount
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.lineTotal,
          0
        )
        const maxDiscount = subtotal * 0.1

        if (type === 'percentage' && amount > 10) {
          validatedAmount = 10
        } else if (type === 'fixed' && amount > maxDiscount) {
          validatedAmount = maxDiscount
        }

        const updatedCart = calculateCartTotals({
          ...cart,
          manualDiscountAmount: validatedAmount,
          manualDiscountType: type,
        })
        set({ cart: updatedCart })
      },

      applyPromoCode: async (code) => {
        const cart = get().cart
        const result = await validatePromoCode(code, cart.subtotal)

        if (result.valid && result.promotion) {
          const updatedCart = calculateCartTotals({
            ...cart,
            promoCode: code,
            promoDiscountAmount: result.discountAmount,
            promotion: result.promotion,
          })
          set({ cart: updatedCart })
          return { success: true }
        }

        return { success: false, error: result.error }
      },

      removePromoCode: () => {
        const cart = get().cart
        const updatedCart = calculateCartTotals({
          ...cart,
          promoCode: undefined,
          promoDiscountAmount: 0,
          promotion: undefined,
        })
        set({ cart: updatedCart })
      },

      setCustomerMobile: (mobile) => {
        set({ cart: { ...get().cart, customerMobile: mobile } })
      },

      setPaymentMethod: (method) => {
        const cart = get().cart
        const updatedCart = calculateCartTotals({
          ...cart,
          paymentMethod: method,
          // Reset received amount if not cash? Or keep it.
          receivedAmount: method === 'Cash' ? cart.receivedAmount : 0,
        })
        set({ cart: updatedCart })
      },

      setReceivedAmount: (amount) => {
        const cart = get().cart
        const updatedCart = calculateCartTotals({
          ...cart,
          receivedAmount: amount,
        })
        set({ cart: updatedCart })
      },

      setTip: (amount) => {
        const cart = get().cart
        const updatedCart = calculateCartTotals({
          ...cart,
          tipAmount: amount,
        })
        set({ cart: updatedCart })
      },

      // UI
      isSidebarOpen: true,
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      isOrderPanelOpen: false,
      setOrderPanelOpen: (open) => set({ isOrderPanelOpen: open }),
    }),
    {
      name: 'respos-storage',
      partialize: (state) => ({
        selectedFloorId: state.selectedFloorId,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
)
