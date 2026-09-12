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
} from 'lucide-react'
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
import { getAvailableStock } from '../utils/variant-stock'
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

  const { data: stores = [] } = useStoreOptions()
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: storeWarehouses = [] } = useStoreWarehouses(storeId)
  const { data: channels = [] } = useChannelOptions()
  const { data: customers = [] } = useCustomerOptions()
  const { data: products = [] } = useProducts()
  const { data: uoms = [] } = useUomOptions()
  const { data: currencies = [] } = useCurrencies({ onlyActive: true })
  const createOrder = useCreateOrder()
  const updateOrder = useUpdateOrder()
  const isSubmitting = createOrder.isPending || updateOrder.isPending
  const { data: orderDetail } = useOrder(orderToEdit?.id)

  // 3. Store-Dependent Warehouses: Filter fulfillment warehouses to only those linked to store
  const availableWarehouses = useMemo(() => {
    if (!storeId) return []
    if (storeWarehouses.length > 0) {
      return storeWarehouses
    }
    // Fallback if no store-warehouse mappings are defined yet in DB
    return warehouses
  }, [storeId, storeWarehouses, warehouses])

  // Derive effective warehouse (picks explicit warehouse if valid, else default linked warehouse)
  const effectiveWarehouseId = useMemo(() => {
    if (!storeId) return ''
    if (warehouseId && availableWarehouses.some((w) => w.id === warehouseId)) {
      return warehouseId
    }
    const defaultWh =
      availableWarehouses.find((w) => Boolean(w.is_default)) ||
      availableWarehouses[0]
    return defaultWh?.id || ''
  }, [storeId, warehouseId, availableWarehouses])

  // Populate form if in edit mode
  useEffect(() => {
    if (!open) return

    if (orderToEdit) {
      const current = orderDetail ?? orderToEdit
      const orderStoreId = current.store_id || current.stores?.store_id || ''
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // 1. Currency Resolution: Read exclusively from available active currencies in the currencies table
  const activeCurrencies = useMemo(() => {
    return (currencies || []).filter((c) => c.is_active !== false)
  }, [currencies])

  // Initial favorite/default currency:
  // First check the tenant favourite currency configured in settings table (app_settings),
  // then fall back to the first available active currency in currencies table, or 'USD'
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

  // Map product variants by product ID for quick lookups
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, SOVariantOption[]>()
    for (const p of products) {
      const pId = String(p.id)
      const vars: SOVariantOption[] = (p.product_variants || []).map((v) => {
        const pli = (v as { price_list_items?: Array<{ price: number | string; cost_price?: number | string | null }> }).price_list_items
        const resolvedPrice = (pli && pli.length > 0)
          ? Number(pli[0].price)
          : Number((v as { price?: number }).price || 0)
        const resolvedCost = (pli && pli.length > 0 && pli[0].cost_price != null)
          ? Number(pli[0].cost_price)
          : ((v as { cost_price?: number | null }).cost_price ? Number((v as { cost_price?: number | null }).cost_price) : null)

        const balances = (v as { stock_balances?: SOVariantStockBalance[] }).stock_balances
        const resolvedStock = (balances && balances.length > 0)
          ? balances.reduce((sum, b) => sum + Number(b.qty_available ?? (Number(b.qty_on_hand || 0) - Number(b.qty_reserved || 0))), 0)
          : Number((v as { stock_quantity?: number }).stock_quantity ?? 0)

        return {
          id: String(v.id),
          sku: v.sku,
          name: v.name,
          price: resolvedPrice,
          cost_price: resolvedCost,
          stock_quantity: resolvedStock,
          uom_id: v.uom_id || (p.base_uom_id ? String(p.base_uom_id) : null),
          stock_balances: balances,
        }
      })
      map.set(pId, vars)
    }
    return map
  }, [products])

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
  }

  const updateItem = (index: number, patch: Partial<LineItemState>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  // 2. Dynamic Price Checking: Query price_list_items table to get the cascading correct price
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

  const handleSelectProduct = async (index: number, pId: string) => {
    const pVariants = variantsByProductId.get(pId) ?? []
    const firstVariant = pVariants[0]

    if (!firstVariant) {
      updateItem(index, {
        productId: pId,
        productVariantId: '',
        unitPrice: '0',
        uomId: '',
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

    updateItem(index, {
      unitPrice: String(resolved.price),
      priceListName: resolved.priceListName,
      priceSource: resolved.source,
      isResolvingPrice: false,
    })
  }

  const handleSelectVariant = async (
    index: number,
    variantId: string,
    variantPrice?: number,
    uomId?: string | null
  ) => {
    updateItem(index, {
      productVariantId: variantId,
      ...(uomId !== undefined ? { uomId: uomId ?? '' } : {}),
      isResolvingPrice: true,
    })

    const fallbackPrice = variantPrice ?? 0
    const resolved = await resolvePriceForVariant(variantId, fallbackPrice)

    updateItem(index, {
      unitPrice: String(resolved.price),
      priceListName: resolved.priceListName,
      priceSource: resolved.source,
      isResolvingPrice: false,
    })
  }

  // Keep a ref to latest items to re-evaluate prices safely when context changes
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Re-check prices from price_list_items when store, customer, or currency changes
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
          return {
            ...item,
            unitPrice: String(res.price),
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
  }, [resolvePriceForVariant, variantsByProductId])

  // Live order calculations
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
    const selectedWh = warehouses.find((w) => w.id === warehouseId)
    const selectedCust = customers.find((c) => c.id === customerId)
    const selectedChannel = channels.find((c) => c.id === channelId)

    const compiledItems: SalesOrderDraftItem[] = items
      .filter((i) => i.productVariantId && Number(i.qty) > 0)
      .map((i) => {
        const product = products.find((p) => String(p.id ?? p.product_id) === i.productId)
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
      toast.error(t('salesOrders.createDialog.itemRequiredError', 'Please add at least one line item with valid product and quantity.'))
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
                'One or more line items exceed the available stock in the selected warehouse.'
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
                'One or more line items exceed the available stock in the selected warehouse.'
              )
            )
            return
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
        <DialogContent className='sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='p-6 pb-4 border-b bg-muted/20'>
            <DialogTitle className='text-xl font-bold flex items-center gap-2'>
              {orderToEdit ? <Edit className='h-5 w-5 text-primary' /> : <FileText className='h-5 w-5 text-primary' />}
              {orderToEdit
                ? t('salesOrders.createDialog.editTitle', 'Edit Sales Order')
                : t('salesOrders.createDialog.title', 'New Sales Order')}
              {orderToEdit?.order_number && (
                <span className='font-mono text-sm font-normal text-muted-foreground'>
                  #{orderToEdit.order_number}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {orderToEdit
                ? t('salesOrders.createDialog.editDesc', 'Update sales order items, quantities, or fulfillment details.')
                : t('salesOrders.createDialog.desc', 'Create a sales order draft with real customer, fulfillment location, and line items.')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='flex-1 p-6'>
            <div className='space-y-6'>
              {/* Header Configuration: Store, Sales Channel, Warehouse, Customer, Currency */}
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5'>
                {/* Store Select */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <Building2 className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.store', 'Store *')}
                  </Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger className='h-9 text-xs sm:text-sm'>
                      <SelectValue placeholder={t('salesOrders.form.selectStore', 'Select store...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.store_id} value={store.store_id}>
                          {store.name ?? store.store_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sales Channel Select */}
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

                {/* Warehouse Location Select (Filtered by Store) */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <Warehouse className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.warehouse', 'Fulfillment Warehouse')}
                  </Label>
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
                            : t('salesOrders.form.defaultWarehouse', 'Default warehouse...')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWarehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          <div className='flex items-center gap-1.5'>
                            <span>
                              {wh.name} {wh.code ? `(${wh.code})` : ''}
                            </span>
                            {Boolean(wh.is_default) && (
                              <span className='text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium'>
                                Default
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {storeId && availableWarehouses.length === 0 && (
                    <p className='text-[10px] text-amber-600 font-medium'>
                      {t('salesOrders.createDialog.noLinkedWarehouses', 'No warehouses linked to this store')}
                    </p>
                  )}
                </div>

                {/* Customer Select */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <User className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.customer', 'Customer')}
                  </Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className='h-9 text-xs sm:text-sm'>
                      <SelectValue placeholder={t('salesOrders.form.selectCustomer', 'Select customer...')} />
                    </SelectTrigger>
                    <SelectContent className='max-h-60'>
                      <SelectItem value={WALK_IN}>{t('salesOrders.form.walkInCustomer', 'Walk-in Customer')}</SelectItem>
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

                {/* Currency Select */}
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
              </div>

              {/* Expected Date & Notes */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
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

                <div className='space-y-1.5 sm:col-span-2'>
                  <Label className='text-xs font-semibold'>{t('salesOrders.form.notes', 'Order Notes & Instructions')}</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('salesOrders.form.notesPlaceholder', 'Special shipping remarks, delivery instructions, or PO ref...')}
                    className='h-9 text-xs sm:text-sm'
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className='space-y-3 pt-2'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('salesOrders.form.lineItems', 'Line Items')} ({items.length})
                  </h3>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                    onClick={handleAddItem}
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' /> {t('salesOrders.form.addItem', 'Add Item')}
                  </Button>
                </div>

                <div className='space-y-3'>
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
                    const isStockExceeded =
                      selectedVariant != null &&
                      Boolean(item.qty && qtyNum > (availableStock ?? 0))

                    const q = Number(item.qty) || 0
                    const p = Number(item.unitPrice) || 0
                    const d = Number(item.discountAmount) || 0
                    const tax = Number(item.taxAmount) || 0
                    const lineTotal = Math.max(0, q * p - d + tax)

                    return (
                      <div
                        key={index}
                        className='p-3.5 rounded-lg border bg-card/60 space-y-3 hover:border-primary/40 transition-colors'
                      >
                        <div className='grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end'>
                          {/* Product Picker */}
                          <div className='sm:col-span-4 space-y-1'>
                            <Label className='text-[11px] text-muted-foreground'>
                              {t('salesOrders.form.product', 'Product')} #{index + 1}
                            </Label>
                            <SOProductSelect
                              productId={item.productId}
                              products={products}
                              variantsByProductId={variantsByProductId}
                              onSelectProduct={(pId) => handleSelectProduct(index, pId)}
                            />
                          </div>

                          {/* Variant Picker */}
                          <div className='sm:col-span-4 space-y-1'>
                            <Label className='text-[11px] text-muted-foreground'>
                              {t('salesOrders.form.variantSku', 'Variant / SKU')}
                            </Label>
                            <SOVariantSelect
                              productId={item.productId}
                              variantId={item.productVariantId}
                              variants={itemVariants}
                              currencySymbol={currencySymbol}
                              onSelectVariant={(vId, price, uomId) =>
                                handleSelectVariant(index, vId, price, uomId)
                              }
                            />
                          </div>

                          {/* UOM Selector */}
                          <div className='sm:col-span-3 space-y-1'>
                            <Label className='text-[11px] text-muted-foreground'>
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

                          {/* Remove button */}
                          <div className='sm:col-span-1 flex justify-end pb-1'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-muted-foreground hover:text-destructive'
                              disabled={items.length === 1}
                              onClick={() =>
                                setItems((prev) =>
                                  prev.length === 1
                                    ? [{ ...emptyItem }]
                                    : prev.filter((_, i) => i !== index)
                                )
                              }
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>

                        {/* Quantity, Price, Discount, Tax & Line Total Row */}
                        <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-dashed'>
                          <div className='space-y-1'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[10px] text-muted-foreground'>
                                {t('salesOrders.itemsTable.qty', 'Quantity')}
                              </Label>
                              {selectedVariant && availableStock != null && (
                                <span
                                  className={cn(
                                    'text-[9px] font-mono px-1 rounded',
                                    isStockExceeded
                                      ? 'text-destructive bg-destructive/10 font-bold'
                                      : 'text-muted-foreground bg-muted'
                                  )}
                                  title={t('salesOrders.itemsTable.availableTooltip', 'Available stock for fulfillment')}
                                >
                                  {t('salesOrders.itemsTable.available', 'Avail')}: {availableStock}
                                </span>
                              )}
                            </div>
                            <Input
                              type='number'
                              step='any'
                              min='0.001'
                              value={item.qty}
                              onChange={(e) => updateItem(index, { qty: e.target.value })}
                              className={cn(
                                'h-8 text-xs',
                                isStockExceeded && 'border-destructive focus-visible:ring-destructive text-destructive font-semibold'
                              )}
                              placeholder='Qty'
                            />
                            {isStockExceeded && (
                              <div className='flex items-center gap-1 text-[10px] text-destructive font-medium leading-tight mt-1 animate-in fade-in-50'>
                                <AlertCircle className='h-3 w-3 shrink-0' />
                                <span>
                                  {t('salesOrders.itemsTable.stockExceeded', 'Exceeds stock (only {{count}} avail.)', {
                                    count: availableStock ?? 0,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className='space-y-1'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[10px] text-muted-foreground'>
                                {t('salesOrders.itemsTable.unitPrice', 'Unit Price ({{symbol}})', { symbol: currencySymbol })}
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
                              onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                              className='h-8 text-xs'
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

                          <div className='space-y-1'>
                            <Label className='text-[10px] text-muted-foreground'>
                              {t('salesOrders.itemsTable.discount', 'Discount ({{symbol}})', { symbol: currencySymbol })}
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              value={item.discountAmount}
                              onChange={(e) => updateItem(index, { discountAmount: e.target.value })}
                              className='h-8 text-xs'
                              placeholder='0.00'
                            />
                          </div>

                          <div className='space-y-1'>
                            <Label className='text-[10px] text-muted-foreground'>
                              {t('salesOrders.itemsTable.tax', 'Tax ({{symbol}})', { symbol: currencySymbol })}
                            </Label>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              value={item.taxAmount}
                              onChange={(e) => updateItem(index, { taxAmount: e.target.value })}
                              className='h-8 text-xs'
                              placeholder='0.00'
                            />
                          </div>

                          <div className='col-span-2 sm:col-span-1 space-y-1 flex flex-col justify-end text-right sm:pr-1'>
                            <Label className='text-[10px] text-muted-foreground'>{t('salesOrders.itemsTable.lineTotal', 'Line Total')}</Label>
                            <span className='font-mono font-bold text-sm text-foreground leading-8'>
                              {currencySymbol}{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Financial Summary Box */}
                <div className='flex justify-end pt-3'>
                  <div className='w-full sm:w-72 rounded-lg border bg-muted/20 p-3.5 space-y-1.5'>
                    <div className='flex justify-between text-xs text-muted-foreground'>
                      <span>{t('salesOrders.viewDialog.subtotal', 'Subtotal:')}</span>
                      <span className='font-mono font-medium text-foreground'>
                        {currencySymbol}{subtotal.toFixed(2)}
                      </span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className='flex justify-between text-xs text-rose-600'>
                        <span>{t('salesOrders.viewDialog.discount', 'Discount:')}</span>
                        <span className='font-mono font-medium'>
                          -{currencySymbol}{totalDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>{t('salesOrders.viewDialog.tax', 'Tax:')}</span>
                        <span className='font-mono font-medium text-foreground'>
                          +{currencySymbol}{totalTax.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className='border-t pt-1.5 flex justify-between items-baseline font-bold text-sm'>
                      <span>{t('salesOrders.viewDialog.grandTotal', 'Grand Total:')}</span>
                      <span className='font-mono text-base text-primary'>
                        {currencySymbol}{grandTotal.toFixed(2)}
                      </span>
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
              >
                <Eye className='mr-1.5 h-4 w-4' />
                {t('salesOrders.createDialog.reviewDraft', 'Review & Print Draft')}
              </Button>

              <Button
                type='button'
                size='sm'
                onClick={handleExecuteCreate}
                disabled={isSubmitting}
              >
                <CheckCircle2 className='mr-1.5 h-4 w-4' />
                {isSubmitting
                  ? (orderToEdit ? t('salesOrders.createDialog.updatingOrder', 'Updating Order...') : t('salesOrders.createDialog.creatingOrder', 'Creating Order...'))
                  : (orderToEdit ? t('salesOrders.createDialog.updateOrder', 'Update Order') : t('salesOrders.createDialog.createDraft', 'Create Draft'))}
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
    </>
  )
}
