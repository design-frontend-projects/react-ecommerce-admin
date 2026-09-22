import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface PosCustomer {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  customerGroupId?: string | null
}

export interface PosCartDiscount {
  type: 'fixed' | 'percentage'
  value: number
  reason?: string
}

export interface PosCartItem {
  id: string // line id
  productId: string
  productVariantId: string
  name: string
  sku: string
  barcode?: string | null
  unitPrice: number
  unitCost?: number
  quantity: number
  availableQuantity?: number // stock available from stock_balances
  taxRateId?: string | null
  taxRate?: number
  taxInclusive?: boolean
  discount?: PosCartDiscount
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  notes?: string
}

export interface HeldOrder {
  id: string
  reference: string
  customerId?: string | null
  customerName?: string | null
  items: PosCartItem[]
  cartDiscount?: PosCartDiscount
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  createdAt: string
  notes?: string
}

export interface PosTerminalContext {
  id: string
  name: string
  code: string
  storeId?: string | null
  branchId?: string | null
  warehouseId?: string | null
  defaultPriceListId?: string | null
}

export interface PosSessionContext {
  id: string
  status: 'open' | 'closed'
  openedAt?: string | null
  openingCash?: number
  cashierName?: string | null
}

export interface PosTaxRate {
  id?: string
  rate: number | string
  is_inclusive: boolean
  name?: string
}

interface PosState {
  // Terminal & Session
  terminal: PosTerminalContext | null
  session: PosSessionContext | null

  // Order attributes
  customer: PosCustomer | null
  priceListId: string | null

  // Cart
  items: PosCartItem[]
  cartDiscount?: PosCartDiscount
  appliedPromotion?: any
  taxRates: PosTaxRate[]

  // Held Orders
  heldOrders: HeldOrder[]

  // Active Layout Tab
  activeTab: string
  setActiveTab: (tab: string) => void

  // Actions
  setTerminal: (terminal: PosTerminalContext | null) => void
  setSession: (session: PosSessionContext | null) => void
  setCustomer: (customer: PosCustomer | null) => void
  setPriceListId: (priceListId: string | null) => void
  setTaxRates: (rates: PosTaxRate[]) => void

  // Cart actions
  addItem: (
    item: Omit<
      PosCartItem,
      'id' | 'subtotal' | 'discountAmount' | 'taxAmount' | 'total'
    >
  ) => void
  hasStockErrors: () => boolean
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  updateItemPrice: (lineId: string, newUnitPrice: number) => void
  applyItemDiscount: (lineId: string, discount: PosCartDiscount) => void
  removeItemDiscount: (lineId: string) => void
  applyCartDiscount: (discount: PosCartDiscount) => void
  removeCartDiscount: () => void
  applyPromotion: (promo: any) => void
  removePromotion: () => void
  clearCart: () => void

  // Held order actions
  holdCart: (reference: string, notes?: string) => HeldOrder | null
  resumeHeldCart: (heldOrderId: string) => boolean
  discardHeldCart: (heldOrderId: string) => void
  setHeldOrders: (heldOrders: HeldOrder[]) => void

  // Calculation getters
  getSubtotal: () => number
  getItemDiscountAmount: () => number
  getCartDiscountAmount: () => number
  getTotalDiscountAmount: () => number
  getTaxAmount: () => number
  getTotalAmount: () => number
  getItemCount: () => number
}

