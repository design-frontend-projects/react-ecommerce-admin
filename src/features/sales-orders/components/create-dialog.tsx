import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveVariantPrice } from '@/services/pricing/price-resolver'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Edit,
  Eye,
  FileText,
  Globe,
  Layers,
  Loader2,
  Minus,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  User,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  useChannelOptions,
  useCustomerOptions,
  useStoreOptions,
  useStoreWarehouses,
  useWarehouseOptions,
} from '@/hooks/use-inventory-lookups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'
import { useUomOptions } from '@/features/products/hooks/use-product-options'
import { useProducts } from '@/features/products/hooks/use-products'
import { useSettingsStore } from '@/features/settings/data/store'
import { useTaxRates } from '@/features/tax-rates/hooks/use-tax-rates'
import { createOrderInputSchema, type OrderListItem } from '../data/schema'
import {
  useCreateOrder,
  useOrder,
  useUpdateOrder,
} from '../hooks/use-sales-orders'
import {
  calculateLineTaxAmount,
  computeTaxPreview,
  extractTaxRate,
  getAvailableStock,
  getVariantStockSummary,
} from '../utils/variant-stock'
import { useWarehouseStockBalances } from '../hooks/use-warehouse-stock'
import {
  useChannelPriceLists,
  type ChannelPriceListRecord,
} from '../hooks/use-channel-price-lists'
import {
  SalesOrderReviewDialog,
  type SalesOrderDraftData,
  type SalesOrderDraftItem,
} from './review-dialog'
import {
  SOProductSelect,
  SOVariantSelect,
  type SOVariantOption,
  type SOVariantStockBalance,
} from './so-product-variant-picker'
import { SalesOrderStockLocationsSheet } from './so-stock-locations-sheet'

interface LineItemState {
  productId: string | null
  productVariantId: string
  uomId: string | null
  qty: string
  unitPrice: string
  discountAmount: string
  taxAmount: string
  priceListName?: string | null
  priceSource?:
    | 'customer_group'
    | 'channel'
    | 'store'
    | 'default'
    | 'fallback'
    | null
  isResolvingPrice?: boolean
}

const emptyItem: LineItemState = {
  productId: null,
  productVariantId: '',
  uomId: null,
  qty: '1',
  unitPrice: '',
  discountAmount: '0',
  taxAmount: '0',
  priceListName: null,
  priceSource: null,
  isResolvingPrice: false,
}

const WALK_IN = 'walk-in'

