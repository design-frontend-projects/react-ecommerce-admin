import { useState, useMemo } from 'react'
import { Plus, Trash2, Building2, Warehouse, User, Calendar, FileText, Eye, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  useStoreOptions,
  useCustomerOptions,
  useWarehouseOptions,
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
import { createOrderInputSchema } from '../data/schema'
import { useCreateOrder } from '../hooks/use-sales-orders'
import {
  SOProductSelect,
  SOVariantSelect,
  type SOVariantOption,
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
}

const emptyItem: LineItemState = {
  productId: null,
  productVariantId: '',
  uomId: null,
  qty: '1',
  unitPrice: '',
  discountAmount: '0',
  taxAmount: '0',
}

const WALK_IN = 'walk-in'

export function OrderCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [storeId, setStoreId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [customerId, setCustomerId] = useState(WALK_IN)
  const [currency, setCurrency] = useState('USD')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemState[]>([{ ...emptyItem }])

  // Review Draft State
  const [reviewOpen, setReviewOpen] = useState(false)
  const [draftData, setDraftData] = useState<SalesOrderDraftData | null>(null)

  const { data: stores = [] } = useStoreOptions()
  const { data: warehouses = [] } = useWarehouseOptions()
  const { data: customers = [] } = useCustomerOptions()
  const { data: products = [] } = useProducts()
  const { data: uoms = [] } = useUomOptions()
  const { data: currencies = [] } = useCurrencies()
  const createOrder = useCreateOrder()

  // Map product variants by product ID for quick lookups
  const variantsByProductId = useMemo(() => {
    const map = new Map<string, SOVariantOption[]>()
    for (const p of products) {
      const pId = String(p.id ?? p.product_id ?? '')
      if (!pId) continue
      const vars: SOVariantOption[] = (p.product_variants || []).map((v) => {
        const pli = (v as { price_list_items?: Array<{ price: number | string; cost_price?: number | string | null }> }).price_list_items
        const resolvedPrice = (pli && pli.length > 0)
          ? Number(pli[0].price)
          : Number((v as { price?: number }).price || 0)
        const resolvedCost = (pli && pli.length > 0 && pli[0].cost_price != null)
          ? Number(pli[0].cost_price)
          : ((v as { cost_price?: number | null }).cost_price ? Number((v as { cost_price?: number | null }).cost_price) : null)

        const balances = (v as { stock_balances?: Array<{ qty_available?: number | string; qty_on_hand?: number | string; qty_reserved?: number | string }> }).stock_balances
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
        }
      })
      map.set(pId, vars)
    }
    return map
  }, [products])

  const reset = () => {
    setStoreId('')
    setWarehouseId('')
    setCustomerId(WALK_IN)
    setCurrency('USD')
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

  const handleSelectProduct = (index: number, pId: string) => {
    const pVariants = variantsByProductId.get(pId) ?? []
    const firstVariant = pVariants[0]

    updateItem(index, {
      productId: pId,
      productVariantId: firstVariant?.id ?? '',
      unitPrice: firstVariant ? String(firstVariant.price) : '',
      uomId: firstVariant?.uom_id ?? null,
    })
  }

  const handleSelectVariant = (
    index: number,
    variantId: string,
    price: number,
    uomId?: string | null
  ) => {
    updateItem(index, {
      productVariantId: variantId,
      unitPrice: String(price),
      ...(uomId ? { uomId } : {}),
    })
  }

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

    return {
      orderNumber: 'DRAFT-PREVIEW',
      storeName: selectedStore?.name || 'Store',
      storeId,
      warehouseName: selectedWh?.name,
      warehouseId: warehouseId || null,
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
      warehouseId: warehouseId || undefined,
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
      await createOrder.mutateAsync(parsed.data)
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
              <FileText className='h-5 w-5 text-primary' />
              {t('salesOrders.createDialog.title', 'New Sales Order')}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {t('salesOrders.createDialog.desc', 'Create a sales order draft with real customer, fulfillment location, and line items.')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='flex-1 p-6'>
            <div className='space-y-6'>
              {/* Header Configuration: Store, Warehouse, Customer, Currency */}
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5'>
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

                {/* Warehouse Location Select */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <Warehouse className='h-3.5 w-3.5 text-primary' /> {t('salesOrders.form.warehouse', 'Fulfillment Warehouse')}
                  </Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className='h-9 text-xs sm:text-sm'>
                      <SelectValue placeholder={t('salesOrders.form.defaultWarehouse', 'Default warehouse...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name} {wh.code ? `(${wh.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className='h-9 text-xs sm:text-sm'>
                      <SelectValue placeholder={t('salesOrders.form.currency', 'Currency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='USD'>USD ($)</SelectItem>
                      <SelectItem value='EUR'>EUR (€)</SelectItem>
                      <SelectItem value='GBP'>GBP (£)</SelectItem>
                      <SelectItem value='SAR'>SAR (﷼)</SelectItem>
                      <SelectItem value='AED'>AED (د.إ)</SelectItem>
                      {currencies
                        .filter((c) => !['USD', 'EUR', 'GBP', 'SAR', 'AED'].includes(c.code))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.code}>
                            {c.code} {c.symbol ? `(${c.symbol})` : ''}
                          </SelectItem>
                        ))}
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
                    onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
                  >
                    <Plus className='mr-1 h-3.5 w-3.5' /> {t('salesOrders.form.addItem', 'Add Item')}
                  </Button>
                </div>

                <div className='space-y-3'>
                  {items.map((item, index) => {
                    const itemVariants = item.productId
                      ? variantsByProductId.get(item.productId) ?? []
                      : []

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
                            <Label className='text-[10px] text-muted-foreground'>{t('salesOrders.itemsTable.qty', 'Quantity')}</Label>
                            <Input
                              type='number'
                              step='any'
                              min='0.001'
                              value={item.qty}
                              onChange={(e) => updateItem(index, { qty: e.target.value })}
                              className='h-8 text-xs'
                              placeholder='Qty'
                            />
                          </div>

                          <div className='space-y-1'>
                            <Label className='text-[10px] text-muted-foreground'>{t('salesOrders.itemsTable.unitPrice', 'Unit Price ($)')}</Label>
                            <Input
                              type='number'
                              step='any'
                              min='0'
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                              className='h-8 text-xs'
                              placeholder='Price'
                            />
                          </div>

                          <div className='space-y-1'>
                            <Label className='text-[10px] text-muted-foreground'>{t('salesOrders.itemsTable.discount', 'Discount ($)')}</Label>
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
                            <Label className='text-[10px] text-muted-foreground'>{t('salesOrders.itemsTable.tax', 'Tax ($)')}</Label>
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
                              ${lineTotal.toFixed(2)}
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
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className='flex justify-between text-xs text-rose-600'>
                        <span>{t('salesOrders.viewDialog.discount', 'Discount:')}</span>
                        <span className='font-mono font-medium'>
                          -${totalDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div className='flex justify-between text-xs text-muted-foreground'>
                        <span>{t('salesOrders.viewDialog.tax', 'Tax:')}</span>
                        <span className='font-mono font-medium text-foreground'>
                          +${totalTax.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className='border-t pt-1.5 flex justify-between items-baseline font-bold text-sm'>
                      <span>{t('salesOrders.viewDialog.grandTotal', 'Grand Total:')}</span>
                      <span className='font-mono text-base text-primary'>
                        ${grandTotal.toFixed(2)}
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
                disabled={createOrder.isPending}
              >
                <CheckCircle2 className='mr-1.5 h-4 w-4' />
                {createOrder.isPending ? t('salesOrders.createDialog.creatingOrder', 'Creating Order...') : t('salesOrders.createDialog.createDraft', 'Create Draft')}
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
          isSubmittingDraft={createOrder.isPending}
          onConfirmDraftSubmit={async () => {
            await handleExecuteCreate()
            setReviewOpen(false)
          }}
        />
      )}
    </>
  )
}