function calculateItemTotals(
  item: Omit<
    PosCartItem,
    'id' | 'subtotal' | 'discountAmount' | 'taxAmount' | 'total'
  >,
  existingId?: string
): PosCartItem {
  const subtotal = item.unitPrice * item.quantity
  let discountAmount = 0

  if (item.discount) {
    if (item.discount.type === 'fixed') {
      discountAmount = Math.min(subtotal, item.discount.value)
    } else if (item.discount.type === 'percentage') {
      discountAmount = subtotal * (Math.min(100, item.discount.value) / 100)
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  let taxAmount = 0
  const rate = Number(item.taxRate ?? 0)

  if (rate > 0) {
    if (item.taxInclusive) {
      taxAmount = taxableAmount - taxableAmount / (1 + rate / 100)
    } else {
      taxAmount = taxableAmount * (rate / 100)
    }
  }

  const total = item.taxInclusive ? taxableAmount : taxableAmount + taxAmount

  return {
    ...item,
    id: existingId || uuidv4(),
    subtotal,
    discountAmount,
    taxAmount,
    total,
  }
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      terminal: null,
      session: null,
      customer: null,
      priceListId: null,
      items: [],
      cartDiscount: undefined,
      appliedPromotion: undefined,
      taxRates: [],
      heldOrders: [],
      activeTab: 'checkout',

      setActiveTab: (activeTab) => set({ activeTab }),
      setTerminal: (terminal) => set({ terminal }),
      setSession: (session) => set({ session }),
      setCustomer: (customer) => set({ customer }),
      setPriceListId: (priceListId) => set({ priceListId }),
      setTaxRates: (taxRates) => set({ taxRates }),

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productVariantId === newItem.productVariantId
          )

          if (existing) {
            const updatedQty = existing.quantity + newItem.quantity
            // Cap to available stock if defined
            const maxQty =
              existing.availableQuantity != null
                ? existing.availableQuantity
                : Infinity
            const clampedQty = Math.min(updatedQty, maxQty)
            if (clampedQty <= 0) return {}
            const updatedItems = state.items.map((i) =>
              i.id === existing.id
                ? calculateItemTotals(
                    {
                      ...i,
                      quantity: clampedQty,
                      availableQuantity:
                        newItem.availableQuantity ?? existing.availableQuantity,
                    },
                    existing.id
                  )
                : i
            )
            return { items: updatedItems }
          }

          const created = calculateItemTotals(newItem)
          return { items: [...state.items, created] }
        }),

      hasStockErrors: () => {
        return get().items.some(
          (i) =>
            i.availableQuantity != null && i.quantity > i.availableQuantity
        )
      },

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== lineId),
        })),

      updateQuantity: (lineId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== lineId) }
          }
          return {
            items: state.items.map((i) =>
              i.id === lineId
                ? calculateItemTotals({ ...i, quantity }, i.id)
                : i
            ),
          }
        }),

      updateItemPrice: (lineId, newUnitPrice) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === lineId
              ? calculateItemTotals({ ...i, unitPrice: Math.max(0, newUnitPrice) }, i.id)
              : i
          ),
        })),

      applyItemDiscount: (lineId, discount) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === lineId
              ? calculateItemTotals({ ...i, discount }, i.id)
              : i
          ),
        })),

      removeItemDiscount: (lineId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === lineId
              ? calculateItemTotals({ ...i, discount: undefined }, i.id)
              : i
          ),
        })),

      applyCartDiscount: (discount) =>
        set({
          cartDiscount: discount,
          appliedPromotion: undefined,
        }),

      removeCartDiscount: () =>
        set({
          cartDiscount: undefined,
        }),

      applyPromotion: (promo) =>
        set({
          appliedPromotion: promo,
          cartDiscount: undefined,
        }),

      removePromotion: () =>
        set({
          appliedPromotion: undefined,
        }),

      clearCart: () =>
        set({
          items: [],
          cartDiscount: undefined,
          appliedPromotion: undefined,
          customer: null,
        }),

      holdCart: (reference, notes) => {
        const state = get()
        if (state.items.length === 0) return null

        const heldOrder: HeldOrder = {
          id: uuidv4(),
          reference,
          customerId: state.customer?.id ?? null,
          customerName: state.customer?.name ?? null,
          items: [...state.items],
          cartDiscount: state.cartDiscount,
          subtotal: state.getSubtotal(),
          discountAmount: state.getTotalDiscountAmount(),
          taxAmount: state.getTaxAmount(),
          totalAmount: state.getTotalAmount(),
          createdAt: new Date().toISOString(),
          notes,
        }

        set((s) => ({
          heldOrders: [heldOrder, ...s.heldOrders],
          items: [],
          cartDiscount: undefined,
          appliedPromotion: undefined,
          customer: null,
        }))

        return heldOrder
      },

      resumeHeldCart: (heldOrderId) => {
        const state = get()
        const target = state.heldOrders.find((h) => h.id === heldOrderId)
        if (!target) return false

        set((s) => ({
          items: target.items,
          cartDiscount: target.cartDiscount,
          customer: target.customerId
            ? { id: target.customerId, name: target.customerName || 'Customer' }
            : null,
          heldOrders: s.heldOrders.filter((h) => h.id !== heldOrderId),
        }))

        return true
      },

      discardHeldCart: (heldOrderId) =>
        set((state) => ({
          heldOrders: state.heldOrders.filter((h) => h.id !== heldOrderId),
        })),

      setHeldOrders: (heldOrders) => set({ heldOrders }),

      // Computation getters
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0)
      },

      getItemDiscountAmount: () => {
        return get().items.reduce((sum, item) => sum + item.discountAmount, 0)
      },

      getCartDiscountAmount: () => {
        const { getSubtotal, cartDiscount, appliedPromotion } = get()
        const subtotalAfterItemDiscounts = Math.max(
          0,
          getSubtotal() - get().getItemDiscountAmount()
        )

        let discount = 0
        if (appliedPromotion) {
          if (appliedPromotion.discount_type === 'fixed') {
            discount = Number(appliedPromotion.discount_value || 0)
          } else if (appliedPromotion.discount_type === 'percentage') {
            discount =
              subtotalAfterItemDiscounts *
              (Number(appliedPromotion.discount_value || 0) / 100)
          }
        } else if (cartDiscount) {
          if (cartDiscount.type === 'fixed') {
            discount = cartDiscount.value
          } else if (cartDiscount.type === 'percentage') {
            discount =
              subtotalAfterItemDiscounts *
              (Math.min(100, cartDiscount.value) / 100)
          }
        }

        return Math.min(subtotalAfterItemDiscounts, discount)
      },

      getTotalDiscountAmount: () => {
        return get().getItemDiscountAmount() + get().getCartDiscountAmount()
      },

      getTaxAmount: () => {
        const { items, taxRates, getCartDiscountAmount, getSubtotal } = get()
        const itemTax = items.reduce((sum, item) => sum + item.taxAmount, 0)

        // If items already have explicit line-level tax amounts, use that
        if (itemTax > 0) {
          return itemTax
        }

        // Fallback to global tax rates if line items didn't compute individual taxes
        const subtotal = getSubtotal()
        const cartDiscount = getCartDiscountAmount()
        const taxable = Math.max(0, subtotal - cartDiscount)

        if (!taxRates || taxRates.length === 0) return 0

        let totalTax = 0
        taxRates.forEach((tax) => {
          const rate = Number(tax.rate)
          if (tax.is_inclusive) {
            totalTax += taxable - taxable / (1 + rate / 100)
          } else {
            totalTax += taxable * (rate / 100)
          }
        })

        return totalTax
      },

      getTotalAmount: () => {
        const { items, getSubtotal, getTotalDiscountAmount, taxRates } = get()

        const calculatedFromItems = items.reduce(
          (sum, item) => sum + item.total,
          0
        )
        const cartDiscount = get().getCartDiscountAmount()

        if (items.length > 0 && items.some((i) => (i.taxRate ?? 0) > 0)) {
          return Math.max(0, calculatedFromItems - cartDiscount)
        }

        const subtotal = getSubtotal()
        const totalDiscount = getTotalDiscountAmount()
        const taxable = Math.max(0, subtotal - totalDiscount)

        let exclusiveTax = 0
        if (taxRates) {
          taxRates.forEach((t) => {
            if (!t.is_inclusive) {
              exclusiveTax += (taxable * Number(t.rate)) / 100
            }
          })
        }

        return Math.max(0, taxable + exclusiveTax)
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'bluewave-pos-storage',
      partialize: (state) => ({
        terminal: state.terminal,
        session: state.session,
        heldOrders: state.heldOrders,
      }),
    }
  )
)