export function OrderCreateDialog({
  open,
  onOpenChange,
  orderToEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderToEdit?: OrderListItem | null
}) {
  const { t } = useTranslation()
  const tenantFavoriteCurrency = useSettingsStore(
    (s) => s.localization?.currency
  )
  const [storeId, setStoreId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [customerId, setCustomerId] = useState(WALK_IN)
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<
    string | null
  >(null)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemState[]>([{ ...emptyItem }])

  // Step navigation: 'setup' (Order Context & Channel Pricing) -> 'items' (Products & Pricing)
  const [activeStep, setActiveStep] = useState<'setup' | 'items'>('setup')

  // Review Draft State
  const [reviewOpen, setReviewOpen] = useState(false)
  const [draftData, setDraftData] = useState<SalesOrderDraftData | null>(null)

  // Multi-location Stock Sheet state
  const [stockLocationsTarget, setStockLocationsTarget] = useState<{
    productName: string
    variant: SOVariantOption
  } | null>(null)

  const { data: stores = [] } = useStoreOptions()
  const { data: allWarehouses = [] } = useWarehouseOptions()
  const { data: storeWarehouses = [], isLoading: isLoadingStoreWh } =
    useStoreWarehouses(storeId)
  const { data: channels = [] } = useChannelOptions()
  const { data: customers = [] } = useCustomerOptions()
  const { data: allProducts = [] } = useProducts()
  const { data: uoms = [] } = useUomOptions()
  const { data: currencies = [] } = useCurrencies({ onlyActive: true })
  const { data: taxRates = [] } = useTaxRates()

  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const isSubmitting = createOrder.isPending || updateOrder.isPending
  const { data: orderDetail } = useOrder(orderToEdit?.id)

  // 1. STRICT Store-Dependent Warehouses:
  // Render ONLY warehouses linked to the selected store via store_warehouses.
  // NO fallback to all warehouses from other stores.
  const availableWarehouses = useMemo(() => {
    if (!storeId) return []
    return storeWarehouses
  }, [storeId, storeWarehouses])

  // Automatically adjust selected warehouse when store changes or available warehouses load
  useEffect(() => {
    if (!storeId) {
      setWarehouseId('')
      return
    }
    if (availableWarehouses.length > 0) {
      const isCurrentWhValid = availableWarehouses.some(
        (w) => w.id === warehouseId
      )
      if (!isCurrentWhValid) {
        const defaultWh =
          availableWarehouses.find(
            (w) => Boolean(w.is_default) && w.allow_fulfillment !== false
          ) ||
          availableWarehouses.find((w) => Boolean(w.is_default)) ||
          availableWarehouses.find((w) => w.allow_fulfillment !== false) ||
          availableWarehouses[0]
        setWarehouseId(defaultWh?.id || '')
      }
    } else if (!isLoadingStoreWh) {
      setWarehouseId('')
    }
  }, [storeId, availableWarehouses, warehouseId, isLoadingStoreWh])

  // Effective warehouse ID
  const effectiveWarehouseId = useMemo(() => {
    if (!storeId) return ''
    if (warehouseId && availableWarehouses.some((w) => w.id === warehouseId)) {
      return warehouseId
    }
    const defaultWh =
      availableWarehouses.find(
        (w) => Boolean(w.is_default) && w.allow_fulfillment !== false
      ) ||
      availableWarehouses.find((w) => Boolean(w.is_default)) ||
      availableWarehouses.find((w) => w.allow_fulfillment !== false) ||
      availableWarehouses[0]
    return defaultWh?.id || ''
  }, [storeId, warehouseId, availableWarehouses])

  const effectiveWarehouse = useMemo(() => {
    return (
      availableWarehouses.find((w) => w.id === effectiveWarehouseId) || null
    )
  }, [availableWarehouses, effectiveWarehouseId])

  const effectiveWarehouseName = effectiveWarehouse?.name || null

  const linkedWhIds = useMemo(
    () => availableWarehouses.map((w) => w.id),
    [availableWarehouses]
  )

  // Live stock balances from stock_balances table for the selected store and fulfillment warehouse(s)
  const {
    stockBalances: liveStockBalances,
    variantStockMap,
    getStockForWarehouse,
    getStoreStock,
    isLoading: isLoadingLiveStock,
  } = useWarehouseStockBalances({
    storeId,
    warehouseId: effectiveWarehouseId,
    warehouseIds: linkedWhIds,
    enabled: Boolean(storeId),
  })

  // 2. Products related to the selected store:
  // - If no store selected: empty / prompt select store.
  // - If store selected:
  //   1) Products assigned to this store: p.store_id === storeId
  //   2) Tenant global products (!p.store_id), provided they don't belong to another store.
  //   3) Products having stock in this store or any of this store's linked warehouses.
  const filteredProducts = useMemo(() => {
    if (!storeId) return []

    const linkedWhIds = new Set(availableWarehouses.map((w) => w.id))

    const matches = allProducts.filter((p) => {
      // Exclude products explicitly assigned to another store
      if (p.store_id && p.store_id !== storeId) {
        return false
      }

      // If directly assigned to this store
      if (p.store_id === storeId) {
        return true
      }

      // Check if any variant has stock in this store or in any of this store's warehouses
      const hasStoreStock = (p.product_variants || []).some((v) => {
        const live = variantStockMap.get(String(v.id))
        if (live && live.available > 0) return true

        const balances =
          (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances ||
          []
        return balances.some(
          (b) =>
            b.store_id === storeId ||
            (b.warehouse_id && linkedWhIds.has(b.warehouse_id))
        )
      })

      // Include global products or products with stock in this store ecosystem
      return !p.store_id || hasStoreStock
    })

    // Sort: products with positive available stock in effectiveWarehouseId prioritized first
    return matches.sort((a, b) => {
      const aVars = a.product_variants || []
      const bVars = b.product_variants || []

      const aStock = aVars.reduce((sum, v) => {
        const live = variantStockMap.get(String(v.id))
        if (live) return sum + live.available
        const balances =
          (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances ||
          []
        const whBalances = effectiveWarehouseId
          ? balances.filter((b) => b.warehouse_id === effectiveWarehouseId)
          : balances
        return (
          sum +
          whBalances.reduce(
            (s, b) =>
              s +
              Number(
                b.qty_available ??
                  (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
              ),
            0
          )
        )
      }, 0)

      const bStock = bVars.reduce((sum, v) => {
        const live = variantStockMap.get(String(v.id))
        if (live) return sum + live.available
        const balances =
          (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances ||
          []
        const whBalances = effectiveWarehouseId
          ? balances.filter((b) => b.warehouse_id === effectiveWarehouseId)
          : balances
        return (
          sum +
          whBalances.reduce(
            (s, b) =>
              s +
              Number(
                b.qty_available ??
                  (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))
              ),
            0
          )
        )
      }, 0)

      if (aStock > 0 && bStock <= 0) return -1
      if (aStock <= 0 && bStock > 0) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [storeId, allProducts, availableWarehouses, effectiveWarehouseId, variantStockMap])

  // Populate form if in edit mode
  useEffect(() => {
    if (!open) return

    if (orderToEdit) {
      setActiveStep('items')
      const current = orderDetail ?? orderToEdit
      const orderStoreId = current.store_id || current.stores?.store_id || ''
      setStoreId(orderStoreId)
      setWarehouseId(current.warehouse_id || current.warehouses?.id || '')
      setChannelId(current.channel_id || current.channels?.id || '')
      setCustomerId(current.customer_id || current.customers?.id || WALK_IN)
      setUserSelectedCurrency(current.currency || null)
      setExpectedDate(
        current.expected_date ? current.expected_date.slice(0, 10) : ''
      )
      setNotes(current.notes || '')

      if (
        orderDetail?.sales_order_items &&
        orderDetail.sales_order_items.length > 0
      ) {
        setItems(
          orderDetail.sales_order_items.map((it) => ({
            productId: it.product_variants?.products?.id || null,
            productVariantId: it.product_variant_id,
            uomId: it.uom_id || '',
            qty: String(it.qty_ordered),
            unitPrice: String(it.unit_price),
            discountAmount: String(it.discount_amount || '0'),
            taxAmount: String(it.tax_amount || '0'),
            priceListName: null,
            priceSource: 'fallback' as const,
            isResolvingPrice: false,
          }))
        )
      }
    }
  }, [open, orderToEdit, orderDetail])

  // Currency resolution
  const activeCurrencies = useMemo(() => {
    return (currencies || []).filter((c) => c.is_active !== false)
  }, [currencies])

  const preferredDefaultCurrency = useMemo(() => {
    if (
      tenantFavoriteCurrency &&
      activeCurrencies.some((c) => c.code === tenantFavoriteCurrency)
    ) {
      return tenantFavoriteCurrency
    }
    if (activeCurrencies.length > 0) {
      return activeCurrencies[0].code
    }
    return 'USD'
  }, [tenantFavoriteCurrency, activeCurrencies])

  const currency = userSelectedCurrency ?? preferredDefaultCurrency
  const setCurrency = (val: string | null) => setUserSelectedCurrency(val)

  const selectedCurrencyObj = useMemo(() => {
    return activeCurrencies.find((c) => c.code === currency) ?? null
  }, [activeCurrencies, currency])

  const currencySymbol = selectedCurrencyObj?.symbol || currency || '$'

  const selectedCustomer = useMemo(() => {
    if (!customerId || customerId === WALK_IN) return null
    return customers.find((c) => c.id === customerId) ?? null
  }, [customers, customerId])

  const customerGroupId = selectedCustomer?.group_id ?? null

  // Channel-to-Price-List Resolution Engine
  const {
    allPriceLists = [],
    channelRelatedPriceLists,
    storeFallbackPriceLists,
    bestMatchedPriceList,
    activePriceList,
    selectedPriceListId,
    setSelectedPriceListId,
    variantPriceMap,
    isLoading: isLoadingPriceLists,
    refetch: refetchPriceLists,
    hasChannelSpecificPriceList,
  } = useChannelPriceLists({
    channelId: channelId || null,
    storeId: storeId || null,
    customerGroupId,
    currencyId: selectedCurrencyObj?.id || null,
    enabled: open,
  })

  // 3. Variant Stock & Pricing: Contextual stock per store / fulfillment warehouse & Channel Price List
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, SOVariantOption[]>()

    for (const p of allProducts) {
      const pId = String(p.id ?? p.product_id ?? '')
      const vars: SOVariantOption[] = (p.product_variants || []).map((v) => {
        const vIdStr = String(v.id)
        const channelPricing = variantPriceMap.get(vIdStr)

        const pli = (
          v as {
            price_list_items?: Array<{
              price: number | string
              cost_price?: number | string | null
            }>
          }
        ).price_list_items

        const resolvedPrice =
          channelPricing?.price !== undefined
            ? channelPricing.price
            : pli && pli.length > 0
              ? Number(pli[0].price)
              : Number((v as { price?: number }).price || 0)

        const resolvedCost =
          channelPricing?.costPrice !== undefined && channelPricing.costPrice !== null
            ? channelPricing.costPrice
            : pli && pli.length > 0 && pli[0].cost_price != null
              ? Number(pli[0].cost_price)
              : (v as { cost_price?: number | null }).cost_price
                ? Number((v as { cost_price?: number | null }).cost_price)
                : null

        const rawBalances =
          (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances || []

        // Merge live balances from stock_balances table if fetched
        const liveBalancesForVariant = liveStockBalances.filter(
          (b) =>
            (b as { product_variant_id?: string }).product_variant_id === String(v.id)
        )
        const balances =
          liveBalancesForVariant.length > 0 ? liveBalancesForVariant : rawBalances

        // Get exact live summary for this variant in the current warehouse/store
        const liveEntry = variantStockMap.get(String(v.id))
        const stockSummary = liveEntry
          ? {
              onHand: liveEntry.onHand,
              reserved: liveEntry.reserved,
              available: liveEntry.available,
            }
          : getVariantStockSummary(
              {
                id: String(v.id),
                sku: v.sku,
                stock_balances: balances,
                stock_quantity: Number(
                  (v as { stock_quantity?: number }).stock_quantity ?? 0
                ),
              } as SOVariantOption,
              effectiveWarehouseId,
              storeId
            )

        return {
          id: String(v.id),
          sku: v.sku,
          name: v.name,
          price: resolvedPrice,
          cost_price: resolvedCost,
          stock_quantity: Math.max(0, stockSummary.available),
          qty_on_hand: Math.max(0, stockSummary.onHand),
          qty_reserved: Math.max(0, stockSummary.reserved),
          qty_available: Math.max(0, stockSummary.available),
          uom_id: v.uom_id || (p.base_uom_id ? String(p.base_uom_id) : null),
          stock_balances: balances,
          priceListName:
            channelPricing?.priceListName || activePriceList?.name || null,
          priceSource:
            channelPricing?.source || (channelId ? 'channel' : 'store'),
        }
      })
      map.set(pId, vars)
    }
    return map
  }, [
    allProducts,
    storeId,
    effectiveWarehouseId,
    availableWarehouses,
    liveStockBalances,
    variantStockMap,
    variantPriceMap,
    activePriceList?.name,
    channelId,
  ])

  const reset = () => {
    setStoreId('')
    setWarehouseId('')
    setChannelId('')
    setCustomerId(WALK_IN)
    setUserSelectedCurrency(null)
    setExpectedDate('')
    setNotes('')
    setItems([{ ...emptyItem }])
    setDraftData(null)
    setReviewOpen(false)
    setStockLocationsTarget(null)
    setActiveStep('setup')
  }

  const updateItem = (index: number, patch: Partial<LineItemState>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  // Dynamic Price Checking from precomputed channel map or fallback to price_list_items
  const resolvePriceForVariant = useCallback(
    async (variantId: string, fallbackPrice: number) => {
      // Fast synchronous resolution from active channel price list map
      const precomputed = variantPriceMap.get(variantId)
      if (precomputed) {
        return {
          price: precomputed.price,
          priceListName: precomputed.priceListName,
          source: precomputed.source,
        }
      }

      try {
        const res = await resolveVariantPrice(supabase, {
          variantId,
          storeId: storeId || null,
          customerGroupId: customerGroupId || null,
          channelId: channelId || null,
          currencyId: selectedCurrencyObj?.id || null,
          fallbackPrice,
        })
        return {
          price: res.price,
          priceListName: res.priceListName,
          source: res.source,
        }
      } catch {
        return {
          price: fallbackPrice,
          priceListName: null,
          source: 'fallback' as const,
        }
      }
    },
    [variantPriceMap, storeId, customerGroupId, channelId, selectedCurrencyObj]
  )

  // 5. Automatic Tax Calculation helper
  const computeAutoTax = useCallback(
    (
      productId: string | null,
      qtyStr: string,
      unitPriceStr: string,
      discountStr: string
    ): string => {
      if (!productId) return '0'
      const product = allProducts.find(
        (p) => String(p.id ?? p.product_id) === productId
      )
      const taxRes = extractTaxRate(product, taxRates)
      if (taxRes.taxRate > 0) {
        const q = Number(qtyStr) || 0
        const p = Number(unitPriceStr) || 0
        const d = Number(discountStr) || 0
        const auto = calculateLineTaxAmount(q, p, d, taxRes.taxRate)
        return String(auto)
      }
      return '0'
    },
    [allProducts, taxRates]
  )

  // Handle product selection: auto selects first variant, resolves price, and auto-calculates tax
  const handleSelectProduct = async (index: number, pId: string) => {
    const pVariants = variantsByProductId.get(pId) ?? []
    const firstVariant = pVariants[0]
    const product = allProducts.find(
      (p) => String(p.id ?? p.product_id) === pId
    )
    const taxRes = extractTaxRate(product, taxRates)

    if (!firstVariant) {
      updateItem(index, {
        productId: pId,
        productVariantId: '',
        unitPrice: '0',
        uomId: '',
        discountAmount: '0',
        taxAmount: '0',
        priceListName: null,
        priceSource: 'fallback',
        isResolvingPrice: false,
      })
      return
    }

    updateItem(index, {
      productId: pId,
      productVariantId: firstVariant.id,
      uomId: firstVariant.uom_id ?? '',
      isResolvingPrice: true,
    })

    const fallbackPrice = firstVariant.price ?? 0
    const resolved = await resolvePriceForVariant(
      firstVariant.id,
      fallbackPrice
    )
    const currentQty = Number(items[index]?.qty) || 1
    const currentDiscount = Number(items[index]?.discountAmount) || 0
    const autoTax =
      taxRes.taxRate > 0
        ? calculateLineTaxAmount(
            currentQty,
            resolved.price,
            currentDiscount,
            taxRes.taxRate
          )
        : 0

    updateItem(index, {
      unitPrice: String(resolved.price),
      taxAmount: String(autoTax),
      priceListName: resolved.priceListName,
      priceSource: resolved.source,
      isResolvingPrice: false,
    })
  }

  // Handle variant selection: resolves price and auto-computes tax
  const handleSelectVariant = async (
    index: number,
    variantId: string,
    variantPrice?: number,
    uomId?: string | null
  ) => {
    const item = items[index]
    const product = item?.productId
      ? allProducts.find((p) => String(p.id ?? p.product_id) === item.productId)
      : null
    const taxRes = extractTaxRate(product, taxRates)

    updateItem(index, {
      productVariantId: variantId,
      ...(uomId !== undefined ? { uomId: uomId ?? '' } : {}),
      isResolvingPrice: true,
    })

    const fallbackPrice = variantPrice ?? 0
    const resolved = await resolvePriceForVariant(variantId, fallbackPrice)
    const currentQty = Number(item?.qty) || 1
    const currentDiscount = Number(item?.discountAmount) || 0
    const autoTax =
      taxRes.taxRate > 0
        ? calculateLineTaxAmount(
            currentQty,
            resolved.price,
            currentDiscount,
            taxRes.taxRate
          )
        : Number(item?.taxAmount || 0)

    updateItem(index, {
      unitPrice: String(resolved.price),
      taxAmount: String(autoTax),
      priceListName: resolved.priceListName,
      priceSource: resolved.source,
      isResolvingPrice: false,
    })
  }

  // Handle changes to quantity, price, or discount with live tax update
  const handleQtyChange = (index: number, newQty: string) => {
    const item = items[index]
    const autoTax = computeAutoTax(
      item.productId,
      newQty,
      item.unitPrice,
      item.discountAmount
    )
    updateItem(index, { qty: newQty, taxAmount: autoTax })
  }

  const handleUnitPriceChange = (index: number, newPrice: string) => {
    const item = items[index]
    const autoTax = computeAutoTax(
      item.productId,
      item.qty,
      newPrice,
      item.discountAmount
    )
    updateItem(index, { unitPrice: newPrice, taxAmount: autoTax })
  }

  const handleDiscountChange = (index: number, newDiscount: string) => {
    const item = items[index]
    const autoTax = computeAutoTax(
      item.productId,
      item.qty,
      item.unitPrice,
      newDiscount
    )
    updateItem(index, { discountAmount: newDiscount, taxAmount: autoTax })
  }

  const handleStepQty = (index: number, delta: number) => {
    const item = items[index]
    const current = Math.max(1, Math.floor(Number(item?.qty || 1)))
    const next = Math.max(1, current + delta)
    handleQtyChange(index, String(next))
  }

  // Manual / Explicit Price Refresh function for line items
  const refreshLineItemPrices = useCallback(
    (targetPriceList?: ChannelPriceListRecord | null) => {
      const plToUse =
        targetPriceList !== undefined ? targetPriceList : activePriceList
      let updatedCount = 0

      setItems((prev) =>
        prev.map((item) => {
          if (!item.productVariantId) return item
          const pricing = variantPriceMap.get(item.productVariantId)
          if (!pricing) return item

          const product = item.productId
            ? allProducts.find(
                (p) => String(p.id ?? p.product_id) === item.productId
              )
            : null
          const taxRes = extractTaxRate(product, taxRates)
          const newPrice = pricing.price
          const currentQty = Number(item.qty) || 1
          const currentDiscount = Number(item.discountAmount) || 0
          const autoTax =
            taxRes.taxRate > 0
              ? calculateLineTaxAmount(
                  currentQty,
                  newPrice,
                  currentDiscount,
                  taxRes.taxRate
                )
              : Number(item.taxAmount || 0)

          if (Number(item.unitPrice) !== newPrice) {
            updatedCount++
          }

          return {
            ...item,
            unitPrice: String(newPrice),
            taxAmount: String(autoTax),
            priceListName: pricing.priceListName || plToUse?.name || null,
            priceSource: pricing.source,
          }
        })
      )

      if (updatedCount > 0) {
        toast.info(
          t(
            'salesOrders.pricing.pricesRefreshed',
            'Refreshed {{count}} item price(s) according to "{{priceList}}"',
            {
              count: updatedCount,
              priceList:
                plToUse?.name ||
                t('salesOrders.pricing.activePriceList', 'Active Price List'),
            }
          )
        )
      } else {
        toast.success(
          t(
            'salesOrders.pricing.pricesUpToDate',
            'All product prices are up to date for "{{priceList}}"',
            {
              priceList:
                plToUse?.name ||
                t('salesOrders.pricing.activePriceList', 'Active Price List'),
            }
          )
        )
      }
    },
    [activePriceList, variantPriceMap, allProducts, taxRates, t]
  )

  // Keep a ref to latest items to re-evaluate prices safely when store/customer/currency changes
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    let isMounted = true
    const currentItems = itemsRef.current
    const itemsWithVariants = currentItems.filter((i) => i.productVariantId)
    if (itemsWithVariants.length === 0) return

    const reevaluatePrices = async () => {
      const updated = await Promise.all(
        currentItems.map(async (item) => {
          if (!item.productVariantId) return item
          const pVariants = item.productId
            ? variantsByProductId.get(item.productId)
            : []
          const variant = pVariants?.find((v) => v.id === item.productVariantId)
          const fallback = variant?.price ?? (Number(item.unitPrice) || 0)

          const res = await resolvePriceForVariant(
            item.productVariantId,
            fallback
          )
          const product = item.productId
            ? allProducts.find(
                (p) => String(p.id ?? p.product_id) === item.productId
              )
            : null
          const taxRes = extractTaxRate(product, taxRates)
          const autoTax =
            taxRes.taxRate > 0
              ? calculateLineTaxAmount(
                  Number(item.qty) || 0,
                  res.price,
                  Number(item.discountAmount) || 0,
                  taxRes.taxRate
                )
              : Number(item.taxAmount || 0)

          return {
            ...item,
            unitPrice: String(res.price),
            taxAmount: String(autoTax),
            priceListName: res.priceListName,
            priceSource: res.source,
            isResolvingPrice: false,
          }
        })
      )

      if (isMounted) {
        setItems(updated)
      }
    }

    void reevaluatePrices()

    return () => {
      isMounted = false
    }
  }, [resolvePriceForVariant, variantsByProductId, allProducts, taxRates])

  // Live financial calculations
  const subtotal = items.reduce((sum, item) => {
    const q = Number(item.qty) || 0
    const p = Number(item.unitPrice) || 0
    return sum + q * p
  }, 0)

  const totalDiscount = items.reduce((sum, item) => {
    return sum + (Number(item.discountAmount) || 0)
  }, 0)

  const totalTax = items.reduce((sum, item) => {
    return sum + (Number(item.taxAmount) || 0)
  }, 0)

  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax)

  // Construct draft data for review modal or direct submit
  const buildDraftData = (): SalesOrderDraftData | null => {
    const selectedStore = stores.find((s) => s.store_id === storeId)
    const selectedWh = allWarehouses.find((w) => w.id === warehouseId)
    const selectedCust = customers.find((c) => c.id === customerId)
    const selectedChannel = channels.find((c) => c.id === channelId)

    const compiledItems: SalesOrderDraftItem[] = items
      .filter((i) => i.productVariantId && Number(i.qty) > 0)
      .map((i) => {
        const product = allProducts.find(
          (p) => String(p.id ?? p.product_id) === i.productId
        )
        const variantList = i.productId
          ? variantsByProductId.get(i.productId)
          : []
        const variant = variantList?.find((v) => v.id === i.productVariantId)
        const uom = uoms.find((u) => u.id === i.uomId)

        const q = Number(i.qty) || 0
        const p = Number(i.unitPrice) || 0
        const d = Number(i.discountAmount) || 0
        const tax = Number(i.taxAmount) || 0
        const lineTotal = Math.max(0, q * p - d + tax)

        return {
          productId: i.productId,
          productName: product?.name || 'Product',
          productSku: product?.sku,
          variantId: i.productVariantId,
          variantSku: variant?.sku || 'Default SKU',
          variantLabel: variant?.name || undefined,
          uomId: i.uomId,
          uomName: uom?.name,
          uomCode: uom?.code,
          quantity: q,
          unitPrice: p,
          discountAmount: d,
          taxAmount: tax,
          subtotal: lineTotal,
        }
      })

    if (compiledItems.length === 0) {
      toast.error(
        t(
          'salesOrders.createDialog.itemRequiredError',
          'Please add at least one line item with valid product and quantity.'
        )
      )
      return null
    }

    // Check if any items exceed available stock
    for (const i of items) {
      if (i.productVariantId && Number(i.qty) > 0) {
        const variantList = i.productId
          ? variantsByProductId.get(i.productId)
          : []
        const variant = variantList?.find((v) => v.id === i.productVariantId)
        if (variant) {
          const stock = getVariantStockSummary(
            variant,
            effectiveWarehouseId,
            storeId
          )
          if (Number(i.qty) > stock.available) {
            toast.error(
              t(
                'salesOrders.createDialog.stockExceededBlock',
                'Item "{{sku}}" exceeds available stock in {{warehouse}}. Requested: {{qty}}, Available: {{avail}} ({{onHand}} on hand).',
                {
                  sku: variant.sku,
                  warehouse: effectiveWarehouseName || 'the selected warehouse',
                  qty: Number(i.qty),
                  avail: stock.available,
                  onHand: stock.onHand,
                }
              )
            )
            return null
          }
        }
      }
    }

    return {
      orderNumber: orderToEdit?.order_number || 'DRAFT-PREVIEW',
      storeName: selectedStore?.name || 'Store',
      storeId,
      warehouseName: selectedWh?.name,
      warehouseId: effectiveWarehouseId || null,
      channelName: selectedChannel?.name || null,
      channelId: channelId || null,
      priceListName: activePriceList?.name || null,
      customerName: selectedCust
        ? [selectedCust.first_name, selectedCust.last_name]
            .filter(Boolean)
            .join(' ')
        : t('salesOrders.form.walkInCustomer', 'Walk-in Customer'),
      customerId: customerId === WALK_IN ? null : customerId,
      customerPhone: selectedCust?.phone,
      customerCode: selectedCust?.code,
      orderDate: new Date().toISOString(),
      expectedDate: expectedDate || null,
      currency,
      notes: notes || null,
      items: compiledItems,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      totalAmount: grandTotal,
    }
  }

  const handleAddItem = () => {
    const lastItem = items[items.length - 1]
    if (lastItem) {
      const hasProduct = Boolean(lastItem.productId)
      const hasVariant = Boolean(lastItem.productVariantId)
      const hasQty = Number(lastItem.qty) > 0

      if (!hasProduct || !hasVariant || !hasQty) {
        toast.error(
          t(
            'salesOrders.createDialog.completeCurrentRowFirst',
            'Please complete the current row first before adding a new item.'
          )
        )
        return
      }

      const itemVariants = lastItem.productId
        ? (variantsByProductId.get(lastItem.productId) ?? [])
        : []
      const selectedVariant = itemVariants.find(
        (v) => v.id === lastItem.productVariantId
      )
      if (selectedVariant) {
        const stock = getVariantStockSummary(
          selectedVariant,
          effectiveWarehouseId,
          storeId
        )
        if (Number(lastItem.qty) > stock.available) {
          toast.error(
            t(
              'salesOrders.createDialog.rowStockExceededToast',
              'The quantity entered exceeds available stock ({{available}} available, {{onHand}} on hand). Please adjust quantity before adding more items.',
              { available: stock.available, onHand: stock.onHand }
            )
          )
          return
        }
      }
    }
    setItems((prev) => [...prev, { ...emptyItem }])
  }

  const handleOpenReview = () => {
    if (!storeId) {
      toast.error(
        t(
          'salesOrders.createDialog.selectStoreFirst',
          'Please select a store first.'
        )
      )
      return
    }
    const draft = buildDraftData()
    if (!draft) return
    setDraftData(draft)
    setReviewOpen(true)
  }

  const handleExecuteCreate = async () => {
    if (!storeId) {
      toast.error(
        t(
          'salesOrders.createDialog.selectStoreFirst',
          'Please select a store first.'
        )
      )
      return
    }

    // Check if any items exceed available stock
    for (const item of items) {
      if (item.productVariantId && Number(item.qty) > 0) {
        const variantList = item.productId
          ? variantsByProductId.get(item.productId)
          : []
        const variant = variantList?.find((v) => v.id === item.productVariantId)
        if (variant) {
          const stock = getVariantStockSummary(
            variant,
            effectiveWarehouseId,
            storeId
          )
          if (Number(item.qty) > stock.available) {
            toast.error(
              t(
                'salesOrders.createDialog.stockExceededBlock',
                'Item "{{sku}}" exceeds available stock in {{warehouse}}. Requested: {{qty}}, Available: {{avail}} ({{onHand}} on hand).',
                {
                  sku: variant.sku || 'Item',
                  qty: Number(item.qty),
                  avail: stock.available,
                  onHand: stock.onHand,
                  warehouse: effectiveWarehouseName || 'the selected warehouse',
                }
              )
            )
            return null
          }
        }
      }
    }

    const validItems = items
      .filter((item) => item.productVariantId && Number(item.qty) > 0)
      .map((item) => ({
        productVariantId: item.productVariantId,
        qtyOrdered: Number(item.qty),
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        uomId: item.uomId || null,
      }))

    const parsed = createOrderInputSchema.safeParse({
      storeId,
      warehouseId: effectiveWarehouseId || undefined,
      channelId: channelId || undefined,
      customerId: customerId === WALK_IN ? undefined : customerId,
      currency,
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      items: validItems,
    })

    if (!parsed.success) {
      toast.error(
        t(
          'salesOrders.createDialog.fixFormError',
          'Please fix the sales order form'
        ),
        {
          description: parsed.error.issues[0]?.message ?? 'Invalid input.',
        }
      )
      return
    }

    try {
      if (orderToEdit?.id) {
        await updateOrder.mutateAsync({
          id: orderToEdit.id,
          input: parsed.data,
        })
      } else {
        await createOrder.mutateAsync(parsed.data)
      }
      reset()
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) reset()
          onOpenChange(value)
        }}
      >
        <DialogContent
          className='flex h-[92vh] max-h-[92vh] max-w-full flex-col overflow-hidden p-0 shadow-2xl sm:max-w-4xl lg:max-w-5xl'
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <DialogHeader className='flex shrink-0 flex-row items-center justify-between space-y-0 border-b bg-muted/20 p-4 pb-4 sm:p-5'>
            <div className='flex items-center gap-3'>
              <div className='rounded-xl bg-primary/10 p-2.5 text-primary'>
                {orderToEdit ? (
                  <Edit className='h-5 w-5' />
                ) : (
                  <FileText className='h-5 w-5' />
                )}
              </div>
              <div>
                <DialogTitle className='flex items-center gap-2 text-lg font-bold sm:text-xl'>
                  <span>
                    {orderToEdit
                      ? t(
                          'salesOrders.createDialog.editTitle',
                          'Edit Sales Order'
                        )
                      : t('salesOrders.createDialog.title', 'New Sales Order')}
                  </span>
                  {orderToEdit?.order_number && (
                    <Badge
                      variant='outline'
                      className='font-mono text-xs font-normal'
                    >
                      #{orderToEdit.order_number}
                    </Badge>
                  )}
                  <Badge
                    variant='secondary'
                    className='text-[10px] font-semibold tracking-wider uppercase'
                  >
                    {t('salesOrders.badges.draft', 'Draft')}
                  </Badge>
                </DialogTitle>
                <DialogDescription className='mt-0.5 text-xs text-muted-foreground'>
                  {orderToEdit
                    ? t(
                        'salesOrders.createDialog.editDesc',
                        'Update sales order items, quantities, or fulfillment details.'
                      )
                    : t(
                        'salesOrders.createDialog.desc',
                        'Create a sales order draft with real customer, fulfillment location, and line items.'
                      )}
                </DialogDescription>
              </div>
            </div>

            <div className='hidden items-center gap-2 text-xs text-muted-foreground sm:flex'>
              <span className='font-mono font-medium'>
                {items.filter((i) => i.productVariantId).length}{' '}
                {t('salesOrders.form.items', 'items')}
              </span>
              <span>•</span>
              <span className='font-mono font-bold text-foreground'>
                {currencySymbol}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </DialogHeader>

          {/* Visual Workflow Steps (Step 1: Setup & Channel Pricing -> Step 2: Products & Line Items) */}
          <div className='flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 sm:px-6 py-2.5'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <button
                type='button'
                onClick={() => setActiveStep('setup')}
                className={cn(
                  'flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                  activeStep === 'setup'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                    activeStep === 'setup'
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-muted-foreground/20'
                  )}
                >
                  1
                </span>
                <span>{t('salesOrders.steps.setup', '1. Setup & Channel Pricing')}</span>
              </button>

              <ArrowRight className='h-3.5 w-3.5 text-muted-foreground/50' />

              <button
                type='button'
                onClick={() => {
                  if (!storeId) {
                    toast.error(
                      t(
                        'salesOrders.createDialog.selectStoreFirst',
                        'Please select a store first.'
                      )
                    )
                    return
                  }
                  setActiveStep('items')
                }}
                className={cn(
                  'flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                  activeStep === 'items'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  !storeId && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                    activeStep === 'items'
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-muted-foreground/20'
                  )}
                >
                  2
                </span>
                <div className='flex items-center gap-1.5'>
                  <span>{t('salesOrders.steps.products', '2. Products & Line Items')}</span>
                  {items.filter((i) => i.productVariantId).length > 0 && (
                    <Badge variant='secondary' className='h-4 px-1 text-[10px] font-mono'>
                      {items.filter((i) => i.productVariantId).length}
                    </Badge>
                  )}
                </div>
              </button>
            </div>

            {/* Quick Price List indicator in Step Bar */}
            {activePriceList && (
              <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <Tag className='h-3.5 w-3.5 text-primary shrink-0' />
                <span className='font-medium text-foreground truncate max-w-[220px]'>
                  {activePriceList.name}
                </span>
                {hasChannelSpecificPriceList && (
                  <Badge variant='outline' className='h-4 border-emerald-500/30 bg-emerald-500/10 text-[9px] font-mono text-emerald-600 dark:text-emerald-400'>
                    {t('salesOrders.pricing.channelMatchedShort', 'Channel')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Body Content - Reliable, Bounded Smooth Scroll Container */}
          <div className='min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6'>
            {activeStep === 'setup' ? (
              <div className='space-y-6 animate-in fade-in-50 duration-200'>
                {/* Order Context Card (Store, Fulfillment Warehouse, Customer, Channel, Currency, Date, Price List) */}
                <div className='space-y-4 rounded-xl border bg-card/60 p-4 shadow-xs'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <span className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                    <Building2 className='h-3.5 w-3.5 text-primary' />
                    {t(
                      'salesOrders.form.fulfillmentAndCustomer',
                      'Fulfillment & Customer Information'
                    )}
                  </span>
                  {!storeId && (
                    <span className='flex animate-pulse items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400'>
                      <AlertCircle className='h-3 w-3' />
                      {t(
                        'salesOrders.form.startBySelectingStore',
                        'Start by selecting a store'
                      )}
                    </span>
                  )}
                </div>

                <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3'>
                  {/* 1. Store Select */}
                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                      <Building2 className='h-3.5 w-3.5 text-primary' />{' '}
                      {t('salesOrders.form.store', 'Store *')}
                    </Label>
                    <Select
                      value={storeId}
                      onValueChange={(val) => {
                        setStoreId(val)
                        setWarehouseId('')
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9 text-xs sm:text-sm',
                          !storeId && 'border-primary/50 ring-1 ring-primary/20'
                        )}
                      >
                        <SelectValue
                          placeholder={t(
                            'salesOrders.form.selectStore',
                            'Select store...'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem
                            key={store.store_id}
                            value={store.store_id}
                          >
                            <div className='flex items-center gap-2'>
                              <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                              <span>{store.name ?? store.store_id}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Fulfillment Warehouse (All warehouses related to selected store) */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                        <Warehouse className='h-3.5 w-3.5 text-primary' />{' '}
                        {t(
                          'salesOrders.form.warehouse',
                          'Fulfillment Warehouse *'
                        )}
                      </Label>
                      {storeId && availableWarehouses.length > 0 && (
                        <span className='text-[10px] font-medium text-muted-foreground'>
                          {availableWarehouses.length}{' '}
                          {t('salesOrders.form.linkedWhCount', 'related')}
                        </span>
                      )}
                    </div>
                    <Select
                      value={effectiveWarehouseId}
                      onValueChange={setWarehouseId}
                      disabled={!storeId || availableWarehouses.length === 0}
                    >
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue
                          placeholder={
                            !storeId
                              ? t(
                                  'salesOrders.createDialog.selectStoreFirst',
                                  'Select store first...'
                                )
                              : t(
                                  'salesOrders.form.defaultWarehouse',
                                  'Select related warehouse...'
                                )
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWarehouses.map((wh) => {
                          const activeVariantId = items.find((it) => it.productVariantId)?.productVariantId
                          const whVariantStock = activeVariantId
                            ? getStockForWarehouse(activeVariantId, wh.id)
                            : null

                          return (
                            <SelectItem key={wh.id} value={wh.id}>
                              <div className='flex w-full items-center justify-between gap-2'>
                                <div className='flex items-center gap-1.5 truncate'>
                                  <span className='font-medium'>{wh.name}</span>
                                  {wh.code && (
                                    <span className='font-mono text-[11px] text-muted-foreground'>
                                      ({wh.code})
                                    </span>
                                  )}
                                </div>
                                <div className='flex shrink-0 items-center gap-1.5'>
                                  {whVariantStock && (
                                    <Badge
                                      variant={whVariantStock.available > 0 ? 'outline' : 'secondary'}
                                      className={cn(
                                        'h-4 px-1 text-[9px] font-mono',
                                        whVariantStock.available > 0
                                          ? 'text-emerald-600 border-emerald-500/30'
                                          : 'text-muted-foreground'
                                      )}
                                    >
                                      {whVariantStock.available.toLocaleString()} avail.
                                    </Badge>
                                  )}
                                  {wh.allow_fulfillment === false && (
                                    <Badge
                                      variant='outline'
                                      className='h-4 border-amber-300 px-1 text-[9px] text-amber-600 dark:border-amber-700'
                                    >
                                      {t(
                                        'salesOrders.form.noFulfillment',
                                        'No Fulfillment'
                                      )}
                                    </Badge>
                                  )}
                                  {Boolean(wh.is_default) && (
                                    <Badge
                                      variant='secondary'
                                      className='h-4 border-primary/20 bg-primary/10 px-1 text-[9px] text-primary'
                                    >
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {storeId &&
                      availableWarehouses.length === 0 &&
                      !isLoadingStoreWh && (
                        <p className='mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400'>
                          <AlertCircle className='h-3 w-3 shrink-0' />
                          {t(
                            'salesOrders.createDialog.noLinkedWarehouses',
                            'No warehouses related to this store.'
                          )}
                        </p>
                      )}
                  </div>

                  {/* 3. Customer Select */}
                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                      <User className='h-3.5 w-3.5 text-primary' />{' '}
                      {t('salesOrders.form.customer', 'Customer')}
                    </Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue
                          placeholder={t(
                            'salesOrders.form.selectCustomer',
                            'Select customer...'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        <SelectItem value={WALK_IN}>
                          <div className='flex items-center gap-1.5 font-medium'>
                            <User className='h-3.5 w-3.5 text-muted-foreground' />
                            <span>
                              {t(
                                'salesOrders.form.walkInCustomer',
                                'Walk-in Customer'
                              )}
                            </span>
                          </div>
                        </SelectItem>
                        {customers.map((c) => {
                          const name = [c.first_name, c.last_name]
                            .filter(Boolean)
                            .join(' ')
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              <div className='flex items-center gap-1.5'>
                                <span>{name || c.id}</span>
                                {c.phone && (
                                  <span className='text-[11px] text-muted-foreground'>
                                    ({c.phone})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Sales Channel */}
                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                      <Globe className='h-3.5 w-3.5 text-primary' />{' '}
                      {t('salesOrders.form.channel', 'Sales Channel')}
                    </Label>
                    <Select
                      value={channelId || 'direct'}
                      onValueChange={(val) =>
                        setChannelId(val === 'direct' ? '' : val)
                      }
                    >
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue
                          placeholder={t(
                            'salesOrders.form.selectChannel',
                            'Direct / None'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        <SelectItem value='direct'>
                          {t(
                            'salesOrders.form.directChannel',
                            'Direct / In-Store'
                          )}
                        </SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            <div className='flex items-center gap-1.5'>
                              <span>{ch.name}</span>
                              {ch.code && (
                                <span className='text-[11px] text-muted-foreground'>
                                  ({ch.code})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5. Currency */}
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>
                      {t('salesOrders.form.currency', 'Currency')}
                    </Label>
                    <Select
                      value={currency}
                      onValueChange={(val) => {
                        setCurrency(val)
                      }}
                    >
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue
                          placeholder={t(
                            'salesOrders.form.currency',
                            'Currency'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        {activeCurrencies.length === 0 ? (
                          <SelectItem value={currency}>{currency}</SelectItem>
                        ) : (
                          activeCurrencies.map((c) => (
                            <SelectItem key={c.id} value={c.code}>
                              <div className='flex items-center gap-1.5'>
                                <span className='font-mono font-medium'>
                                  {c.code}
                                </span>
                                <span className='text-xs text-muted-foreground'>
                                  ({c.symbol ? `${c.symbol} · ` : ''}
                                  {c.name})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 6. Expected Delivery Date */}
                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                      <Calendar className='h-3.5 w-3.5 text-primary' />{' '}
                      {t(
                        'salesOrders.form.expectedDate',
                        'Expected Delivery Date'
                      )}
                    </Label>
                    <Input
                      type='date'
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className='h-9 text-xs sm:text-sm'
                    />
                  </div>
                </div>
              </div>

              {/* 7. Dynamic Channel Pricing & Price List Strategy Card */}
              <div className='space-y-3.5 rounded-xl border bg-card/60 p-4 shadow-xs'>
                <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2'>
                  <div className='flex items-center gap-2'>
                    <Tag className='h-4 w-4 text-primary' />
                    <span className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                      {t(
                        'salesOrders.pricing.sectionTitle',
                        'Channel Pricing & Price List Strategy'
                      )}
                    </span>
                  </div>
                  {hasChannelSpecificPriceList ? (
                    <Badge
                      variant='outline'
                      className='border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'
                    >
                      <Sparkles className='mr-1 h-3 w-3' />
                      {t(
                        'salesOrders.pricing.channelAssigned',
                        'Channel Price List Linked'
                      )}
                    </Badge>
                  ) : activePriceList ? (
                    <Badge
                      variant='secondary'
                      className='text-[10px] font-medium'
                    >
                      {activePriceList.is_default
                        ? t(
                            'salesOrders.pricing.defaultStorePriceList',
                            'Default Store Price List'
                          )
                        : t(
                            'salesOrders.pricing.customPriceList',
                            'Custom Price List'
                          )}
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='text-[10px] text-muted-foreground'
                    >
                      {t(
                        'salesOrders.pricing.catalogFallback',
                        'Standard Catalog Base Price'
                      )}
                    </Badge>
                  )}
                </div>

                <div className='grid grid-cols-1 items-center gap-4 md:grid-cols-12'>
                  <div className='space-y-1.5 md:col-span-7'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                      <span>
                        {t(
                          'salesOrders.pricing.selectPriceList',
                          'Active Price List'
                        )}
                      </span>
                      {isLoadingPriceLists && (
                        <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                      )}
                    </Label>
                    <Select
                      value={selectedPriceListId || activePriceList?.id || '__catalog__'}
                      onValueChange={(val) => {
                        setSelectedPriceListId(val === '__catalog__' ? null : val)
                      }}
                    >
                      <SelectTrigger className='h-9 text-xs font-medium sm:text-sm'>
                        <SelectValue
                          placeholder={t(
                            'salesOrders.pricing.selectPriceListPlaceholder',
                            'Choose price list...'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='max-h-64'>
                        <SelectItem value='__catalog__'>
                          <div className='flex items-center gap-2'>
                            <span>
                              {t(
                                'salesOrders.pricing.standardCatalog',
                                'Standard Catalog Base Prices (No Price List)'
                              )}
                            </span>
                          </div>
                        </SelectItem>
                        {allPriceLists.map((pl) => {
                          const isChannelLinked =
                            channelId &&
                            (pl.channel_id === channelId ||
                              (pl.price_list_assignments || []).some(
                                (a) =>
                                  a.channel_id === channelId &&
                                  a.is_active !== false
                              ))
                          return (
                            <SelectItem key={pl.id} value={pl.id}>
                              <div className='flex w-full items-center justify-between gap-3'>
                                <span className='font-medium'>{pl.name}</span>
                                <div className='flex items-center gap-1.5'>
                                  {isChannelLinked && (
                                    <Badge
                                      variant='outline'
                                      className='h-4 border-emerald-500/40 bg-emerald-500/10 px-1 text-[9px] text-emerald-600 dark:text-emerald-400'
                                    >
                                      Channel
                                    </Badge>
                                  )}
                                  {Boolean(pl.is_default) && (
                                    <Badge
                                      variant='secondary'
                                      className='h-4 px-1 text-[9px]'
                                    >
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <p className='text-[11px] text-muted-foreground'>
                      {hasChannelSpecificPriceList
                        ? t(
                            'salesOrders.pricing.channelHelpMatched',
                            'Using prices specifically configured for the selected sales channel.'
                          )
                        : channelId
                          ? t(
                              'salesOrders.pricing.channelHelpNoMatch',
                              'No exclusive price list found for this channel. Falling back to store or general price lists.'
                            )
                          : t(
                              'salesOrders.pricing.channelHelpDefault',
                              'Direct in-store sales order using standard store pricing.'
                            )}
                    </p>
                  </div>

                  <div className='space-y-1.5 rounded-lg border border-dashed border-primary/20 bg-muted/30 p-3 text-xs md:col-span-5'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        {t(
                          'salesOrders.pricing.variantsMapped',
                          'Configured Variants'
                        )}
                        :
                      </span>
                      <span className='font-mono font-semibold text-foreground'>
                        {variantPriceMap.size}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        {t(
                          'salesOrders.pricing.activeCurrency',
                          'Pricing Currency'
                        )}
                        :
                      </span>
                      <span className='font-mono font-semibold text-primary'>
                        {currency} ({currencySymbol})
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>
                        {t(
                          'salesOrders.pricing.targetChannel',
                          'Target Channel'
                        )}
                        :
                      </span>
                      <span className='max-w-[140px] truncate font-medium text-foreground'>
                        {channelId
                          ? channels.find((c) => c.id === channelId)?.name ||
                            'Channel'
                          : t(
                              'salesOrders.form.directChannel',
                              'Direct / In-Store'
                            )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Completion / Continue Callout */}
              <div className='flex flex-col items-center justify-between gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-4 shadow-xs sm:flex-row'>
                <div className='space-y-0.5 text-center sm:text-left'>
                  <h4 className='text-sm font-semibold text-foreground'>
                    {t(
                      'salesOrders.steps.readyForProducts',
                      'Ready to add products?'
                    )}
                  </h4>
                  <p className='text-xs text-muted-foreground'>
                    {storeId
                      ? t(
                          'salesOrders.steps.readyDesc',
                          'Store and pricing context configured. Proceed to select products, variants, and quantities.'
                        )
                      : t(
                          'salesOrders.steps.selectStoreFirstDesc',
                          'Please select a store above to view available warehouse inventory and start adding products.'
                        )}
                  </p>
                </div>
                <Button
                  type='button'
                  size='sm'
                  disabled={!storeId}
                  onClick={() => setActiveStep('items')}
                  className='shrink-0 gap-1.5 font-semibold shadow-xs'
                >
                  <span>
                    {t(
                      'salesOrders.steps.continueToItems',
                      'Continue to Products'
                    )}
                  </span>
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Products & Line Items */
            <div className='space-y-6 animate-in fade-in-50 duration-200'>
              {/* Active Channel Pricing Bar */}
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 shadow-2xs'>
                <div className='flex flex-wrap items-center gap-2 text-xs sm:gap-3'>
                  <div className='flex items-center gap-1.5 font-medium text-foreground'>
                    <Globe className='h-4 w-4 text-primary' />
                    <span className='font-semibold'>
                      {channelId
                        ? channels.find((c) => c.id === channelId)?.name ||
                          t('salesOrders.form.channel', 'Channel')
                        : t(
                            'salesOrders.form.directChannel',
                            'Direct / In-Store'
                          )}
                    </span>
                  </div>

                  <span className='text-muted-foreground/50'>•</span>

                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <Tag className='h-3.5 w-3.5 text-primary/80' />
                    <span className='font-medium text-foreground'>
                      {activePriceList?.name ||
                        t(
                          'salesOrders.pricing.standardCatalog',
                          'Catalog Base Prices'
                        )}
                    </span>
                    {hasChannelSpecificPriceList && (
                      <Badge
                        variant='outline'
                        className='h-4 border-emerald-500/30 bg-emerald-500/10 px-1 font-mono text-[9px] text-emerald-600 dark:text-emerald-400'
                      >
                        {t(
                          'salesOrders.pricing.channelMatchedShort',
                          'Channel'
                        )}
                      </Badge>
                    )}
                  </div>

                  <span className='text-muted-foreground/50'>•</span>

                  <div className='flex items-center gap-1 text-muted-foreground'>
                    <Building2 className='h-3.5 w-3.5' />
                    <span>
                      {stores.find((s) => s.store_id === storeId)?.name ||
                        'Store'}
                    </span>
                    {effectiveWarehouseName && (
                      <span>({effectiveWarehouseName})</span>
                    )}
                  </div>
                </div>

                <div className='ml-auto flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 gap-1.5 border-primary/30 text-xs text-primary hover:bg-primary/10'
                    onClick={() => refreshLineItemPrices()}
                    disabled={items.filter((i) => i.productVariantId).length === 0}
                  >
                    <RefreshCw className='h-3.5 w-3.5' />
                    <span>
                      {t('salesOrders.pricing.refreshPrices', 'Refresh Prices')}
                    </span>
                  </Button>

                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 gap-1 text-xs text-muted-foreground hover:text-foreground'
                    onClick={() => setActiveStep('setup')}
                  >
                    <ArrowLeft className='h-3.5 w-3.5' />
                    <span>{t('salesOrders.steps.editSetup', 'Edit Setup')}</span>
                  </Button>
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2.5'>
                  <div className='flex items-center gap-2'>
                    <h3 className='flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                      <Layers className='h-3.5 w-3.5 text-primary' />
                      {t('salesOrders.form.lineItems', 'Order Items')} (
                      {items.length})
                    </h3>
                    {storeId && (
                      <Badge
                        variant='outline'
                        className='text-[10px] text-muted-foreground'
                      >
                        {filteredProducts.length}{' '}
                        {t(
                          'salesOrders.form.productsAvailable',
                          'products available'
                        )}
                        {effectiveWarehouseName
                          ? ` · ${effectiveWarehouseName}`
                          : ''}
                      </Badge>
                    )}
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10'
                    onClick={handleAddItem}
                    disabled={!storeId}
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' />{' '}
                    {t('salesOrders.form.addItem', 'Add Line Item')}
                  </Button>
                </div>

                {/* Empty State Banner when no store is selected yet */}
                {!storeId ? (
                  <div className='animate-in space-y-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center fade-in-50'>
                    <Building2 className='mx-auto h-8 w-8 animate-bounce text-primary/70' />
                    <h4 className='text-sm font-semibold text-foreground'>
                      {t(
                        'salesOrders.form.storeRequiredTitle',
                        'Select a Store to Begin'
                      )}
                    </h4>
                    <p className='mx-auto max-w-md text-xs text-muted-foreground'>
                      {t(
                        'salesOrders.form.storeRequiredDesc',
                        'Products, variants, stock balances, and dynamic price lists are loaded based on your chosen store and its linked fulfillment warehouses.'
                      )}
                    </p>
                  </div>
                ) : (
                  /* Line Items List */
                  <div className='space-y-3.5'>
                    <AnimatePresence initial={false}>
                      {items.map((item, index) => {
                        const itemVariants = item.productId
                          ? (variantsByProductId.get(item.productId) ?? [])
                          : []
                        const selectedVariant = itemVariants.find(
                          (v) => v.id === item.productVariantId
                        )
                        const stockSummary = selectedVariant
                          ? getVariantStockSummary(
                              selectedVariant,
                              effectiveWarehouseId,
                              storeId
                            )
                          : null
                        const availableStock = stockSummary?.available ?? null
                        const onHandStock = stockSummary?.onHand ?? 0
                        const reservedStock = stockSummary?.reserved ?? 0

                        const qtyNum = Number(item.qty) || 0
                        const isOutOfStock =
                          selectedVariant != null && (availableStock ?? 0) <= 0
                        const isStockExceeded =
                          selectedVariant != null &&
                          Boolean(item.qty && qtyNum > (availableStock ?? 0))

                        const product = item.productId
                          ? allProducts.find(
                              (p) =>
                                String(p.id ?? p.product_id) === item.productId
                            )
                          : null
                        const taxInfo = extractTaxRate(product, taxRates)

                        const q = Number(item.qty) || 0
                        const p = Number(item.unitPrice) || 0
                        const d = Number(item.discountAmount) || 0
                        const tax = Number(item.taxAmount) || 0
                        const lineTotal = Math.max(0, q * p - d + tax)
                        const taxPreview = computeTaxPreview(
                          product,
                          q,
                          p,
                          d,
                          taxRates
                        )

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              'space-y-3 rounded-xl border bg-card p-4 shadow-2xs transition-colors',
                              isOutOfStock
                                ? 'border-amber-500/40 bg-amber-500/5'
                                : isStockExceeded
                                  ? 'border-destructive/40 bg-destructive/5'
                                  : 'hover:border-primary/40'
                            )}
                          >
                            {/* Row 1: Product, Variant, UOM and Delete */}
                            <div className='grid grid-cols-1 items-end gap-3 sm:grid-cols-12'>
                              {/* Product Selector */}
                              <div className='space-y-1 sm:col-span-5'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-[11px] font-semibold text-muted-foreground'>
                                    {t('salesOrders.form.product', 'Product')} #
                                    {index + 1} *
                                  </Label>
                                  {product?.tax_code && (
                                    <span className='flex items-center gap-0.5 text-[10px] font-medium text-primary/80'>
                                      <Percent className='h-2.5 w-2.5' />{' '}
                                      {product.tax_code}
                                    </span>
                                  )}
                                </div>
                                <SOProductSelect
                                  productId={item.productId}
                                  products={filteredProducts}
                                  variantsByProductId={variantsByProductId}
                                  storeId={storeId}
                                  effectiveWarehouseId={effectiveWarehouseId}
                                  effectiveWarehouseName={
                                    effectiveWarehouseName
                                  }
                                  onSelectProduct={(pId) =>
                                    handleSelectProduct(index, pId)
                                  }
                                />
                              </div>

                              {/* Variant Selector */}
                              <div className='space-y-1 sm:col-span-4'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-[11px] font-semibold text-muted-foreground'>
                                    {t(
                                      'salesOrders.form.variantSku',
                                      'Variant / SKU'
                                    )}{' '}
                                    *
                                  </Label>
                                  {selectedVariant && (() => {
                                    const storeRetailStock = getStoreStock(selectedVariant.id)
                                    const otherWhWithStock = availableWarehouses
                                      .filter((w) => w.id !== effectiveWarehouseId)
                                      .map((w) => ({
                                        warehouse: w,
                                        stock: getStockForWarehouse(selectedVariant.id, w.id),
                                      }))
                                      .filter((item) => item.stock.available > 0)

                                    const otherLocationsParts = [
                                      storeRetailStock.available > 0
                                        ? `${storeRetailStock.available.toLocaleString()} in ${stores.find((s) => s.store_id === storeId)?.name || 'store'}`
                                        : null,
                                      ...otherWhWithStock.map(
                                        (o) => `${o.stock.available.toLocaleString()} in ${o.warehouse.name}`
                                      ),
                                    ].filter(Boolean)

                                    return (
                                      <div className='flex flex-col items-end gap-0.5 text-right'>
                                        <span
                                          className={cn(
                                            'max-w-[280px] truncate rounded px-1.5 py-0.5 font-mono text-[10px]',
                                            (availableStock ?? 0) > 0
                                              ? 'bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400'
                                              : 'bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400'
                                          )}
                                          title={
                                            effectiveWarehouseName
                                              ? `Avail: ${availableStock ?? 0} | On Hand: ${onHandStock} | Res: ${reservedStock} in ${effectiveWarehouseName}`
                                              : undefined
                                          }
                                        >
                                          {(availableStock ?? 0) > 0
                                            ? `${availableStock.toLocaleString()} avail. (${onHandStock.toLocaleString()} on hand)${effectiveWarehouseName ? ` in ${effectiveWarehouseName}` : ''}`
                                            : `0 avail. in ${effectiveWarehouseName || 'warehouse'}`}
                                        </span>
                                        {otherLocationsParts.length > 0 && (
                                          <span className='text-[10px] text-muted-foreground font-mono'>
                                            ({otherLocationsParts.join(' · ')})
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                                <SOVariantSelect
                                  productId={item.productId}
                                  variantId={item.productVariantId}
                                  variants={itemVariants}
                                  currencySymbol={currencySymbol}
                                  effectiveWarehouseId={effectiveWarehouseId}
                                  effectiveWarehouseName={
                                    effectiveWarehouseName
                                  }
                                  storeId={storeId}
                                  onSelectVariant={(vId, price, uomId) =>
                                    handleSelectVariant(
                                      index,
                                      vId,
                                      price,
                                      uomId
                                    )
                                  }
                                />
                              </div>

                              {/* Unit of Measure (UOM) */}
                              <div className='space-y-1 sm:col-span-2'>
                                <Label className='text-[11px] font-semibold text-muted-foreground'>
                                  {t('salesOrders.itemsTable.uom', 'UOM')}
                                </Label>
                                <Select
                                  value={item.uomId || ''}
                                  onValueChange={(val) =>
                                    updateItem(index, { uomId: val })
                                  }
                                >
                                  <SelectTrigger className='h-9 text-xs'>
                                    <SelectValue
                                      placeholder={t(
                                        'salesOrders.form.selectUnit',
                                        'Unit...'
                                      )}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uoms.map((u) => (
                                      <SelectItem
                                        key={u.id}
                                        value={u.id}
                                        className='text-xs'
                                      >
                                        {u.name} ({u.code})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Delete Action */}
                              <div className='flex justify-end pb-0.5 sm:col-span-1'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  className='h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                                  disabled={items.length === 1}
                                  onClick={() =>
                                    setItems((prev) =>
                                      prev.length === 1
                                        ? [{ ...emptyItem }]
                                        : prev.filter((_, i) => i !== index)
                                    )
                                  }
                                  title={t('common.remove', 'Remove Item')}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                            </div>

                            {/* Zero Stock Notification & Multi-Location Stock Finder */}
                            {selectedVariant && (availableStock ?? 0) <= 0 && (
                              <div className='flex animate-in flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 fade-in-50 dark:text-amber-300'>
                                <div className='flex items-center gap-2'>
                                  <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
                                  <span className='font-medium'>
                                    {t(
                                      'salesOrders.stock.zeroStockNotice',
                                      'Item is out of stock in the current fulfillment warehouse.'
                                    )}
                                  </span>
                                </div>

                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  className='flex h-7 items-center gap-1.5 border-amber-400/50 bg-amber-100/50 text-xs font-semibold text-amber-800 hover:bg-amber-200/50 dark:bg-amber-900/30 dark:text-amber-200'
                                  onClick={() =>
                                    setStockLocationsTarget({
                                      productName: product?.name || 'Product',
                                      variant: selectedVariant,
                                    })
                                  }
                                >
                                  <Warehouse className='h-3.5 w-3.5 text-amber-700' />
                                  <span>
                                    {t(
                                      'salesOrders.stock.viewLocationsBtn',
                                      'Check Availability in Other Stores / Warehouses'
                                    )}
                                  </span>
                                </Button>
                              </div>
                            )}

                            {/* Row 2: Quantities, Pricing, Discount, Auto Tax & Line Total */}
                            <div className='grid grid-cols-2 gap-2.5 border-t border-dashed pt-2 sm:grid-cols-5'>
                              {/* Quantity with Touch Stepper */}
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-[10px] font-medium text-muted-foreground'>
                                    {t(
                                      'salesOrders.itemsTable.qty',
                                      'Quantity'
                                    )}{' '}
                                    *
                                  </Label>
                                  {selectedVariant && (
                                    <button
                                      type='button'
                                      onClick={() => {
                                        if (availableStock != null && availableStock > 0) {
                                          handleQtyChange(index, String(availableStock))
                                        }
                                      }}
                                      disabled={(availableStock ?? 0) <= 0}
                                      className={cn(
                                        'font-mono text-[9px] transition-colors',
                                        (availableStock ?? 0) > 0
                                          ? 'text-primary hover:underline cursor-pointer font-medium'
                                          : 'text-muted-foreground cursor-default'
                                      )}
                                      title={
                                        (availableStock ?? 0) > 0
                                          ? t(
                                              'salesOrders.itemsTable.setMaxQty',
                                              'Click to set max available quantity'
                                            )
                                          : undefined
                                      }
                                    >
                                      Max: {availableStock ?? 0}
                                    </button>
                                  )}
                                </div>
                                <div className='flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-7 shrink-0 rounded-r-none px-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    onClick={() => handleStepQty(index, -1)}
                                    disabled={qtyNum <= 1}
                                    title={t('common.decrease', 'Decrease')}
                                  >
                                    <Minus className='h-3 w-3' />
                                  </Button>
                                  <Input
                                    type='number'
                                    step='any'
                                    min='0.001'
                                    value={item.qty}
                                    onChange={(e) =>
                                      handleQtyChange(index, e.target.value)
                                    }
                                    className={cn(
                                      'h-8 [appearance:textfield] border-0 px-1 text-center font-mono font-medium shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                      isStockExceeded &&
                                        'font-bold text-destructive'
                                    )}
                                    placeholder='1'
                                  />
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-7 shrink-0 rounded-l-none px-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    onClick={() => handleStepQty(index, 1)}
                                    title={t('common.increase', 'Increase')}
                                  >
                                    <Plus className='h-3 w-3' />
                                  </Button>
                                </div>
                                {isStockExceeded && (
                                  <p className='mt-0.5 animate-in text-[10px] leading-tight font-medium text-destructive fade-in-50'>
                                    {t(
                                      'salesOrders.itemsTable.stockExceededDetailed',
                                      'Exceeds stock ({{available}} avail., {{onHand}} on hand)',
                                      {
                                        available: availableStock ?? 0,
                                        onHand: onHandStock,
                                      }
                                    )}
                                  </p>
                                )}
                              </div>

                              {/* Unit Price */}
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between'>
                                  <Label className='text-[10px] font-medium text-muted-foreground'>
                                    {t(
                                      'salesOrders.itemsTable.unitPrice',
                                      'Unit Price ({{symbol}})',
                                      {
                                        symbol: currencySymbol,
                                      }
                                    )}{' '}
                                    *
                                  </Label>
                                  {item.isResolvingPrice && (
                                    <Loader2 className='h-2.5 w-2.5 animate-spin text-primary' />
                                  )}
                                </div>
                                <Input
                                  type='number'
                                  step='any'
                                  min='0'
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUnitPriceChange(index, e.target.value)
                                  }
                                  className='h-8 font-mono text-xs font-medium'
                                  placeholder='Price'
                                />
                                {item.priceListName &&
                                  !item.isResolvingPrice && (
                                    <span
                                      className='block truncate text-[9px] leading-tight font-medium text-emerald-600 dark:text-emerald-400'
                                      title={item.priceListName}
                                    >
                                      ✓ {item.priceListName}
                                    </span>
                                  )}
                              </div>

                              {/* Discount Amount */}
                              <div className='space-y-1'>
                                <Label className='text-[10px] font-medium text-muted-foreground'>
                                  {t(
                                    'salesOrders.itemsTable.discount',
                                    'Discount ({{symbol}})',
                                    {
                                      symbol: currencySymbol,
                                    }
                                  )}
                                </Label>
                                <Input
                                  type='number'
                                  step='any'
                                  min='0'
                                  value={item.discountAmount}
                                  onChange={(e) =>
                                    handleDiscountChange(index, e.target.value)
                                  }
                                  className='h-8 font-mono text-xs'
                                  placeholder='0.00'
                                />
                              </div>

                              {/* Tax Amount & Live Tax Preview */}
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between'>
                                  <Label className='flex items-center gap-1 text-[10px] font-medium text-muted-foreground'>
                                    <Percent className='h-2.5 w-2.5 text-primary' />
                                    {t(
                                      'salesOrders.itemsTable.tax',
                                      'Tax ({{symbol}})',
                                      {
                                        symbol: currencySymbol,
                                      }
                                    )}
                                  </Label>
                                  {taxInfo.taxRate > 0 && (
                                    <Badge
                                      variant='outline'
                                      className='h-3.5 border-primary/20 bg-primary/5 px-1 text-[8px] text-primary'
                                    >
                                      {taxInfo.taxRate}% Auto
                                    </Badge>
                                  )}
                                </div>
                                <Input
                                  type='number'
                                  step='any'
                                  min='0'
                                  value={item.taxAmount}
                                  onChange={(e) =>
                                    updateItem(index, {
                                      taxAmount: e.target.value,
                                    })
                                  }
                                  className='h-8 font-mono text-xs'
                                  placeholder='0.00'
                                />
                                {product && (
                                  <div className='flex items-center justify-between pt-0.5 text-[9px] text-muted-foreground'>
                                    <span
                                      className='truncate font-mono'
                                      title={
                                        taxPreview.taxName ||
                                        taxPreview.taxCode ||
                                        'Tax'
                                      }
                                    >
                                      {taxPreview.taxCode
                                        ? `${taxPreview.taxCode} (${taxPreview.taxRatePercent}%)`
                                        : taxPreview.taxRatePercent > 0
                                          ? `${taxPreview.taxRatePercent}%`
                                          : t(
                                              'salesOrders.form.noTax',
                                              'No tax'
                                            )}
                                    </span>
                                    {taxPreview.taxRatePercent > 0 && (
                                      <span className='ml-1 font-mono font-medium text-foreground'>
                                        {currencySymbol}
                                        {calculateLineTaxAmount(
                                          q,
                                          p,
                                          d,
                                          taxInfo.taxRate
                                        ).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Line Total */}
                              <div className='col-span-2 flex flex-col justify-end space-y-1 text-right sm:col-span-1 sm:pr-1'>
                                <Label className='text-[10px] font-medium text-muted-foreground'>
                                  {t(
                                    'salesOrders.itemsTable.lineTotal',
                                    'Line Total'
                                  )}
                                </Label>
                                <span className='font-mono text-sm leading-8 font-bold text-foreground'>
                                  {currencySymbol}
                                  {lineTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Notes & Financial Receipt Section */}
                <div className='grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-12'>
                  {/* Order Remarks */}
                  <div className='space-y-1.5 md:col-span-7'>
                    <Label className='flex items-center gap-1.5 text-xs font-semibold'>
                      <FileText className='h-3.5 w-3.5 text-primary' />
                      {t(
                        'salesOrders.form.notes',
                        'Order Notes & Shipping Instructions'
                      )}
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t(
                        'salesOrders.form.notesPlaceholder',
                        'Special delivery notes, customer PO number, or remarks...'
                      )}
                      className='h-10 text-xs sm:text-sm'
                    />
                  </div>

                  {/* Financial Receipt Summary */}
                  <div className='md:col-span-5'>
                    <div className='space-y-2 rounded-xl border bg-muted/20 p-4 shadow-2xs'>
                      <div className='flex items-center justify-between border-b pb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
                        <span className='flex items-center gap-1.5'>
                          <Receipt className='h-3.5 w-3.5 text-primary' />
                          {t('salesOrders.viewDialog.summary', 'Order Summary')}
                        </span>
                        <span className='font-mono text-[11px]'>
                          {currency}
                        </span>
                      </div>

                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>
                          {t('salesOrders.viewDialog.subtotal', 'Subtotal:')}
                        </span>
                        <span className='font-mono font-medium text-foreground'>
                          {currencySymbol}
                          {subtotal.toFixed(2)}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className='flex justify-between text-xs text-rose-600 dark:text-rose-400'>
                          <span>
                            {t('salesOrders.viewDialog.discount', 'Discount:')}
                          </span>
                          <span className='font-mono font-medium'>
                            -{currencySymbol}
                            {totalDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <span>{t('salesOrders.viewDialog.tax', 'Tax:')}</span>
                          {totalTax > 0 && (
                            <span className='font-mono text-[10px] text-muted-foreground/80'>
                              (auto-applied)
                            </span>
                          )}
                        </span>
                        <span className='font-mono font-medium text-foreground'>
                          +{currencySymbol}
                          {totalTax.toFixed(2)}
                        </span>
                      </div>

                      <div className='mt-1 flex items-baseline justify-between border-t pt-2'>
                        <span className='text-sm font-bold text-foreground'>
                          {t(
                            'salesOrders.viewDialog.grandTotal',
                            'Grand Total:'
                          )}
                        </span>
                        <span className='font-mono text-lg font-extrabold text-primary'>
                          {currencySymbol}
                          {grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className='w-full shrink-0 flex-row items-center justify-between border-t bg-muted/20 p-4 sm:justify-between'>
          {activeStep === 'setup' ? (
            <>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>

              <Button
                type='button'
                size='sm'
                onClick={() => setActiveStep('items')}
                disabled={!storeId}
                className='gap-1.5 font-semibold shadow-xs'
              >
                <span>
                  {t(
                    'salesOrders.steps.continueToItems',
                    'Continue to Products'
                  )}
                </span>
                <ArrowRight className='h-4 w-4' />
              </Button>
            </>
          ) : (
            <>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setActiveStep('setup')}
                className='gap-1.5'
              >
                <ArrowLeft className='h-4 w-4' />
                <span>
                  {t('salesOrders.steps.backToSetup', 'Back to Setup')}
                </span>
              </Button>

              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleOpenReview}
                  className='border-primary/30 text-primary hover:bg-primary/10'
                >
                  <Eye className='mr-1.5 h-4 w-4' />
                  {t(
                    'salesOrders.createDialog.reviewDraft',
                    'Review & Print Draft'
                  )}
                </Button>

                <Button
                  type='button'
                  size='sm'
                  onClick={handleExecuteCreate}
                  disabled={isSubmitting || !storeId}
                  className='font-semibold shadow-xs'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                      {orderToEdit
                        ? t(
                            'salesOrders.createDialog.updatingOrder',
                            'Updating Order...'
                          )
                        : t(
                            'salesOrders.createDialog.creatingOrder',
                            'Creating Order...'
                          )}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className='mr-1.5 h-4 w-4' />
                      {orderToEdit
                        ? t(
                            'salesOrders.createDialog.updateOrder',
                            'Update Order'
                          )
                        : t(
                            'salesOrders.createDialog.createDraft',
                            'Create Draft'
                          )}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog in Draft Mode */}
      {reviewOpen && draftData && (
        <SalesOrderReviewDialog
          draftData={draftData}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          isSubmittingDraft={isSubmitting}
          onConfirmDraftSubmit={async () => {
            await handleExecuteCreate()
            setReviewOpen(false)
          }}
        />
      )}

      {/* Multi-Location Stock Side Panel (Sheet) */}
      {stockLocationsTarget && (
        <SalesOrderStockLocationsSheet
          open={Boolean(stockLocationsTarget)}
          onOpenChange={(val) => {
            if (!val) setStockLocationsTarget(null)
          }}
          productName={stockLocationsTarget.productName}
          variant={stockLocationsTarget.variant}
          stores={stores}
          warehouses={allWarehouses}
          currentStoreId={storeId}
          currentWarehouseId={effectiveWarehouseId}
          storeWarehouseIds={availableWarehouses.map((w) => w.id)}
          onSelectWarehouse={(whId) => {
            setWarehouseId(whId)
          }}
        />
      )}
    </>
  )
}
