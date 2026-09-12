import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Building2,
  Warehouse,
  User,
  Calendar,
  FileText,
  Eye,
  CheckCircle2,
  Loader2,
  Globe,
  AlertCircle,
  Edit,
  MapPin,
  Layers,
  Percent,
  Receipt,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { resolveVariantPrice } from '@/services/pricing/price-resolver'
import { useSettingsStore } from '@/features/settings/data/store'
import {
  useStoreOptions,
  useCustomerOptions,
  useWarehouseOptions,
  useChannelOptions,
  useStoreWarehouses,
} from '@/hooks/use-inventory-lookups'
import { useProducts } from '@/features/products/hooks/use-products'
import { useUomOptions } from '@/features/products/hooks/use-product-options'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'
import { useTaxRates } from '@/features/tax-rates/hooks/use-tax-rates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createOrderInputSchema, type OrderListItem } from '../data/schema'
import { useCreateOrder, useUpdateOrder, useOrder } from '../hooks/use-sales-orders'
import {
  getAvailableStock,
  extractTaxRate,
  calculateLineTaxAmount,
} from '../utils/variant-stock'
import {
  SOProductSelect,
  SOVariantSelect,
  type SOVariantOption,
  type SOVariantStockBalance,
} from './so-product-variant-picker'
import {
  SalesOrderReviewDialog,
  type SalesOrderDraftData,
  type SalesOrderDraftItem,
} from './review-dialog'
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
  priceSource?: 'customer_group' | 'channel' | 'store' | 'default' | 'fallback' | null
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
  const tenantFavoriteCurrency = useSettingsStore((s) => s.localization?.currency)
  const [storeId, setStoreId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [customerId, setCustomerId] = useState(WALK_IN)
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<string | null>(null)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemState[]>([{ ...emptyItem }])

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
  const { data: storeWarehouses = [], isLoading: isLoadingStoreWh } = useStoreWarehouses(storeId)
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
      const isCurrentWhValid = availableWarehouses.some((w) => w.id === warehouseId)
      if (!isCurrentWhValid) {
        const defaultWh =
          availableWarehouses.find((w) => Boolean(w.is_default) && w.allow_fulfillment !== false) ||
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
      availableWarehouses.find((w) => Boolean(w.is_default) && w.allow_fulfillment !== false) ||
      availableWarehouses.find((w) => Boolean(w.is_default)) ||
      availableWarehouses.find((w) => w.allow_fulfillment !== false) ||
      availableWarehouses[0]
    return defaultWh?.id || ''
  }, [storeId, warehouseId, availableWarehouses])

  // 2. Products related to the selected store:
  // - If no store selected: empty / prompt select store.
  // - If store selected:
  //   1) Products assigned to this store: p.store_id === storeId
  //   2) Tenant global products (!p.store_id), provided they don't belong to another store.
  //   3) Products having stock in this store or any of this store's linked warehouses.
  const filteredProducts = useMemo(() => {
    if (!storeId) return []

    const linkedWhIds = new Set(availableWarehouses.map((w) => w.id))

    return allProducts.filter((p) => {
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
        const balances = (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances || []
        return balances.some(
          (b) =>
            b.store_id === storeId ||
            (b.warehouse_id && linkedWhIds.has(b.warehouse_id))
        )
      })

      // Include global products or products with stock in this store ecosystem
      return !p.store_id || hasStoreStock
    })
  }, [storeId, allProducts, availableWarehouses])

  // Populate form if in edit mode
  useEffect(() => {
    if (!open) return

    if (orderToEdit) {
      const current = orderDetail ?? orderToEdit
      const orderStoreId = current.store_id || current.stores?.store_id || ''
      setStoreId(orderStoreId)
      setWarehouseId(current.warehouse_id || current.warehouses?.id || '')
      setChannelId(current.channel_id || current.channels?.id || '')
      setCustomerId(current.customer_id || current.customers?.id || WALK_IN)
      setUserSelectedCurrency(current.currency || null)
      setExpectedDate(current.expected_date ? current.expected_date.slice(0, 10) : '')
      setNotes(current.notes || '')

      if (orderDetail?.sales_order_items && orderDetail.sales_order_items.length > 0) {
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
    if (tenantFavoriteCurrency && activeCurrencies.some((c) => c.code === tenantFavoriteCurrency)) {
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

  // 3. Variant Stock & Pricing: Contextual stock per store / fulfillment warehouse
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, SOVariantOption[]>()
    const linkedWhIds = new Set(availableWarehouses.map((w) => w.id))

    for (const p of allProducts) {
      const pId = String(p.id ?? p.product_id ?? '')
      const vars: SOVariantOption[] = (p.product_variants || []).map((v) => {
        const pli = (v as { price_list_items?: Array<{ price: number | string; cost_price?: number | string | null }> }).price_list_items
        const resolvedPrice = (pli && pli.length > 0)
          ? Number(pli[0].price)
          : Number((v as { price?: number }).price || 0)
        const resolvedCost = (pli && pli.length > 0 && pli[0].cost_price != null)
          ? Number(pli[0].cost_price)
          : ((v as { cost_price?: number | null }).cost_price ? Number((v as { cost_price?: number | null }).cost_price) : null)

        const balances = (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances

        // Compute location-specific stock
        let contextualStock = 0
        if (balances && balances.length > 0) {
          if (effectiveWarehouseId) {
            // Specific warehouse selected
            const whBalances = balances.filter((b) => b.warehouse_id === effectiveWarehouseId)
            contextualStock = whBalances.reduce(
              (sum, b) =>
                sum +
                Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))),
              0
            )
          } else if (storeId) {
            // Store selected: sum store balances and linked warehouse balances
            const storeBalances = balances.filter(
              (b) => b.store_id === storeId || (b.warehouse_id && linkedWhIds.has(b.warehouse_id))
            )
            contextualStock = storeBalances.reduce(
              (sum, b) =>
                sum +
                Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))),
              0
            )
          } else {
            // Fallback: total across all
            contextualStock = balances.reduce(
              (sum, b) =>
                sum +
                Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))),
              0
            )
          }
        } else {
          contextualStock = Number((v as { stock_quantity?: number }).stock_quantity ?? 0)
        }

        return {
          id: String(v.id),
          sku: v.sku,
          name: v.name,
          price: resolvedPrice,
          cost_price: resolvedCost,
          stock_quantity: Math.max(0, contextualStock),
          uom_id: v.uom_id || (p.base_uom_id ? String(p.base_uom_id) : null),
          stock_balances: balances,
        }
      })
      map.set(pId, vars)
    }
    return map
  }, [allProducts, storeId, effectiveWarehouseId, availableWarehouses])

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
  }

  const updateItem = (index: number, patch: Partial<LineItemState>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  // Dynamic Price Checking from price_list_items
  const resolvePriceForVariant = useCallback(
    async (variantId: string, fallbackPrice: number) => {
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
    [storeId, customerGroupId, channelId, selectedCurrencyObj]
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
      const product = allProducts.find((p) => String(p.id ?? p.product_id) === productId)
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
    const product = allProducts.find((p) => String(p.id ?? p.product_id) === pId)
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
    const resolved = await resolvePriceForVariant(firstVariant.id, fallbackPrice)
    const currentQty = Number(items[index]?.qty) || 1
    const currentDiscount = Number(items[index]?.discountAmount) || 0
    const autoTax = taxRes.taxRate > 0
      ? calculateLineTaxAmount(currentQty, resolved.price, currentDiscount, taxRes.taxRate)
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
    const autoTax = taxRes.taxRate > 0
      ? calculateLineTaxAmount(currentQty, resolved.price, currentDiscount, taxRes.taxRate)
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
    const autoTax = computeAutoTax(item.productId, newQty, item.unitPrice, item.discountAmount)
    updateItem(index, { qty: newQty, taxAmount: autoTax })
  }

  const handleUnitPriceChange = (index: number, newPrice: string) => {
    const item = items[index]
    const autoTax = computeAutoTax(item.productId, item.qty, newPrice, item.discountAmount)
    updateItem(index, { unitPrice: newPrice, taxAmount: autoTax })
  }

  const handleDiscountChange = (index: number, newDiscount: string) => {
    const item = items[index]
    const autoTax = computeAutoTax(item.productId, item.qty, item.unitPrice, newDiscount)
    updateItem(index, { discountAmount: newDiscount, taxAmount: autoTax })
  }

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
          const pVariants = item.productId ? variantsByProductId.get(item.productId) : []
          const variant = pVariants?.find((v) => v.id === item.productVariantId)
          const fallback = variant?.price ?? (Number(item.unitPrice) || 0)

          const res = await resolvePriceForVariant(item.productVariantId, fallback)
          const product = item.productId
            ? allProducts.find((p) => String(p.id ?? p.product_id) === item.productId)
            : null
          const taxRes = extractTaxRate(product, taxRates)
          const autoTax = taxRes.taxRate > 0
            ? calculateLineTaxAmount(Number(item.qty) || 0, res.price, Number(item.discountAmount) || 0, taxRes.taxRate)
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
        const product = allProducts.find((p) => String(p.id ?? p.product_id) === i.productId)
        const variantList = i.productId ? variantsByProductId.get(i.productId) : []
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
        t('salesOrders.createDialog.itemRequiredError', 'Please add at least one line item with valid product and quantity.')
      )
      return null
    }

    // Check if any items exceed available stock
    for (const i of items) {
      if (i.productVariantId && Number(i.qty) > 0) {
        const variantList = i.productId ? variantsByProductId.get(i.productId) : []
        const variant = variantList?.find((v) => v.id === i.productVariantId)
        if (variant) {
          const availableStock = getAvailableStock(variant, effectiveWarehouseId, storeId)
          if (Number(i.qty) > availableStock) {
            toast.error(
              t(
                'salesOrders.createDialog.stockExceededBlock',
                'One or more line items exceed available stock in the selected fulfillment location.'
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
      customerName: selectedCust
        ? [selectedCust.first_name, selectedCust.last_name].filter(Boolean).join(' ')
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
        ? variantsByProductId.get(lastItem.productId) ?? []
        : []
      const selectedVariant = itemVariants.find(
        (v) => v.id === lastItem.productVariantId
      )
      if (selectedVariant) {
        const availableStock = getAvailableStock(
          selectedVariant,
          effectiveWarehouseId,
          storeId
        )
        if (Number(lastItem.qty) > availableStock) {
          toast.error(
            t(
              'salesOrders.createDialog.rowStockExceededToast',
              'The quantity entered exceeds available stock. Please adjust quantity before adding more items.'
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
      toast.error(t('salesOrders.createDialog.selectStoreFirst', 'Please select a store first.'))
      return
    }
    const draft = buildDraftData()
    if (!draft) return
    setDraftData(draft)
    setReviewOpen(true)
  }

  const handleExecuteCreate = async () => {
    if (!storeId) {
      toast.error(t('salesOrders.createDialog.selectStoreFirst', 'Please select a store first.'))
      return
    }

    // Check if any items exceed available stock
    for (const item of items) {
      if (item.productVariantId && Number(item.qty) > 0) {
        const variantList = item.productId ? variantsByProductId.get(item.productId) : []
        const variant = variantList?.find((v) => v.id === item.productVariantId)
        if (variant) {
          const availableStock = getAvailableStock(variant, effectiveWarehouseId, storeId)
          if (Number(item.qty) > availableStock) {
            toast.error(
              t(
                'salesOrders.createDialog.stockExceededBlock',
                'One or more line items exceed the available stock in the selected fulfillment location.'
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
      toast.error(t('salesOrders.createDialog.fixFormError', 'Please fix the sales order form'), {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }

    try {
      if (orderToEdit?.id) {
        await updateOrder.mutateAsync({ id: orderToEdit.id, input: parsed.data })
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
        <DialogContent className='max-w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl'>
          {/* Header */}
          <DialogHeader className='p-5 pb-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0'>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 rounded-xl bg-primary/10 text-primary'>
                {orderToEdit ? <Edit className='h-5 w-5' /> : <FileText className='h-5 w-5' />}
              </div>
              <div>
                <DialogTitle className='text-lg sm:text-xl font-bold flex items-center gap-2'>
                  <span>
                    {orderToEdit
                      ? t('salesOrders.createDialog.editTitle', 'Edit Sales Order')
                      : t('salesOrders.createDialog.title', 'New Sales Order')}
                  </span>
                  {orderToEdit?.order_number && (
                    <Badge variant='outline' className='font-mono text-xs font-normal'>
                      #{orderToEdit.order_number}
                    </Badge>
                  )}
                  <Badge variant='secondary' className='text-[10px] uppercase tracking-wider font-semibold'>
                    {t('salesOrders.badges.draft', 'Draft')}
                  </Badge>
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  {orderToEdit
                    ? t('salesOrders.createDialog.editDesc', 'Update sales order items, quantities, or fulfillment details.')
                    : t('salesOrders.createDialog.desc', 'Create a sales order draft with real customer, fulfillment location, and line items.')}
                </DialogDescription>
              </div>
            </div>

            <div className='hidden sm:flex items-center gap-2 text-xs text-muted-foreground'>
              <span className='font-mono font-medium'>
                {items.filter((i) => i.productVariantId).length} {t('salesOrders.form.items', 'items')}
              </span>
              <span>•</span>
              <span className='font-mono font-bold text-foreground'>
                {currencySymbol}{grandTotal.toFixed(2)}
              </span>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <ScrollArea className='flex-1 p-5 sm:p-6'>
            <div className='space-y-6'>
              {/* Order Context Card (Store, Fulfillment Warehouse, Customer, Channel, Currency, Date) */}
              <div className='rounded-xl border bg-card/60 p-4 shadow-xs space-y-4'>
                <div className='flex items-center justify-between pb-2 border-b'>
                  <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Building2 className='h-3.5 w-3.5 text-primary' />
                    {t('salesOrders.form.fulfillmentAndCustomer', 'Fulfillment & Customer Information')}
                  </span>
                  {!storeId && (
                    <span className='text-[11px] font-medium text-amber-600 dark:text-amber-400 animate-pulse flex items-center gap-1'>
                      <AlertCircle className='h-3 w-3' />
                      {t('salesOrders.form.startBySelectingStore', 'Start by selecting a store')}
                    </span>
                  )}
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'>
                  {/* 1. Store Select */}
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <Building2 className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.store', 'Store *')}
                    </Label>
                    <Select value={storeId} onValueChange={setStoreId}>
                      <SelectTrigger className={cn('h-9 text-xs sm:text-sm', !storeId && 'border-primary/50 ring-1 ring-primary/20')}>
                        <SelectValue placeholder={t('salesOrders.form.selectStore', 'Select store...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
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
                      <Label className='text-xs font-semibold flex items-center gap-1.5'>
                        <Warehouse className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.warehouse', 'Fulfillment Warehouse *')}
                      </Label>
                      {storeId && availableWarehouses.length > 0 && (
                        <span className='text-[10px] text-muted-foreground font-medium'>
                          {availableWarehouses.length} {t('salesOrders.form.linkedWhCount', 'related')}
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
                              ? t('salesOrders.createDialog.selectStoreFirst', 'Select store first...')
                              : t('salesOrders.form.defaultWarehouse', 'Select related warehouse...')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWarehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            <div className='flex items-center justify-between w-full gap-2'>
                              <div className='flex items-center gap-1.5 truncate'>
                                <span>{wh.name}</span>
                                {wh.code && (
                                  <span className='font-mono text-[11px] text-muted-foreground'>
                                    ({wh.code})
                                  </span>
                                )}
                              </div>
                              <div className='flex items-center gap-1 shrink-0'>
                                {wh.allow_fulfillment === false && (
                                  <Badge
                                    variant='outline'
                                    className='text-[9px] h-4 px-1 text-amber-600 border-amber-300 dark:border-amber-700'
                                  >
                                    {t('salesOrders.form.noFulfillment', 'No Fulfillment')}
                                  </Badge>
                                )}
                                {Boolean(wh.is_default) && (
                                  <Badge
                                    variant='secondary'
                                    className='text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/20'
                                  >
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {storeId && availableWarehouses.length === 0 && !isLoadingStoreWh && (
                      <p className='text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1'>
                        <AlertCircle className='h-3 w-3 shrink-0' />
                        {t('salesOrders.createDialog.noLinkedWarehouses', 'No warehouses related to this store.')}
                      </p>
                    )}
                  </div>

                  {/* 3. Customer Select */}
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <User className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.customer', 'Customer')}
                    </Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue placeholder={t('salesOrders.form.selectCustomer', 'Select customer...')} />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        <SelectItem value={WALK_IN}>
                          <div className='flex items-center gap-1.5 font-medium'>
                            <User className='h-3.5 w-3.5 text-muted-foreground' />
                            <span>{t('salesOrders.form.walkInCustomer', 'Walk-in Customer')}</span>
                          </div>
                        </SelectItem>
                        {customers.map((c) => {
                          const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
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
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <Globe className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.channel', 'Sales Channel')}
                    </Label>
                    <Select value={channelId || 'direct'} onValueChange={(val) => setChannelId(val === 'direct' ? '' : val)}>
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue placeholder={t('salesOrders.form.selectChannel', 'Direct / None')} />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        <SelectItem value='direct'>{t('salesOrders.form.directChannel', 'Direct / In-Store')}</SelectItem>
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            <div className='flex items-center gap-1.5'>
                              <span>{ch.name}</span>
                              {ch.code && (
                                <span className='text-[11px] text-muted-foreground'>({ch.code})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5. Currency */}
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>{t('salesOrders.form.currency', 'Currency')}</Label>
                    <Select
                      value={currency}
                      onValueChange={(val) => {
                        setCurrency(val)
                      }}
                    >
                      <SelectTrigger className='h-9 text-xs sm:text-sm'>
                        <SelectValue placeholder={t('salesOrders.form.currency', 'Currency')} />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        {activeCurrencies.length === 0 ? (
                          <SelectItem value={currency}>{currency}</SelectItem>
                        ) : (
                          activeCurrencies.map((c) => (
                            <SelectItem key={c.id} value={c.code}>
                              <div className='flex items-center gap-1.5'>
                                <span className='font-mono font-medium'>{c.code}</span>
                                <span className='text-xs text-muted-foreground'>
                                  ({c.symbol ? `${c.symbol} · ` : ''}{c.name})
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
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <Calendar className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.expectedDate', 'Expected Delivery Date')}
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

              {/* Line Items Section */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2.5'>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                      <Layers className='h-3.5 w-3.5 text-primary' />
                      {t('salesOrders.form.lineItems', 'Order Items')} ({items.length})
                    </h3>
                    {storeId && (
                      <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                        {filteredProducts.length} {t('salesOrders.form.productsAvailable', 'products available')}
                      </Badge>
                    )}
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10'
                    onClick={handleAddItem}
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' /> {t('salesOrders.form.addItem', 'Add Line Item')}
                  </Button>
                </div>

                {/* Line Items List */}
                <div className='space-y-3.5'>
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => {
                      const itemVariants = item.productId
                        ? variantsByProductId.get(item.productId) ?? []
                        : []
                      const selectedVariant = itemVariants.find(
                        (v) => v.id === item.productVariantId
                      )
                      const availableStock = selectedVariant
                        ? getAvailableStock(selectedVariant, effectiveWarehouseId, storeId)
                        : null

                      const qtyNum = Number(item.qty) || 0
                      const isOutOfStock = selectedVariant != null && (availableStock ?? 0) <= 0
                      const isStockExceeded = selectedVariant != null && Boolean(item.qty && qtyNum > (availableStock ?? 0))

                      const product = item.productId
                        ? allProducts.find((p) => String(p.id ?? p.product_id) === item.productId)
                        : null
                      const taxInfo = extractTaxRate(product, taxRates)

                      const q = Number(item.qty) || 0
                      const p = Number(item.unitPrice) || 0
                      const d = Number(item.discountAmount) || 0
                      const tax = Number(item.taxAmount) || 0
                      const lineTotal = Math.max(0, q * p - d + tax)

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'p-4 rounded-xl border bg-card shadow-2xs space-y-3 transition-colors',
                            isOutOfStock
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : isStockExceeded
                              ? 'border-destructive/40 bg-destructive/5'
                              : 'hover:border-primary/40'
                          )}
                        >
                          {/* Row 1: Product, Variant, UOM and Delete */}
                          <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-end'>
                            {/* Product Selector */}
                            <div className='sm:col-span-5 space-y-1'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-[11px] font-semibold text-muted-foreground'>
                                  {t('salesOrders.form.product', 'Product')} #{index + 1} *
                                </Label>
                                {product?.tax_code && (
                                  <span className='text-[10px] text-primary/80 font-medium flex items-center gap-0.5'>
                                    <Percent className='h-2.5 w-2.5' /> {product.tax_code}
                                  </span>
                                )}
                              </div>
                              <SOProductSelect
                                productId={item.productId}
                                products={filteredProducts}
                                variantsByProductId={variantsByProductId}
                                storeId={storeId}
                                onSelectProduct={(pId) => handleSelectProduct(index, pId)}
                              />
                            </div>

                            {/* Variant Selector */}
                            <div className='sm:col-span-4 space-y-1'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-[11px] font-semibold text-muted-foreground'>
                                  {t('salesOrders.form.variantSku', 'Variant / SKU')} *
                                </Label>
                                {selectedVariant && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-mono px-1 rounded',
                                      (availableStock ?? 0) > 0
                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold'
                                        : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 font-bold'
                                    )}
                                  >
                                    {(availableStock ?? 0) > 0
                                      ? `${availableStock} in stock`
                                      : '0 in stock'}
                                  </span>
                                )}
                              </div>
                              <SOVariantSelect
                                productId={item.productId}
                                variantId={item.productVariantId}
                                variants={itemVariants}
                                currencySymbol={currencySymbol}
                                effectiveWarehouseId={effectiveWarehouseId}
                                storeId={storeId}
                                onSelectVariant={(vId, price, uomId) =>
                                  handleSelectVariant(index, vId, price, uomId)
                                }
                              />
                            </div>

                            {/* Unit of Measure (UOM) */}
                            <div className='sm:col-span-2 space-y-1'>
                              <Label className='text-[11px] font-semibold text-muted-foreground'>
                                {t('salesOrders.itemsTable.uom', 'UOM')}
                              </Label>
                              <Select
                                value={item.uomId || ''}
                                onValueChange={(val) => updateItem(index, { uomId: val })}
                              >
                                <SelectTrigger className='h-9 text-xs'>
                                  <SelectValue placeholder={t('salesOrders.form.selectUnit', 'Unit...')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {uoms.map((u) => (
                                    <SelectItem key={u.id} value={u.id} className='text-xs'>
                                      {u.name} ({u.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Delete Action */}
                            <div className='sm:col-span-1 flex justify-end pb-0.5'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
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

                          {/* 4. Zero Stock Notification & Side Panel Trigger */}
                          {selectedVariant && (availableStock ?? 0) <= 0 && (
                            <div className='p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in-50'>
                              <div className='flex items-center gap-2'>
                                <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
                                <span className='font-medium'>
                                  {t('salesOrders.stock.zeroStockNotice', 'Item is out of stock in the current fulfillment location.')}
                                </span>
                              </div>

                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                className='h-7 text-xs font-semibold text-amber-800 dark:text-amber-200 border-amber-400/50 bg-amber-100/50 dark:bg-amber-900/30 hover:bg-amber-200/50 flex items-center gap-1.5'
                                onClick={() =>
                                  setStockLocationsTarget({
                                    productName: product?.name || 'Product',
                                    variant: selectedVariant,
                                  })
                                }
                              >
                                <Warehouse className='h-3.5 w-3.5 text-amber-700' />
                                <span>{t('salesOrders.stock.viewLocationsBtn', 'Check Availability in Other Stores / Warehouses')}</span>
                              </Button>
                            </div>
                          )}

                          {/* Row 2: Quantities, Pricing, Discount, Auto Tax & Line Total */}
                          <div className='grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-dashed'>
                            {/* Quantity */}
                            <div className='space-y-1'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-[10px] font-medium text-muted-foreground'>
                                  {t('salesOrders.itemsTable.qty', 'Quantity')} *
                                </Label>
                                {selectedVariant && (
                                  <span className='text-[9px] font-mono text-muted-foreground'>
                                    Max: {availableStock}
                                  </span>
                                )}
                              </div>
                              <Input
                                type='number'
                                step='any'
                                min='0.001'
                                value={item.qty}
                                onChange={(e) => handleQtyChange(index, e.target.value)}
                                className={cn(
                                  'h-8 text-xs font-mono font-medium',
                                  isStockExceeded && 'border-destructive focus-visible:ring-destructive text-destructive font-bold'
                                )}
                                placeholder='Qty'
                              />
                              {isStockExceeded && (
                                <p className='text-[10px] text-destructive font-medium leading-tight mt-0.5 animate-in fade-in-50'>
                                  {t('salesOrders.itemsTable.stockExceeded', 'Exceeds stock ({{count}} available)', {
                                    count: availableStock ?? 0,
                                  })}
                                </p>
                              )}
                            </div>

                            {/* Unit Price */}
                            <div className='space-y-1'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-[10px] font-medium text-muted-foreground'>
                                  {t('salesOrders.itemsTable.unitPrice', 'Unit Price ({{symbol}})', { symbol: currencySymbol })} *
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
                                onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                                className='h-8 text-xs font-mono font-medium'
                                placeholder='Price'
                              />
                              {item.priceListName && !item.isResolvingPrice && (
                                <span
                                  className='text-[9px] text-emerald-600 dark:text-emerald-400 font-medium truncate block leading-tight'
                                  title={item.priceListName}
                                >
                                  ✓ {item.priceListName}
                                </span>
                              )}
                            </div>

                            {/* Discount Amount */}
                            <div className='space-y-1'>
                              <Label className='text-[10px] font-medium text-muted-foreground'>
                                {t('salesOrders.itemsTable.discount', 'Discount ({{symbol}})', { symbol: currencySymbol })}
                              </Label>
                              <Input
                                type='number'
                                step='any'
                                min='0'
                                value={item.discountAmount}
                                onChange={(e) => handleDiscountChange(index, e.target.value)}
                                className='h-8 text-xs font-mono'
                                placeholder='0.00'
                              />
                            </div>

                            {/* Tax Amount (Automatically calculated from product tax code / rate) */}
                            <div className='space-y-1'>
                              <div className='flex items-center justify-between'>
                                <Label className='text-[10px] font-medium text-muted-foreground flex items-center gap-1'>
                                  <Percent className='h-2.5 w-2.5 text-primary' />
                                  {t('salesOrders.itemsTable.tax', 'Tax ({{symbol}})', { symbol: currencySymbol })}
                                </Label>
                                {taxInfo.taxRate > 0 && (
                                  <Badge variant='outline' className='text-[8px] h-3.5 px-1 bg-primary/5 text-primary border-primary/20'>
                                    {taxInfo.taxRate}% Auto
                                  </Badge>
                                )}
                              </div>
                              <Input
                                type='number'
                                step='any'
                                min='0'
                                value={item.taxAmount}
                                onChange={(e) => updateItem(index, { taxAmount: e.target.value })}
                                className='h-8 text-xs font-mono'
                                placeholder='0.00'
                              />
                            </div>

                            {/* Line Total */}
                            <div className='col-span-2 sm:col-span-1 space-y-1 flex flex-col justify-end text-right sm:pr-1'>
                              <Label className='text-[10px] font-medium text-muted-foreground'>
                                {t('salesOrders.itemsTable.lineTotal', 'Line Total')}
                              </Label>
                              <span className='font-mono font-bold text-sm text-foreground leading-8'>
                                {currencySymbol}{lineTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* Notes & Financial Receipt Section */}
                <div className='grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t'>
                  {/* Order Remarks */}
                  <div className='md:col-span-7 space-y-1.5'>
                    <Label className='text-xs font-semibold flex items-center gap-1.5'>
                      <FileText className='h-3.5 w-3.5 text-primary' />
                      {t('salesOrders.form.notes', 'Order Notes & Shipping Instructions')}
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('salesOrders.form.notesPlaceholder', 'Special delivery notes, customer PO number, or remarks...')}
                      className='h-10 text-xs sm:text-sm'
                    />
                  </div>

                  {/* Financial Receipt Summary */}
                  <div className='md:col-span-5'>
                    <div className='rounded-xl border bg-muted/20 p-4 space-y-2 shadow-2xs'>
                      <div className='flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                        <span className='flex items-center gap-1.5'>
                          <Receipt className='h-3.5 w-3.5 text-primary' />
                          {t('salesOrders.viewDialog.summary', 'Order Summary')}
                        </span>
                        <span className='font-mono text-[11px]'>{currency}</span>
                      </div>

                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>{t('salesOrders.viewDialog.subtotal', 'Subtotal:')}</span>
                        <span className='font-mono font-medium text-foreground'>
                          {currencySymbol}{subtotal.toFixed(2)}
                        </span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className='flex justify-between text-xs text-rose-600 dark:text-rose-400'>
                          <span>{t('salesOrders.viewDialog.discount', 'Discount:')}</span>
                          <span className='font-mono font-medium'>
                            -{currencySymbol}{totalDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <span>{t('salesOrders.viewDialog.tax', 'Tax:')}</span>
                          {totalTax > 0 && (
                            <span className='text-[10px] text-muted-foreground/80 font-mono'>(auto-applied)</span>
                          )}
                        </span>
                        <span className='font-mono font-medium text-foreground'>
                          +{currencySymbol}{totalTax.toFixed(2)}
                        </span>
                      </div>

                      <div className='border-t pt-2 mt-1 flex justify-between items-baseline'>
                        <span className='font-bold text-sm text-foreground'>
                          {t('salesOrders.viewDialog.grandTotal', 'Grand Total:')}
                        </span>
                        <span className='font-mono text-lg font-extrabold text-primary'>
                          {currencySymbol}{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <DialogFooter className='p-4 border-t bg-muted/20 flex-row items-center justify-between sm:justify-between w-full'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
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
                {t('salesOrders.createDialog.reviewDraft', 'Review & Print Draft')}
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
                      ? t('salesOrders.createDialog.updatingOrder', 'Updating Order...')
                      : t('salesOrders.createDialog.creatingOrder', 'Creating Order...')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='mr-1.5 h-4 w-4' />
                    {orderToEdit
                      ? t('salesOrders.createDialog.updateOrder', 'Update Order')
                      : t('salesOrders.createDialog.createDraft', 'Create Draft')}
                  </>
                )}
              </Button>
            </div>
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
