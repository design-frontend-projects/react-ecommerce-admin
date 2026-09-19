import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  AlertTriangle,
  Layers,
  Calendar,
  Store as StoreIcon,
  Users,
  Percent,
  Coins,
  Radio,
  Plus,
  Trash2,
  PackagePlus,
  Package,
  Search,
  Check,
  Calculator,
  Receipt,
  Lock,
  TrendingUp,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreatePriceListWithItems,
  useUpdatePriceListWithItems,
  usePriceListOptions,
} from '../hooks/use-price-list'
import { usePriceListContext } from './price-list-provider'
import {
  getPriceListFormSchema,
  priceListTypesEnum,
  PRICE_LIST_TYPE_LABELS,
  PRICE_SOURCE_LABELS,
  type PriceListFormData,
  type PriceListType,
  type PriceListItemFormData,
  type PriceSource,
} from '../data/schema'
import {
  calculateTaxBreakdown,
  calculatePriceFromCostAndMarkup,
  calculateMarkupPercent,
  getTaxRatePercentage,
} from '../utils/pricing-calculator'

export function PriceListActionDialog() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const { open, setOpen, currentRow } = usePriceListContext()
  const createMutation = useCreatePriceListWithItems()
  const updateMutation = useUpdatePriceListWithItems()
  const { data: options, isLoading: isLoadingOptions } = usePriceListOptions()

  const [itemSearch, setItemSearch] = useState('')
  const [bulkAddProductId, setBulkAddProductId] = useState<string>('')

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const defaultStartDate = new Date().toISOString().split('T')[0]

  const formSchema = useMemo(() => getPriceListFormSchema(t), [t])

  const form = useForm<PriceListFormData>({
    resolver: zodResolver(formSchema) as unknown as Resolver<PriceListFormData>,
    defaultValues: {
      name: '',
      code: '',
      is_default: false,
      product_id: '',
      price: null,
      type: null,
      group_id: '',
      store_id: '',
      assigned_store_ids: [],
      priority: 100,
      currency_id: '',
      channel_id: '',
      tax_id: '',
      price_source: 'MANUAL',
      markup_percent: 0,
      start_date: defaultStartDate,
      end_date: '',
      is_active: true,
      description: '',
      items: [],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Reset form when currentRow changes or dialog opens
  useEffect(() => {
    if (!isOpen) {
      setItemSearch('')
      setBulkAddProductId('')
      return
    }

    if (currentRow && isEdit) {
      // Map existing price_list_items from currentRow
      const mappedItems: PriceListItemFormData[] = (currentRow.price_list_items || []).map((item) => {
        const prod =
          item.products ||
          options?.products?.find((p) => p.id === item.product_id) ||
          (item.product_variants?.product_id
            ? options?.products?.find((p) => p.id === item.product_variants?.product_id)
            : null)
        const variant =
          item.product_variants ||
          prod?.product_variants?.find((v) => v.id === item.product_variant_id)

        const rawPrice = Number(item.price) || 0
        const rawCost = item.cost_price != null ? Number(item.cost_price) : 0
        const itemTaxId = item.tax_id || currentRow.tax_id || ''
        const taxRateObj = options?.taxRates?.find((tr) => tr.id === itemTaxId) || item.tax_rates
        const taxBreakdown = calculateTaxBreakdown(rawPrice, taxRateObj?.rate, taxRateObj?.is_inclusive)
        const itemSource = (item.price_source || currentRow.price_source || 'MANUAL') as PriceSource
        const itemMarkup =
          item.markup_percent != null
            ? Number(item.markup_percent)
            : calculateMarkupPercent(rawCost, rawPrice)

        const valuation = variant?.id ? options?.variantCosts?.[variant.id] : undefined

        return {
          id: item.id,
          product_id: item.product_id || prod?.id || '',
          product_variant_id: item.product_variant_id,
          product_name: prod?.name || '',
          product_sku: prod?.sku || '',
          variant_name: variant?.name || item.product_variants?.name || 'Standard',
          variant_sku: variant?.sku || item.product_variants?.sku || '',
          regular_price: rawPrice,
          cost_price: rawCost,
          price: rawPrice,
          min_price: Number(item.min_price || 0),
          max_discount_percent: Number(item.max_discount_percent || 0),
          tax_id: itemTaxId,
          price_source: itemSource,
          markup_percent: itemMarkup,
          price_before_tax: taxBreakdown.priceBeforeTax,
          tax_amount: taxBreakdown.taxAmount,
          price_after_tax: taxBreakdown.priceAfterTax,
          tax_rate_percent: taxBreakdown.taxRatePercent,
          tax_is_inclusive: taxBreakdown.isInclusive,
          last_receipt_number: valuation?.lastReceiptNumber,
          last_receipt_date: valuation?.lastReceiptDate,
        }
      })

      const existingAssignments = currentRow.price_list_assignments || []
      const initialStoreIds = existingAssignments
        .map((a) => a.store_id)
        .filter((id): id is string => Boolean(id))

      if (initialStoreIds.length === 0 && currentRow.store_id) {
        initialStoreIds.push(currentRow.store_id)
      }

      const initialPriority = existingAssignments[0]?.priority ?? 100

      form.reset({
        name: currentRow.name || '',
        code: currentRow.code || '',
        is_default: currentRow.is_default ?? false,
        product_id: currentRow.product_id || '',
        price: currentRow.price != null ? Number(currentRow.price) : null,
        type: currentRow.type || null,
        group_id: currentRow.group_id || '',
        store_id: currentRow.store_id || '',
        assigned_store_ids: initialStoreIds,
        priority: initialPriority,
        currency_id: currentRow.currency_id || '',
        channel_id: currentRow.channel_id || '',
        tax_id: currentRow.tax_id || '',
        price_source: (currentRow.price_source as PriceSource) || 'MANUAL',
        markup_percent: currentRow.markup_percent != null ? Number(currentRow.markup_percent) : 0,
        start_date: currentRow.start_date || defaultStartDate,
        end_date: currentRow.end_date || '',
        is_active: currentRow.is_active ?? true,
        description: currentRow.description || '',
        items: mappedItems,
      })
    } else if (open === 'create') {
      form.reset({
        name: '',
        code: '',
        is_default: false,
        product_id: '',
        price: null,
        type: null,
        group_id: '',
        store_id: '',
        assigned_store_ids: [],
        priority: 100,
        currency_id: '',
        channel_id: '',
        tax_id: '',
        price_source: 'MANUAL',
        markup_percent: 0,
        start_date: defaultStartDate,
        end_date: '',
        is_active: true,
        description: '',
        items: [],
      })
    }
  }, [currentRow, open, isOpen, isEdit, options?.products, options?.taxRates, options?.variantCosts, defaultStartDate, form])

  const watchedItems = form.watch('items') || []

  // Count distinct products currently in the items list
  const distinctProductCount = useMemo(() => {
    const pids = watchedItems.map((i) => i.product_id).filter(Boolean)
    return new Set(pids).size
  }, [watchedItems])

  // Helper to re-evaluate pricing & tax for a row
  const recomputeRow = (
    variantId: string,
    source: PriceSource,
    markup: number,
    taxId: string,
    explicitPrice?: number,
    explicitCost?: number
  ) => {
    const valuation = options?.variantCosts?.[variantId]
    let cost = explicitCost !== undefined ? explicitCost : 0

    if (source === 'LAST_PURCHASE_COST') {
      cost = valuation?.lastPurchaseCost ?? cost
    } else if (source === 'AVERAGE_COST') {
      cost = valuation?.averageCost ?? cost
    } else if (valuation?.lastPurchaseCost || valuation?.averageCost) {
      cost = explicitCost !== undefined && explicitCost > 0 ? explicitCost : (valuation.lastPurchaseCost || valuation.averageCost)
    }

    let sellingPrice = explicitPrice !== undefined ? explicitPrice : 0
    if (source !== 'MANUAL') {
      sellingPrice = calculatePriceFromCostAndMarkup(cost, markup)
    }

    const taxRateObj = options?.taxRates?.find((tr) => tr.id === taxId)
    const taxBreakdown = calculateTaxBreakdown(sellingPrice, taxRateObj?.rate, taxRateObj?.is_inclusive)

    return {
      cost,
      sellingPrice,
      markup: source === 'MANUAL' && cost > 0 ? calculateMarkupPercent(cost, sellingPrice) : markup,
      taxBreakdown,
      lastReceiptNumber: valuation?.lastReceiptNumber,
      lastReceiptDate: valuation?.lastReceiptDate,
    }
  }

  // Add single empty row
  const handleAddRow = () => {
    const defaultPrice = Number(form.getValues('price')) || 0
    const defaultTaxId = form.getValues('tax_id') || ''
    const defaultSource = (form.getValues('price_source') as PriceSource) || 'MANUAL'
    const defaultMarkup = Number(form.getValues('markup_percent')) || 0

    const taxRateObj = options?.taxRates?.find((tr) => tr.id === defaultTaxId)
    const taxBreakdown = calculateTaxBreakdown(defaultPrice, taxRateObj?.rate, taxRateObj?.is_inclusive)

    append({
      product_id: '',
      product_variant_id: '',
      product_name: '',
      product_sku: '',
      variant_name: '',
      variant_sku: '',
      regular_price: defaultPrice,
      cost_price: 0,
      price: defaultPrice,
      min_price: 0,
      max_discount_percent: 0,
      tax_id: defaultTaxId,
      price_source: defaultSource,
      markup_percent: defaultMarkup,
      price_before_tax: taxBreakdown.priceBeforeTax,
      tax_amount: taxBreakdown.taxAmount,
      price_after_tax: taxBreakdown.priceAfterTax,
      tax_rate_percent: taxBreakdown.taxRatePercent,
      tax_is_inclusive: taxBreakdown.isInclusive,
    })
  }

  // Bulk add all variants of a product
  const handleBulkAddProduct = (productId: string) => {
    if (!productId || !options?.products) return
    const product = options.products.find((p) => p.id === productId)
    if (!product) return

    const existingVariantIds = new Set(
      form.getValues('items').map((i) => i.product_variant_id).filter(Boolean)
    )

    const variants = product.product_variants || []
    const defaultPrice = Number(form.getValues('price')) || 0
    const defaultTaxId = form.getValues('tax_id') || ''
    const defaultSource = (form.getValues('price_source') as PriceSource) || 'MANUAL'
    const defaultMarkup = Number(form.getValues('markup_percent')) || 0

    const newItems: PriceListItemFormData[] = []

    if (variants.length > 0) {
      for (const v of variants) {
        if (!existingVariantIds.has(v.id)) {
          const vAny = v as { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> }
          const variantRefPrice = Number(vAny.price_list_items?.[0]?.price) || defaultPrice
          const variantCost = Number(vAny.price_list_items?.[0]?.cost_price) || 0

          const computed = recomputeRow(
            v.id,
            defaultSource,
            defaultMarkup,
            defaultTaxId,
            defaultSource === 'MANUAL' ? variantRefPrice : undefined,
            variantCost
          )

          newItems.push({
            product_id: product.id,
            product_variant_id: v.id,
            product_name: product.name,
            product_sku: product.sku,
            variant_name: v.name || 'Standard',
            variant_sku: v.sku,
            regular_price: variantRefPrice,
            cost_price: computed.cost,
            price: computed.sellingPrice,
            min_price: 0,
            max_discount_percent: 0,
            tax_id: defaultTaxId,
            price_source: defaultSource,
            markup_percent: computed.markup,
            price_before_tax: computed.taxBreakdown.priceBeforeTax,
            tax_amount: computed.taxBreakdown.taxAmount,
            price_after_tax: computed.taxBreakdown.priceAfterTax,
            tax_rate_percent: computed.taxBreakdown.taxRatePercent,
            tax_is_inclusive: computed.taxBreakdown.isInclusive,
            last_receipt_number: computed.lastReceiptNumber,
            last_receipt_date: computed.lastReceiptDate,
          })
        }
      }
    }

    if (newItems.length === 0) {
      toast.info(
        t('priceList.form.duplicateVariantWarning', {
          defaultValue: 'All variants of this product are already in the list',
        })
      )
      setBulkAddProductId('')
      return
    }

    append(newItems)
    setBulkAddProductId('')
    toast.success(
      t('priceList.form.appliedToAll', {
        defaultValue: `Added ${newItems.length} variant(s) for ${product.name}`,
      })
    )
  }

  // Handle changing product in a row
  const handleProductChange = (index: number, productId: string) => {
    const product = options?.products?.find((p) => p.id === productId)
    if (!product) return

    const variants = product.product_variants || []
    const defaultPrice = Number(form.getValues('price')) || 0
    const itemSource = (form.getValues(`items.${index}.price_source`) as PriceSource) || 'MANUAL'
    const itemMarkup = Number(form.getValues(`items.${index}.markup_percent`)) || 0
    const itemTaxId = form.getValues(`items.${index}.tax_id`) || form.getValues('tax_id') || ''

    form.setValue(`items.${index}.product_id`, product.id)
    form.setValue(`items.${index}.product_name`, product.name)
    form.setValue(`items.${index}.product_sku`, product.sku)

    if (variants.length === 1) {
      const v = variants[0]
      const vAny = v as { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> }
      const variantRefPrice = Number(vAny.price_list_items?.[0]?.price) || defaultPrice
      const variantCost = Number(vAny.price_list_items?.[0]?.cost_price) || 0

      const computed = recomputeRow(
        v.id,
        itemSource,
        itemMarkup,
        itemTaxId,
        itemSource === 'MANUAL' ? variantRefPrice : undefined,
        variantCost
      )

      form.setValue(`items.${index}.product_variant_id`, v.id)
      form.setValue(`items.${index}.variant_name`, v.name || 'Standard')
      form.setValue(`items.${index}.variant_sku`, v.sku)
      form.setValue(`items.${index}.regular_price`, variantRefPrice)
      form.setValue(`items.${index}.cost_price`, computed.cost)
      form.setValue(`items.${index}.price`, computed.sellingPrice)
      form.setValue(`items.${index}.markup_percent`, computed.markup)
      form.setValue(`items.${index}.price_before_tax`, computed.taxBreakdown.priceBeforeTax)
      form.setValue(`items.${index}.tax_amount`, computed.taxBreakdown.taxAmount)
      form.setValue(`items.${index}.price_after_tax`, computed.taxBreakdown.priceAfterTax)
      form.setValue(`items.${index}.tax_rate_percent`, computed.taxBreakdown.taxRatePercent)
      form.setValue(`items.${index}.tax_is_inclusive`, computed.taxBreakdown.isInclusive)
    } else {
      form.setValue(`items.${index}.product_variant_id`, '')
      form.setValue(`items.${index}.variant_name`, '')
      form.setValue(`items.${index}.variant_sku`, '')
      form.setValue(`items.${index}.regular_price`, defaultPrice)
      form.setValue(`items.${index}.cost_price`, 0)
      form.setValue(`items.${index}.price`, defaultPrice)
      form.setValue(`items.${index}.price_before_tax`, defaultPrice)
      form.setValue(`items.${index}.tax_amount`, 0)
      form.setValue(`items.${index}.price_after_tax`, defaultPrice)
    }
  }

  // Handle changing variant in a row
  const handleVariantChange = (index: number, variantId: string) => {
    const productId = form.getValues(`items.${index}.product_id`)
    const product = options?.products?.find((p) => p.id === productId)
    const variant = product?.product_variants?.find((v) => v.id === variantId)
    if (!variant) return

    // Check duplicate
    const allItems = form.getValues('items')
    const duplicateIndex = allItems.findIndex(
      (item, i) => i !== index && item.product_variant_id === variantId
    )
    if (duplicateIndex !== -1) {
      toast.warning(
        t('priceList.form.duplicateVariantWarning', {
          defaultValue: 'This variant is already added in another row.',
        })
      )
    }

    const defaultPrice = Number(form.getValues('price')) || 0
    const vAny = variant as { price_list_items?: Array<{ price?: number | string; cost_price?: number | string }> }
    const variantRefPrice = Number(vAny.price_list_items?.[0]?.price) || defaultPrice
    const variantCost = Number(vAny.price_list_items?.[0]?.cost_price) || 0

    const itemSource = (form.getValues(`items.${index}.price_source`) as PriceSource) || 'MANUAL'
    const itemMarkup = Number(form.getValues(`items.${index}.markup_percent`)) || 0
    const itemTaxId = form.getValues(`items.${index}.tax_id`) || form.getValues('tax_id') || ''

    const computed = recomputeRow(
      variant.id,
      itemSource,
      itemMarkup,
      itemTaxId,
      itemSource === 'MANUAL' ? variantRefPrice : undefined,
      variantCost
    )

    form.setValue(`items.${index}.product_variant_id`, variant.id)
    form.setValue(`items.${index}.variant_name`, variant.name || 'Standard')
    form.setValue(`items.${index}.variant_sku`, variant.sku)
    form.setValue(`items.${index}.regular_price`, variantRefPrice)
    form.setValue(`items.${index}.cost_price`, computed.cost)
    form.setValue(`items.${index}.price`, computed.sellingPrice)
    form.setValue(`items.${index}.markup_percent`, computed.markup)
    form.setValue(`items.${index}.price_before_tax`, computed.taxBreakdown.priceBeforeTax)
    form.setValue(`items.${index}.tax_amount`, computed.taxBreakdown.taxAmount)
    form.setValue(`items.${index}.price_after_tax`, computed.taxBreakdown.priceAfterTax)
    form.setValue(`items.${index}.tax_rate_percent`, computed.taxBreakdown.taxRatePercent)
    form.setValue(`items.${index}.tax_is_inclusive`, computed.taxBreakdown.isInclusive)
    form.setValue(`items.${index}.last_receipt_number`, computed.lastReceiptNumber)
    form.setValue(`items.${index}.last_receipt_date`, computed.lastReceiptDate)
  }

  // Row Price Source change handler
  const handleItemSourceChange = (index: number, newSource: PriceSource) => {
    const variantId = form.getValues(`items.${index}.product_variant_id`)
    const currentCost = Number(form.getValues(`items.${index}.cost_price`)) || 0
    const currentPrice = Number(form.getValues(`items.${index}.price`)) || 0
    const markup = Number(form.getValues(`items.${index}.markup_percent`)) || 0
    const taxId = form.getValues(`items.${index}.tax_id`) || ''

    const computed = recomputeRow(
      variantId,
      newSource,
      markup,
      taxId,
      newSource === 'MANUAL' ? currentPrice : undefined,
      currentCost
    )

    form.setValue(`items.${index}.price_source`, newSource)
    form.setValue(`items.${index}.cost_price`, computed.cost)
    form.setValue(`items.${index}.price`, computed.sellingPrice)
    form.setValue(`items.${index}.markup_percent`, computed.markup)
    form.setValue(`items.${index}.price_before_tax`, computed.taxBreakdown.priceBeforeTax)
    form.setValue(`items.${index}.tax_amount`, computed.taxBreakdown.taxAmount)
    form.setValue(`items.${index}.price_after_tax`, computed.taxBreakdown.priceAfterTax)
    form.setValue(`items.${index}.last_receipt_number`, computed.lastReceiptNumber)
    form.setValue(`items.${index}.last_receipt_date`, computed.lastReceiptDate)

    if (newSource === 'LAST_PURCHASE_COST' && computed.cost === 0) {
      toast.info(
        t('priceList.form.noReceiptWarning', {
          defaultValue: 'No goods receipt unit cost found for this variant. Cost is 0.00.',
        })
      )
    }
  }

  // Row Markup change handler
  const handleItemMarkupChange = (index: number, newMarkup: number) => {
    const variantId = form.getValues(`items.${index}.product_variant_id`)
    const currentCost = Number(form.getValues(`items.${index}.cost_price`)) || 0
    const currentPrice = Number(form.getValues(`items.${index}.price`)) || 0
    const source = (form.getValues(`items.${index}.price_source`) as PriceSource) || 'MANUAL'
    const taxId = form.getValues(`items.${index}.tax_id`) || ''

    form.setValue(`items.${index}.markup_percent`, newMarkup)

    if (source !== 'MANUAL') {
      const computed = recomputeRow(variantId, source, newMarkup, taxId, undefined, currentCost)
      form.setValue(`items.${index}.price`, computed.sellingPrice)
      form.setValue(`items.${index}.price_before_tax`, computed.taxBreakdown.priceBeforeTax)
      form.setValue(`items.${index}.tax_amount`, computed.taxBreakdown.taxAmount)
      form.setValue(`items.${index}.price_after_tax`, computed.taxBreakdown.priceAfterTax)
    }
  }

  // Row Price change handler (Manual mode)
  const handleItemPriceChange = (index: number, newPrice: number) => {
    const variantId = form.getValues(`items.${index}.product_variant_id`)
    const cost = Number(form.getValues(`items.${index}.cost_price`)) || 0
    const source = (form.getValues(`items.${index}.price_source`) as PriceSource) || 'MANUAL'
    const taxId = form.getValues(`items.${index}.tax_id`) || ''

    form.setValue(`items.${index}.price`, newPrice)

    const computed = recomputeRow(variantId, source, 0, taxId, newPrice, cost)
    form.setValue(`items.${index}.markup_percent`, computed.markup)
    form.setValue(`items.${index}.price_before_tax`, computed.taxBreakdown.priceBeforeTax)
    form.setValue(`items.${index}.tax_amount`, computed.taxBreakdown.taxAmount)
    form.setValue(`items.${index}.price_after_tax`, computed.taxBreakdown.priceAfterTax)
  }

  // Row Tax Rate change handler
  const handleItemTaxChange = (index: number, newTaxId: string) => {
    const price = Number(form.getValues(`items.${index}.price`)) || 0
    const taxRateObj = options?.taxRates?.find((tr) => tr.id === newTaxId)
    const breakdown = calculateTaxBreakdown(price, taxRateObj?.rate, taxRateObj?.is_inclusive)

    form.setValue(`items.${index}.tax_id`, newTaxId)
    form.setValue(`items.${index}.price_before_tax`, breakdown.priceBeforeTax)
    form.setValue(`items.${index}.tax_amount`, breakdown.taxAmount)
    form.setValue(`items.${index}.price_after_tax`, breakdown.priceAfterTax)
    form.setValue(`items.${index}.tax_rate_percent`, breakdown.taxRatePercent)
    form.setValue(`items.${index}.tax_is_inclusive`, breakdown.isInclusive)
  }

  // Bulk Apply Default Price to all items
  const handleApplyDefaultPriceToAll = () => {
    const currentPrice = Number(form.getValues('price')) || 0
    const currentItems = form.getValues('items')
    const updatedItems = currentItems.map((item) => {
      const taxRateObj = options?.taxRates?.find((tr) => tr.id === item.tax_id)
      const breakdown = calculateTaxBreakdown(currentPrice, taxRateObj?.rate, taxRateObj?.is_inclusive)
      const cost = Number(item.cost_price) || 0
      return {
        ...item,
        price: currentPrice,
        price_source: 'MANUAL' as PriceSource,
        markup_percent: cost > 0 ? calculateMarkupPercent(cost, currentPrice) : 0,
        price_before_tax: breakdown.priceBeforeTax,
        tax_amount: breakdown.taxAmount,
        price_after_tax: breakdown.priceAfterTax,
      }
    })
    replace(updatedItems)
    toast.success(
      t('priceList.form.appliedToAll', {
        defaultValue: 'Applied default price to all variants',
      })
    )
  }

  // Bulk Apply Default Tax Rate to all items
  const handleApplyTaxToAll = () => {
    const defaultTaxId = form.getValues('tax_id') || ''
    const currentItems = form.getValues('items')
    const taxRateObj = options?.taxRates?.find((tr) => tr.id === defaultTaxId)

    const updatedItems = currentItems.map((item) => {
      const price = Number(item.price) || 0
      const breakdown = calculateTaxBreakdown(price, taxRateObj?.rate, taxRateObj?.is_inclusive)
      return {
        ...item,
        tax_id: defaultTaxId,
        price_before_tax: breakdown.priceBeforeTax,
        tax_amount: breakdown.taxAmount,
        price_after_tax: breakdown.priceAfterTax,
        tax_rate_percent: breakdown.taxRatePercent,
        tax_is_inclusive: breakdown.isInclusive,
      }
    })
    replace(updatedItems)
    toast.success(
      t('priceList.form.taxAppliedToAll', {
        defaultValue: 'Applied default tax rate to all items',
      })
    )
  }

  // Bulk Apply Default Price Source & Markup to all items
  const handleApplySourceAndMarkupToAll = () => {
    const defaultSource = (form.getValues('price_source') as PriceSource) || 'MANUAL'
    const defaultMarkup = Number(form.getValues('markup_percent')) || 0
    const currentItems = form.getValues('items')

    const updatedItems = currentItems.map((item) => {
      const computed = recomputeRow(
        item.product_variant_id,
        defaultSource,
        defaultMarkup,
        item.tax_id || '',
        defaultSource === 'MANUAL' ? Number(item.price) : undefined,
        Number(item.cost_price) || 0
      )
      return {
        ...item,
        price_source: defaultSource,
        cost_price: computed.cost,
        price: computed.sellingPrice,
        markup_percent: computed.markup,
        price_before_tax: computed.taxBreakdown.priceBeforeTax,
        tax_amount: computed.taxBreakdown.taxAmount,
        price_after_tax: computed.taxBreakdown.priceAfterTax,
        last_receipt_number: computed.lastReceiptNumber,
        last_receipt_date: computed.lastReceiptDate,
      }
    })
    replace(updatedItems)
    toast.success(
      t('priceList.form.sourceAppliedToAll', {
        defaultValue: 'Applied price source strategy and markup to all items',
      })
    )
  }

  const onSubmit = async (values: PriceListFormData) => {
    try {
      const sanitizedPayload: PriceListFormData = {
        ...values,
        product_id: values.product_id ? values.product_id : (values.items?.[0]?.product_id || null),
        price: values.price !== undefined && values.price !== null ? values.price : null,
        group_id: values.group_id ? values.group_id : null,
        store_id: values.store_id ? values.store_id : null,
        currency_id: values.currency_id ? values.currency_id : null,
        channel_id: values.channel_id ? values.channel_id : null,
        tax_id: values.tax_id ? values.tax_id : null,
        price_source: values.price_source || 'MANUAL',
        markup_percent: values.markup_percent !== undefined && values.markup_percent !== null ? values.markup_percent : 0,
        end_date: values.end_date ? values.end_date : null,
        description: values.description ? values.description : null,
        type: values.type ? values.type : null,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...sanitizedPayload,
        })
        toast.success(
          t('priceList.form.updateSuccess', {
            defaultValue: 'Price list updated successfully',
          })
        )
      } else {
        await createMutation.mutateAsync(sanitizedPayload)
        toast.success(
          t('priceList.form.createSuccess', {
            defaultValue: 'Price list created successfully',
          })
        )
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error(
        (error as Error)?.message ||
          t('common.errorOccurred', { defaultValue: 'Something went wrong. Please try again.' })
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[95vh] overflow-y-auto sm:max-w-[1360px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Layers className='h-5 w-5 text-primary' />
            {isEdit
              ? t('priceList.editPriceList', { defaultValue: 'Edit Price List' })
              : t('priceList.addPriceList', { defaultValue: 'Create Price List' })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('priceList.editDescription', {
                  defaultValue: 'Modify pricing schedule, customer tier, tax rules, and multi-product price rules.',
                })
              : t('priceList.createDescription', {
                  defaultValue: 'Define a price list schedule, configure tax and cost-markup strategy, and add product variant pricing rules.',
                })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6 py-2'>
            {/* 1. Header Information Section */}
            <div className='rounded-lg border bg-card p-4 shadow-xs space-y-4'>
              <div className='flex items-center justify-between border-b pb-2'>
                <h3 className='text-sm font-semibold uppercase tracking-wider text-muted-foreground'>
                  {t('priceList.form.headerSection', { defaultValue: 'General Information' })}
                </h3>
                {fields.length > 0 && (
                  <Badge variant='outline' className='text-xs font-mono'>
                    {distinctProductCount} {t('priceList.form.productsBadge', { defaultValue: 'Products' })} •{' '}
                    {fields.length} {t('priceList.form.itemsBadge', { defaultValue: 'Items' })}
                  </Badge>
                )}
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Price List Name */}
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('priceList.form.name', { defaultValue: 'Price List Name' })}{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('priceList.form.namePlaceholder', {
                            defaultValue: 'e.g. Wholesale VIP Tier 1, Ramadan Menu 2026',
                          })}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unique Code */}
                <FormField
                  control={form.control}
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('priceList.form.code', { defaultValue: 'Pricing Code / ID' })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('priceList.form.codePlaceholder', {
                            defaultValue: 'e.g. WS-VIP-01, RET-STD',
                          })}
                          {...field}
                          value={field.value || ''}
                          className='font-mono uppercase'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Is Default Switch */}
                <FormField
                  control={form.control}
                  name='is_default'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-sm font-medium'>
                          {t('priceList.form.isDefault', { defaultValue: 'Default Base Price List' })}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t('priceList.form.isDefaultDesc', {
                            defaultValue: 'Use as default fallback price list for this tenant',
                          })}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Active Status Switch */}
                <FormField
                  control={form.control}
                  name='is_active'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs'>
                      <div className='space-y-0.5'>
                        <FormLabel>{t('priceList.form.activeStatus', { defaultValue: 'Active Status' })}</FormLabel>
                        <div className='text-xs text-muted-foreground'>
                          {t('priceList.form.activeHelp', {
                            defaultValue: 'Enable or disable this pricing rule.',
                          })}
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Price List Type */}
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('priceList.form.type', { defaultValue: 'Pricing Tier / Type' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val || null)}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.selectType', {
                                defaultValue: 'Standard / None',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priceListTypesEnum.options.map((opt) => {
                            const config = PRICE_LIST_TYPE_LABELS[opt as PriceListType]
                            return (
                              <SelectItem key={opt} value={opt}>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className={`text-xs ${config?.color}`}>
                                    {isAr ? config?.labelAr : config?.label}
                                  </Badge>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optional Default / Fallback Price */}
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center justify-between'>
                        <span>{t('priceList.form.defaultPrice', { defaultValue: 'Default / Fallback Price' })}</span>
                        {fields.length > 0 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-xs text-primary'
                            onClick={handleApplyDefaultPriceToAll}
                          >
                            <Sparkles className='mr-1 h-3 w-3' />
                            {t('priceList.form.applyToAll', { defaultValue: 'Apply to All' })}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute left-3 top-2.5 text-sm text-muted-foreground'>
                            $
                          </span>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            placeholder='0.00'
                            className='pl-7'
                            {...field}
                            value={field.value ?? ''}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Customer Group */}
                <FormField
                  control={form.control}
                  name='group_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Users className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.customerGroup', { defaultValue: 'Target Customer Group' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'ALL' ? '' : val)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.allGroups', {
                                defaultValue: 'All Customers (No Group Restriction)',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ALL'>
                            {t('priceList.form.allGroups', {
                              defaultValue: 'All Customers (No Group Restriction)',
                            })}
                          </SelectItem>
                          {options?.customerGroups?.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                              {g.discount_percentage
                                ? ` (${g.discount_percentage}% ${t('priceList.form.discountSuffix', { defaultValue: 'discount' })})`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency */}
                <FormField
                  control={form.control}
                  name='currency_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Coins className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.currency', { defaultValue: 'Currency' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'DEFAULT' ? '' : val)}
                        value={field.value || 'DEFAULT'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.defaultCurrency', {
                                defaultValue: 'Tenant Default Currency',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='DEFAULT'>
                            {t('priceList.form.defaultCurrency', {
                              defaultValue: 'Tenant Default Currency',
                            })}
                          </SelectItem>
                          {options?.currencies?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.symbol} — {c.name} ({c.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Channel */}
                <FormField
                  control={form.control}
                  name='channel_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Radio className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.channel', { defaultValue: 'Sales Channel' })}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'ALL' ? '' : val)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('priceList.form.allChannels', {
                                defaultValue: 'All Channels',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ALL'>
                            {t('priceList.form.allChannels', {
                              defaultValue: 'All Channels',
                            })}
                          </SelectItem>
                          {options?.channels?.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {isAr ? ch.name_ar || ch.name : ch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resolution Priority */}
                <FormField
                  control={form.control}
                  name='priority'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Layers className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.priority', { defaultValue: 'Resolution Priority' })}
                      </FormLabel>
                      <FormControl>
                        <div className='flex items-center gap-2'>
                          <Input
                            type='number'
                            min={0}
                            max={999}
                            {...field}
                            value={field.value ?? 100}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className='h-9 w-28 font-mono'
                          />
                          <Badge variant='outline' className='text-[11px] font-normal'>
                            {(field.value ?? 100) <= 15
                              ? '⚡ High (Promo/Flash)'
                              : (field.value ?? 100) <= 35
                              ? '⭐ VIP Tier'
                              : (field.value ?? 100) <= 70
                              ? '🏢 Wholesale/B2B'
                              : '🏷️ Standard (100)'}
                          </Badge>
                        </div>
                      </FormControl>
                      <FormDescription className='text-[11px]'>
                        {t('priceList.form.priorityDescription', {
                          defaultValue: 'Lower number = higher priority. e.g. Priority 10 Promo overrides Priority 100 Retail.',
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Validity Row */}
                <FormField
                  control={form.control}
                  name='start_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.startDate', { defaultValue: 'Effective Start Date' })}{' '}
                        <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='end_date'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        {t('priceList.form.endDate', {
                          defaultValue: 'End Date (Optional)',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input type='date' {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Assigned Stores (Multi-Store Assignment Scope) */}
                <FormField
                  control={form.control}
                  name='assigned_store_ids'
                  render={({ field }) => {
                    const selectedStores = field.value || []
                    const isAllStores = selectedStores.length === 0

                    return (
                      <FormItem className='col-span-1 md:col-span-2 rounded-lg border border-border/60 p-3 bg-muted/20'>
                        <div className='flex items-center justify-between'>
                          <FormLabel className='flex items-center gap-1.5 font-medium'>
                            <StoreIcon className='h-3.5 w-3.5 text-primary' />
                            {t('priceList.form.assignedStores', { defaultValue: 'Assigned Stores / Outlets' })}
                          </FormLabel>
                          <span className='text-xs font-medium text-muted-foreground'>
                            {isAllStores
                              ? t('priceList.form.allStoresActive', { defaultValue: '🌐 All Stores (Global Scope)' })
                              : `${selectedStores.length} store(s) assigned`}
                          </span>
                        </div>
                        <div className='flex flex-wrap gap-1.5 pt-2'>
                          <Badge
                            variant={isAllStores ? 'default' : 'outline'}
                            className='cursor-pointer text-xs font-normal py-1 px-2.5 transition-all select-none'
                            onClick={() => {
                              field.onChange([])
                              form.setValue('store_id', '')
                            }}
                          >
                            {t('priceList.form.allStoresGlobal', { defaultValue: 'All Stores (Global)' })}
                          </Badge>
                          {options?.stores?.map((s) => {
                            const isSelected = selectedStores.includes(s.store_id)
                            return (
                              <Badge
                                key={s.store_id}
                                variant={isSelected ? 'default' : 'outline'}
                                className={cn(
                                  'cursor-pointer text-xs font-normal py-1 px-2.5 transition-all select-none flex items-center gap-1',
                                  isSelected && 'bg-primary text-primary-foreground font-medium'
                                )}
                                onClick={() => {
                                  let next: string[]
                                  if (isSelected) {
                                    next = selectedStores.filter((id) => id !== s.store_id)
                                  } else {
                                    next = [...selectedStores, s.store_id]
                                  }
                                  field.onChange(next)
                                  form.setValue('store_id', next[0] || '')
                                }}
                              >
                                {s.name || s.store_id}
                                {isSelected && <Check className='h-3 w-3' />}
                              </Badge>
                            )
                          })}
                        </div>
                        <FormDescription className='text-[11px] pt-1 text-muted-foreground'>
                          {t('priceList.form.multiStoreHelp', {
                            defaultValue:
                              'Assign one or multiple stores to this price list without duplicating items. When none selected, applies to all stores.',
                          })}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>

              {/* Description / Notes */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('priceList.form.description', { defaultValue: 'Notes & Description' })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('priceList.form.descriptionPlaceholder', {
                          defaultValue: 'Reason for price change, campaign notes, or promotional terms...',
                        })}
                        className='resize-none h-16'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 2. Pricing Strategy & Tax Defaults Header Card */}
            <div className='rounded-lg border border-primary/20 bg-primary/5 p-4 shadow-xs space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-2'>
                <div className='flex items-center gap-2'>
                  <Calculator className='h-4 w-4 text-primary' />
                  <h3 className='text-sm font-semibold uppercase tracking-wider text-primary'>
                    {t('priceList.form.strategySection', { defaultValue: 'Pricing Strategy & Default Tax Settings' })}
                  </h3>
                </div>
                {fields.length > 0 && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs border-primary/30 text-primary hover:bg-primary/10'
                    onClick={handleApplySourceAndMarkupToAll}
                  >
                    <Sparkles className='mr-1.5 h-3 w-3' />
                    {t('priceList.form.applyAllDefaults', { defaultValue: 'Apply Strategy to All Items' })}
                  </Button>
                )}
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1'>
                {/* Default Tax Rate */}
                <FormField
                  control={form.control}
                  name='tax_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1 font-medium'>
                          <Receipt className='h-3.5 w-3.5 text-muted-foreground' />
                          {t('priceList.form.defaultTaxRate', { defaultValue: 'Default Tax Rate' })}
                        </span>
                        {fields.length > 0 && (
                          <button
                            type='button'
                            className='text-[11px] text-primary hover:underline'
                            onClick={handleApplyTaxToAll}
                          >
                            {t('priceList.form.applyToAll', { defaultValue: 'Apply' })}
                          </button>
                        )}
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'NONE' ? '' : val)}
                        value={field.value || 'NONE'}
                      >
                        <FormControl>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue
                              placeholder={t('priceList.form.selectTaxRate', {
                                defaultValue: 'No Tax (0%)',
                              })}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='NONE' className='text-xs'>
                            {t('priceList.form.noTax', { defaultValue: 'No Tax (0%)' })}
                          </SelectItem>
                          {options?.taxRates?.map((tr) => (
                            <SelectItem key={tr.id} value={tr.id} className='text-xs'>
                              <div className='flex items-center gap-2'>
                                <span className='font-medium'>{tr.tax_type} ({getTaxRatePercentage(tr.rate)}%)</span>
                                <span className='text-[10px] text-muted-foreground'>
                                  {tr.is_inclusive ? '• Incl' : '• Excl'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className='text-[10px] text-muted-foreground'>
                        {t('priceList.form.taxHelp', { defaultValue: 'Default tax cascaded to line items' })}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Default Price Source */}
                <FormField
                  control={form.control}
                  name='price_source'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1 font-medium'>
                          <Tag className='h-3.5 w-3.5 text-muted-foreground' />
                          {t('priceList.form.defaultPriceSource', { defaultValue: 'Default Price Source' })}
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val as PriceSource)}
                        value={field.value || 'MANUAL'}
                      >
                        <FormControl>
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='MANUAL' className='text-xs'>
                            {t('priceList.sources.manual', { defaultValue: 'Manual (Enter Selling Price)' })}
                          </SelectItem>
                          <SelectItem value='LAST_PURCHASE_COST' className='text-xs'>
                            {t('priceList.sources.lastPurchaseCost', { defaultValue: 'Last Purchase Cost (Goods Receipt)' })}
                          </SelectItem>
                          <SelectItem value='AVERAGE_COST' className='text-xs'>
                            {t('priceList.sources.averageCost', { defaultValue: 'Average Cost (Stock Balances)' })}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className='text-[10px] text-muted-foreground'>
                        {t('priceList.form.sourceHelp', { defaultValue: 'How selling prices are determined' })}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Default Markup % */}
                <FormField
                  control={form.control}
                  name='markup_percent'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1 font-medium'>
                          <TrendingUp className='h-3.5 w-3.5 text-muted-foreground' />
                          {t('priceList.form.defaultMarkup', { defaultValue: 'Default Cost Markup %' })}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            type='number'
                            step='0.1'
                            placeholder='0.0'
                            className='h-8 pr-7 text-xs font-mono'
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                          <span className='absolute right-2 top-2 text-xs text-muted-foreground'>%</span>
                        </div>
                      </FormControl>
                      <FormDescription className='text-[10px] text-muted-foreground'>
                        {t('priceList.form.markupDesc', { defaultValue: 'Selling Price = Cost × (1 + Markup%)' })}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 3. Child Items Matrix: One-to-Many Products & Variants */}
            <div className='rounded-lg border bg-card p-4 shadow-xs space-y-4'>
              <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
                <div>
                  <h3 className='text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Percent className='h-4 w-4 text-primary' />
                    {t('priceList.form.variantItemsSection', {
                      defaultValue: 'Priced Products & Variants',
                    })}
                  </h3>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    {t('priceList.form.variantItemsHelp', {
                      defaultValue:
                        'Assign price source, cost markup, floor price thresholds, and view calculated pre/post tax values.',
                    })}
                  </p>
                </div>

                {/* Items Toolbar Actions */}
                <div className='flex flex-wrap items-center gap-2'>
                  {/* Bulk Add Product Quick Selector */}
                  <div className='flex items-center gap-1.5'>
                    <Select
                      value={bulkAddProductId}
                      onValueChange={(val) => {
                        setBulkAddProductId(val)
                        if (val) handleBulkAddProduct(val)
                      }}
                      disabled={isLoadingOptions}
                    >
                      <SelectTrigger className='h-8 w-[200px] text-xs'>
                        <PackagePlus className='mr-1.5 h-3.5 w-3.5 text-primary' />
                        <SelectValue
                          placeholder={t('priceList.form.bulkAddPrompt', {
                            defaultValue: 'Bulk Add Product...',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent className='max-h-60'>
                        {options?.products?.map((p) => (
                          <SelectItem key={p.id} value={p.id} className='text-xs'>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Add Single Row Button */}
                  <Button
                    type='button'
                    variant='default'
                    size='sm'
                    className='h-8 text-xs'
                    onClick={handleAddRow}
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' />
                    {t('priceList.form.addRow', { defaultValue: 'Add Row' })}
                  </Button>

                  {/* Clear All Button */}
                  {fields.length > 0 && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 text-xs text-muted-foreground hover:text-destructive'
                      onClick={() => replace([])}
                    >
                      {t('priceList.form.clearAll', { defaultValue: 'Clear All' })}
                    </Button>
                  )}
                </div>
              </div>

              {/* Items Search and Stats Bar */}
              {fields.length > 3 && (
                <div className='flex items-center justify-between gap-3'>
                  <div className='relative flex-1 max-w-xs'>
                    <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      placeholder={t('priceList.form.searchItems', {
                        defaultValue: 'Search items in price list...',
                      })}
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className='h-8 pl-8 text-xs'
                    />
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {distinctProductCount} {t('priceList.form.productsBadge', { defaultValue: 'Products' })} •{' '}
                    {fields.length} {t('priceList.form.itemsBadge', { defaultValue: 'Items' })}
                  </div>
                </div>
              )}

              {/* Items Form Table */}
              {fields.length > 0 ? (
                <div className='overflow-x-auto rounded-md border'>
                  <Table className='min-w-[1240px]'>
                    <TableHeader className='bg-muted/50'>
                      <TableRow>
                        <TableHead className='w-[35px] text-center'>#</TableHead>
                        <TableHead className='w-[170px]'>
                          {t('priceList.form.productColumn', { defaultValue: 'Product' })}{' '}
                          <span className='text-destructive'>*</span>
                        </TableHead>
                        <TableHead className='w-[160px]'>
                          {t('priceList.form.variantColumn', { defaultValue: 'Variant / SKU' })}{' '}
                          <span className='text-destructive'>*</span>
                        </TableHead>
                        <TableHead className='w-[135px]'>
                          {t('priceList.table.source', { defaultValue: 'Price Source' })}
                        </TableHead>
                        <TableHead className='w-[110px] text-right'>
                          {t('priceList.table.costRef', { defaultValue: 'Cost / Ref' })}
                        </TableHead>
                        <TableHead className='w-[85px]'>
                          {t('priceList.table.markup', { defaultValue: 'Markup %' })}
                        </TableHead>
                        <TableHead className='w-[120px]'>
                          {t('priceList.table.sellingPrice', { defaultValue: 'Selling Price' })}{' '}
                          <span className='text-destructive'>*</span>
                        </TableHead>
                        <TableHead className='w-[130px]'>
                          {t('priceList.table.taxRate', { defaultValue: 'Tax Rate' })}
                        </TableHead>
                        <TableHead className='w-[105px] text-right bg-muted/20'>
                          <div className='flex flex-col items-end leading-tight'>
                            <span>{t('priceList.table.priceBeforeTax', { defaultValue: 'Price (Excl)' })}</span>
                            <span className='text-[9px] font-normal text-muted-foreground'>(Read-Only)</span>
                          </div>
                        </TableHead>
                        <TableHead className='w-[90px] text-right bg-muted/20'>
                          <div className='flex flex-col items-end leading-tight'>
                            <span>{t('priceList.table.taxAmount', { defaultValue: 'Tax Amt' })}</span>
                            <span className='text-[9px] font-normal text-muted-foreground'>(Read-Only)</span>
                          </div>
                        </TableHead>
                        <TableHead className='w-[110px] text-right bg-muted/20'>
                          <div className='flex flex-col items-end leading-tight text-emerald-700 dark:text-emerald-400'>
                            <span>{t('priceList.table.priceAfterTax', { defaultValue: 'Price (Incl)' })}</span>
                            <span className='text-[9px] font-normal text-muted-foreground'>(Read-Only)</span>
                          </div>
                        </TableHead>
                        <TableHead className='w-[100px]'>
                          {t('priceList.table.floorPrice', { defaultValue: 'Floor (Min)' })}
                        </TableHead>
                        <TableHead className='w-[90px]'>
                          {t('priceList.table.maxDiscount', { defaultValue: 'Max Disc %' })}
                        </TableHead>
                        <TableHead className='w-[70px] text-right'>
                          {t('priceList.table.margin', { defaultValue: 'Margin' })}
                        </TableHead>
                        <TableHead className='w-[40px] text-center'></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((fieldItem, index) => {
                        const selectedProductId = form.watch(`items.${index}.product_id`)
                        const selectedVariantId = form.watch(`items.${index}.product_variant_id`)
                        const variantPrice = Number(form.watch(`items.${index}.price`)) || 0
                        const variantMinPrice = Number(form.watch(`items.${index}.min_price`)) || 0
                        const cost = Number(form.watch(`items.${index}.cost_price`)) || 0
                        const regularPrice = Number(form.watch(`items.${index}.regular_price`)) || 0
                        const itemSource = (form.watch(`items.${index}.price_source`) as PriceSource) || 'MANUAL'
                        const itemTaxId = form.watch(`items.${index}.tax_id`) || ''
                        const itemMarkup = form.watch(`items.${index}.markup_percent`) ?? 0

                        const product = options?.products?.find((p) => p.id === selectedProductId)
                        const productVariants = product?.product_variants || []
                        const valuation = selectedVariantId ? options?.variantCosts?.[selectedVariantId] : undefined

                        const taxRateObj = options?.taxRates?.find((tr) => tr.id === itemTaxId)
                        const taxBreakdown = calculateTaxBreakdown(variantPrice, taxRateObj?.rate, taxRateObj?.is_inclusive)

                        // Filter by in-table search if present
                        if (itemSearch) {
                          const query = itemSearch.toLowerCase()
                          const pName = (product?.name || fieldItem.product_name || '').toLowerCase()
                          const pSku = (product?.sku || fieldItem.product_sku || '').toLowerCase()
                          const vName = (fieldItem.variant_name || '').toLowerCase()
                          const vSku = (fieldItem.variant_sku || '').toLowerCase()
                          if (
                            !pName.includes(query) &&
                            !pSku.includes(query) &&
                            !vName.includes(query) &&
                            !vSku.includes(query)
                          ) {
                            return null
                          }
                        }

                        const isBelowCost = cost > 0 && variantPrice < cost
                        const isFloorExceeded = variantMinPrice > 0 && variantMinPrice > variantPrice
                        const marginPct =
                          cost > 0 && variantPrice > 0
                            ? (((variantPrice - cost) / variantPrice) * 100).toFixed(1)
                            : null

                        return (
                          <TableRow key={fieldItem.id || index} className='hover:bg-muted/30'>
                            {/* Row index */}
                            <TableCell className='text-center text-xs text-muted-foreground font-mono'>
                              {index + 1}
                            </TableCell>

                            {/* Product Selector */}
                            <TableCell>
                              <Select
                                value={selectedProductId || ''}
                                onValueChange={(val) => handleProductChange(index, val)}
                              >
                                <SelectTrigger className='h-8 text-xs'>
                                  <SelectValue
                                    placeholder={t('priceList.form.selectProduct', {
                                      defaultValue: 'Select product...',
                                    })}
                                  />
                                </SelectTrigger>
                                <SelectContent className='max-h-60'>
                                  {options?.products?.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className='text-xs'>
                                      <div className='flex items-center justify-between gap-2'>
                                        <span className='font-medium'>{p.name}</span>
                                        <span className='text-[10px] text-muted-foreground font-mono'>
                                          {p.sku}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Variant Selector */}
                            <TableCell>
                              <Select
                                value={selectedVariantId || ''}
                                onValueChange={(val) => handleVariantChange(index, val)}
                                disabled={!selectedProductId || productVariants.length === 0}
                              >
                                <SelectTrigger className='h-8 text-xs'>
                                  <SelectValue
                                    placeholder={
                                      !selectedProductId
                                        ? t('priceList.form.selectProductFirst', {
                                            defaultValue: 'Select product first',
                                          })
                                        : productVariants.length === 0
                                          ? t('priceList.types.standard', { defaultValue: 'Standard' })
                                          : t('priceList.form.selectVariant', { defaultValue: 'Select variant...' })
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent className='max-h-60'>
                                  {productVariants.map((v) => (
                                    <SelectItem key={v.id} value={v.id} className='text-xs'>
                                      <div className='flex items-center justify-between gap-2'>
                                        <span>{v.name || t('priceList.types.standard', { defaultValue: 'Standard' })}</span>
                                        <span className='text-[10px] text-muted-foreground font-mono'>
                                          {v.sku}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Price Source Dropdown */}
                            <TableCell>
                              <Select
                                value={itemSource}
                                onValueChange={(val: PriceSource) => handleItemSourceChange(index, val)}
                              >
                                <SelectTrigger className='h-8 text-xs font-medium'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='MANUAL' className='text-xs'>
                                    {t('priceList.sources.manualShort', { defaultValue: 'Manual' })}
                                  </SelectItem>
                                  <SelectItem value='LAST_PURCHASE_COST' className='text-xs'>
                                    {t('priceList.sources.lastPurchaseCostShort', { defaultValue: 'Last GR Cost' })}
                                  </SelectItem>
                                  <SelectItem value='AVERAGE_COST' className='text-xs'>
                                    {t('priceList.sources.averageCostShort', { defaultValue: 'Avg Cost' })}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Cost / Valuation Ref */}
                            <TableCell className='text-right text-xs'>
                              <div className='flex flex-col items-end gap-0.5'>
                                <span className='font-mono font-medium'>
                                  ${cost.toFixed(2)}
                                </span>
                                {itemSource === 'LAST_PURCHASE_COST' && (
                                  <Badge variant='outline' className='text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0'>
                                    {valuation?.lastReceiptNumber ? `${valuation.lastReceiptNumber}` : t('priceList.form.grCostBadge', { defaultValue: 'GR' })}
                                  </Badge>
                                )}
                                {itemSource === 'AVERAGE_COST' && (
                                  <Badge variant='outline' className='text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1 py-0'>
                                    {t('priceList.form.avgCostBadge', { defaultValue: 'Avg' })}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Markup % */}
                            <TableCell>
                              <div className='relative'>
                                <Input
                                  type='number'
                                  step='0.1'
                                  className='h-8 pr-5 text-xs font-mono text-right'
                                  value={itemMarkup ?? 0}
                                  onChange={(e) => handleItemMarkupChange(index, Number(e.target.value))}
                                />
                                <span className='absolute right-2 top-2 text-xs text-muted-foreground'>%</span>
                              </div>
                            </TableCell>

                            {/* Selling Price (Editable if Manual, Locked if Cost-Sourced) */}
                            <TableCell>
                              <div className='space-y-0.5'>
                                <div className='relative'>
                                  <span className='absolute left-2 top-2 text-xs text-muted-foreground'>
                                    $
                                  </span>
                                  <Input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    readOnly={itemSource !== 'MANUAL'}
                                    className={cn(
                                      'h-8 pl-5 pr-6 text-xs font-mono',
                                      itemSource !== 'MANUAL' && 'bg-muted/40 cursor-not-allowed font-medium text-foreground',
                                      isBelowCost && 'border-amber-500 bg-amber-50/20'
                                    )}
                                    value={variantPrice || ''}
                                    onChange={(e) => handleItemPriceChange(index, Number(e.target.value))}
                                  />
                                  {itemSource !== 'MANUAL' && (
                                    <span
                                      className='absolute right-2 top-2.5 text-muted-foreground'
                                      title={t('priceList.form.lockedBySource', {
                                        defaultValue: 'Calculated from cost + markup',
                                      })}
                                    >
                                      <Lock className='h-3 w-3' />
                                    </span>
                                  )}
                                </div>
                                {isBelowCost && (
                                  <div className='flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400'>
                                    <AlertTriangle className='h-2.5 w-2.5' />
                                    <span>{t('priceList.form.belowCost', { defaultValue: 'Below cost' })}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Tax Rate Dropdown */}
                            <TableCell>
                              <Select
                                value={itemTaxId || 'NONE'}
                                onValueChange={(val) => handleItemTaxChange(index, val === 'NONE' ? '' : val)}
                              >
                                <SelectTrigger className='h-8 text-xs'>
                                  <SelectValue placeholder={t('priceList.form.noTax', { defaultValue: 'No Tax' })} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='NONE' className='text-xs'>
                                    {t('priceList.form.noTax', { defaultValue: 'No Tax (0%)' })}
                                  </SelectItem>
                                  {options?.taxRates?.map((tr) => (
                                    <SelectItem key={tr.id} value={tr.id} className='text-xs'>
                                      {tr.tax_type} ({getTaxRatePercentage(tr.rate)}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Price Before Tax (Read-Only) */}
                            <TableCell className='text-right text-xs font-mono font-medium text-muted-foreground whitespace-nowrap bg-muted/10'>
                              ${taxBreakdown.priceBeforeTax.toFixed(2)}
                            </TableCell>

                            {/* Tax Amount (Read-Only) */}
                            <TableCell className='text-right text-xs font-mono text-muted-foreground whitespace-nowrap bg-muted/10'>
                              ${taxBreakdown.taxAmount.toFixed(2)}
                            </TableCell>

                            {/* Price After Tax (Read-Only) */}
                            <TableCell className='text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-muted/10'>
                              ${taxBreakdown.priceAfterTax.toFixed(2)}
                            </TableCell>

                            {/* Floor Price (Min) */}
                            <TableCell>
                              <div className='space-y-0.5'>
                                <div className='relative'>
                                  <span className='absolute left-2 top-2 text-xs text-muted-foreground'>
                                    $
                                  </span>
                                  <Input
                                    type='number'
                                    step='0.01'
                                    min='0'
                                    className={`h-8 pl-5 text-xs font-mono ${
                                      isFloorExceeded ? 'border-destructive bg-destructive/10' : ''
                                    }`}
                                    {...form.register(`items.${index}.min_price`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                </div>
                                {isFloorExceeded && (
                                  <span className='text-[9px] text-destructive'>
                                    {t('priceList.form.floorExceedsPrice', {
                                      defaultValue: 'Floor > Price',
                                    })}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Max Discount % */}
                            <TableCell>
                              <div className='relative'>
                                <Input
                                  type='number'
                                  step='0.1'
                                  min='0'
                                  max='100'
                                  className='h-8 pr-5 text-xs font-mono'
                                  {...form.register(`items.${index}.max_discount_percent`, {
                                    valueAsNumber: true,
                                  })}
                                />
                                <span className='absolute right-2 top-2 text-xs text-muted-foreground'>
                                  %
                                </span>
                              </div>
                            </TableCell>

                            {/* Estimated Margin */}
                            <TableCell className='text-right'>
                              {marginPct !== null ? (
                                <Badge
                                  variant={Number(marginPct) < 0 ? 'destructive' : Number(marginPct) < 20 ? 'outline' : 'secondary'}
                                  className='text-[10px] font-mono px-1.5 py-0'
                                >
                                  {marginPct}%
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground font-mono'>—</span>
                              )}
                            </TableCell>

                            {/* Remove action */}
                            <TableCell className='text-center'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-muted-foreground hover:text-destructive'
                                onClick={() => remove(index)}
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Empty state when no items */
                <div className='rounded-lg border border-dashed p-8 text-center'>
                  <Package className='mx-auto h-8 w-8 text-muted-foreground/60 mb-2' />
                  <h4 className='text-sm font-semibold'>
                    {t('priceList.form.noItemsTitle', { defaultValue: 'No items in this price list yet' })}
                  </h4>
                  <p className='text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4'>
                    {t('priceList.form.noItemsDescription', {
                      defaultValue:
                        'Add individual product rows or use the bulk-add button to assign prices to multiple products and variants.',
                    })}
                  </p>
                  <div className='flex items-center justify-center gap-2'>
                    <Button type='button' size='sm' onClick={handleAddRow} className='text-xs'>
                      <Plus className='mr-1.5 h-3.5 w-3.5' />
                      {t('priceList.form.addFirstItem', { defaultValue: 'Add First Item' })}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={isPending}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : t('priceList.form.savePriceList', { defaultValue: 'Save Price List' })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
