// ResPOS Store - Zustand state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_TAX_RATE } from '@/features/respos/constants'
import {
  computePromoDiscount,
  type PromoCartLine,
} from '@/features/respos/lib/promo-engine'
import {
  validatePromoCode,
  validatePromotion,
} from '@/features/respos/lib/promotion-validator'
import { computeOrderTotals } from '@/features/respos/lib/totals'
import type {
  Cart,
  CartItem,
  OrderChannel,
  PromoError,
  ResEmployeeWithRoles,
  ResPromotion,
  ResShift,
  ResTable,
  SelectedProperty,
  TaxConfig,
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

  // Order channel (activity) — scopes promo eligibility
  orderType: OrderChannel
  setOrderType: (orderType: OrderChannel) => void

  // Tax configuration — synced from tax_rates via useTaxSync(); NOT persisted
  // so a stale rate never survives a reload.
  taxConfig: TaxConfig
  setTaxConfig: (taxConfig: TaxConfig) => void

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
  ) => Promise<{ success: boolean; error?: PromoError }>
  applyPromotion: (
    promotion: ResPromotion
  ) => Promise<{ success: boolean; error?: PromoError }>
  removePromoCode: () => void
  acknowledgePromoRemoval: () => void
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

const DEFAULT_TAX_CONFIG: TaxConfig = {
  rate: DEFAULT_TAX_RATE,
  isInclusive: false,
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

const toPromoLines = (items: CartItem[]): PromoCartLine[] =>
  items.map((ci) => ({
    itemId: ci.item.id,
    categoryId: ci.item.category_id ?? null,
    quantity: ci.quantity,
    unitPrice: ci.quantity > 0 ? ci.lineTotal / ci.quantity : 0,
    lineTotal: ci.lineTotal,
  }))

const calculateCartTotals = (cart: Cart, taxConfig: TaxConfig): Cart => {
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

  // Recompute the promo discount live from the attached promotion so
  // percentage promos track cart edits, fixed promos stay clamped, and
  // buy-x-get-y reacts to quantity changes. If the cart no longer qualifies
  // (below minimum purchase / no eligible items), the promo is auto-removed
  // and the reason surfaced via promoRemovedKey for the UI to toast.
  let promotion = cart.promotion
  let promoCode = cart.promoCode
  let promoDiscountAmount = 0
  let promoRemovedKey = cart.promoRemovedKey
  if (promotion) {
    const belowMinimum =
      promotion.minimum_purchase !== null &&
      promotion.minimum_purchase > 0 &&
      subtotal < promotion.minimum_purchase
    const computed = belowMinimum
      ? {
          discountAmount: 0,
          error: { key: 'respos.promo.error.minPurchase' } as PromoError,
        }
      : computePromoDiscount(promotion, toPromoLines(cart.items), subtotal)

    if (computed.error) {
      promotion = undefined
      promoCode = undefined
      promoRemovedKey = computed.error.key
    } else {
      promoDiscountAmount = computed.discountAmount
    }
  }

  const totals = computeOrderTotals({
    subtotal,
    manualDiscount: manualDiscountAmount,
    promoDiscount: promoDiscountAmount,
    taxConfig,
    tipAmount: cart.tipAmount,
    receivedAmount: cart.receivedAmount,
  })

  return {
    ...cart,
    subtotal: totals.subtotal,
    manualDiscountAmount: cart.manualDiscountAmount, // Keep the input value
    promotion,
    promoCode,
    promoRemovedKey,
    promoDiscountAmount: totals.promoDiscount,
    taxAmount: totals.taxAmount,
    total: totals.total,
    changeAmount: totals.changeAmount,
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

      // Order channel
      orderType: 'dine_in',
      setOrderType: (orderType) => {
        const { cart, taxConfig } = get()
        // A channel switch can invalidate an activity-scoped promo
        if (
          cart.promotion &&
          !(cart.promotion.activities ?? []).includes(orderType)
        ) {
          set({
            orderType,
            cart: calculateCartTotals(
              {
                ...cart,
                promotion: undefined,
                promoCode: undefined,
                promoDiscountAmount: 0,
                promoRemovedKey: 'respos.promo.error.activityMismatch',
              },
              taxConfig
            ),
          })
          return
        }
        set({ orderType })
      },

      // Tax
      taxConfig: DEFAULT_TAX_CONFIG,
      setTaxConfig: (taxConfig) => {
        const cart = get().cart
        set({ taxConfig, cart: calculateCartTotals(cart, taxConfig) })
      },

      // Cart
      cart: initialCart,

      addToCart: (item, variant, properties = [], notes) => {
        const { cart, taxConfig } = get()
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

        const updatedCart = calculateCartTotals(
          { ...cart, items: newItems },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      updateCartItemQuantity: (index, quantity) => {
        const { cart, taxConfig } = get()
        if (quantity <= 0) {
          get().removeFromCart(index)
          return
        }

        const newItems = cart.items.map((ci, i) => {
          if (i !== index) return ci
          // const basePrice = ci.item.base_price
          const variantAdjustment = ci.variant?.price_adjustment || 0
          const propertiesTotal = ci.selectedProperties.reduce(
            (sum, p) => sum + p.price,
            0
          )
          const unitPrice = variantAdjustment + propertiesTotal
          return {
            ...ci,
            quantity,
            lineTotal: quantity * unitPrice,
          }
        })

        const updatedCart = calculateCartTotals(
          { ...cart, items: newItems },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      removeFromCart: (index) => {
        const { cart, taxConfig } = get()
        const newItems = cart.items.filter((_, i) => i !== index)
        const updatedCart = calculateCartTotals(
          { ...cart, items: newItems },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      clearCart: () => {
        set({ cart: { ...initialCart, tableId: get().selectedTable?.id } })
      },

      setManualDiscount: (amount, type) => {
        const { cart, taxConfig } = get()

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

        const updatedCart = calculateCartTotals(
          {
            ...cart,
            manualDiscountAmount: validatedAmount,
            manualDiscountType: type,
          },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      applyPromoCode: async (code) => {
        const { cart, taxConfig, orderType } = get()
        const result = await validatePromoCode(code, {
          lines: toPromoLines(cart.items),
          subtotal: cart.subtotal,
          orderType,
          customerMobile: cart.customerMobile,
        })

        if (result.valid && result.promotion) {
          const updatedCart = calculateCartTotals(
            {
              ...cart,
              promoCode: result.promotion.code ?? code.toUpperCase().trim(),
              promoDiscountAmount: result.discountAmount,
              promotion: result.promotion,
              promoRemovedKey: undefined,
            },
            taxConfig
          )
          set({ cart: updatedCart })
          return { success: true }
        }

        return { success: false, error: result.error }
      },

      applyPromotion: async (promotion) => {
        const { cart, taxConfig, orderType } = get()
        const result = await validatePromotion(promotion, {
          lines: toPromoLines(cart.items),
          subtotal: cart.subtotal,
          orderType,
          customerMobile: cart.customerMobile,
        })

        if (result.valid && result.promotion) {
          const updatedCart = calculateCartTotals(
            {
              ...cart,
              promoCode: result.promotion.code ?? undefined,
              promoDiscountAmount: result.discountAmount,
              promotion: result.promotion,
              promoRemovedKey: undefined,
            },
            taxConfig
          )
          set({ cart: updatedCart })
          return { success: true }
        }

        return { success: false, error: result.error }
      },

      removePromoCode: () => {
        const { cart, taxConfig } = get()
        const updatedCart = calculateCartTotals(
          {
            ...cart,
            promoCode: undefined,
            promoDiscountAmount: 0,
            promotion: undefined,
            promoRemovedKey: undefined,
          },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      acknowledgePromoRemoval: () => {
        const cart = get().cart
        if (!cart.promoRemovedKey) return
        set({ cart: { ...cart, promoRemovedKey: undefined } })
      },

      setCustomerMobile: (mobile) => {
        set({ cart: { ...get().cart, customerMobile: mobile } })
      },

      setPaymentMethod: (method) => {
        const { cart, taxConfig } = get()
        const updatedCart = calculateCartTotals(
          {
            ...cart,
            paymentMethod: method,
            // Reset received amount if not cash? Or keep it.
            receivedAmount: method === 'Cash' ? cart.receivedAmount : 0,
          },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      setReceivedAmount: (amount) => {
        const { cart, taxConfig } = get()
        const updatedCart = calculateCartTotals(
          {
            ...cart,
            receivedAmount: amount,
          },
          taxConfig
        )
        set({ cart: updatedCart })
      },

      setTip: (amount) => {
        const { cart, taxConfig } = get()
        const updatedCart = calculateCartTotals(
          {
            ...cart,
            tipAmount: amount,
          },
          taxConfig
        )
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
        orderType: state.orderType,
      }),
    }
  )
)
