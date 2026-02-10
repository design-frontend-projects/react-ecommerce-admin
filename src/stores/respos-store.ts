// ResPOS Store - Zustand state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_TAX_RATE } from '@/features/respos/constants'
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
  setDiscount: (amount: number, type: 'percentage' | 'fixed') => void
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
  discountAmount: 0,
  discountType: undefined,
  taxAmount: 0,
  tipAmount: 0,
  total: 0,
}

const calculateCartTotals = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0)

  let discountAmount = 0
  if (cart.discountType === 'percentage' && cart.discountAmount > 0) {
    discountAmount = subtotal * (cart.discountAmount / 100)
  } else if (cart.discountType === 'fixed') {
    discountAmount = cart.discountAmount
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * DEFAULT_TAX_RATE
  const total = taxableAmount + taxAmount + cart.tipAmount

  return {
    ...cart,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
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
        const basePrice = item.base_price
        const variantAdjustment = variant?.price_adjustment || 0
        const propertiesTotal = properties.reduce((sum, p) => sum + p.price, 0)
        const unitPrice = basePrice + variantAdjustment + propertiesTotal

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

      setDiscount: (amount, type) => {
        const cart = get().cart
        const updatedCart = calculateCartTotals({
          ...cart,
          discountAmount: amount,
          discountType: type,
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
