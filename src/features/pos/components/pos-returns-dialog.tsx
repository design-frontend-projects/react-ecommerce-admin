import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Undo2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePosStore } from '../store/use-pos-store'
import {
  useOrderLookupQuery,
  useProcessReturnMutation,
} from '../hooks/use-pos-queries'

interface PosReturnsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReturnItemState {
  salesOrderItemId: string
  productVariantId: string
  productName: string
  variantName?: string
  sku: string
  unitPrice: number
  maxReturnable: number
  quantityToReturn: number
  reason: string
  restock: boolean
}

export function PosReturnsDialog({
  open,
  onOpenChange,
}: PosReturnsDialogProps) {
  const { t } = useTranslation()
  const { terminal, session } = usePosStore()
  const [searchRef, setSearchRef] = useState('')
  const [searchedOrderRef, setSearchedOrderRef] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([])
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'wallet'>('cash')
  const [notes, setNotes] = useState('')

  const { data: orderData, isLoading: isSearching } = useOrderLookupQuery(
    searchedOrderRef || undefined
  )
  const returnMutation = useProcessReturnMutation()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchRef.trim()) return
    setSearchedOrderRef(searchRef.trim())
  }

  // When order data loads, initialize returnable item state
  const order = orderData?.order
  const originalItems = orderData?.items || []

  const updateItemQty = (variantId: string, qty: number) => {
    setReturnItems((prev) =>
      prev.map((i) =>
        i.productVariantId === variantId
          ? { ...i, quantityToReturn: Math.max(0, Math.min(i.maxReturnable, qty)) }
          : i
      )
    )
  }

  const updateItemReason = (variantId: string, reason: string) => {
    setReturnItems((prev) =>
      prev.map((i) =>
        i.productVariantId === variantId ? { ...i, reason } : i
      )
    )
  }

  const updateItemRestock = (variantId: string, restock: boolean) => {
    setReturnItems((prev) =>
      prev.map((i) =>
        i.productVariantId === variantId ? { ...i, restock } : i
      )
    )
  }

  // Sync return items when order changes
  const handleSelectOrder = () => {
    if (!originalItems || originalItems.length === 0) return
    setReturnItems(
      originalItems.map((item: any) => ({
        salesOrderItemId: item.id,
        productVariantId: item.product_variant_id,
        productName: item.product_variants?.products?.name || item.name || 'Product',
        variantName: item.product_variants?.name,
        sku: item.product_variants?.sku || '',
        unitPrice: Number(item.unit_price || 0),
        maxReturnable: Number(item.quantity || 0) - Number(item.returned_quantity || 0),
        quantityToReturn: 0,
        reason: 'defective',
        restock: true,
      }))
    )
  }

  const activeReturns = returnItems.filter((i) => i.quantityToReturn > 0)
  const totalRefundAmount = activeReturns.reduce(
    (sum, i) => sum + i.quantityToReturn * i.unitPrice,
    0
  )

  const handleSubmitReturn = async () => {
    if (activeReturns.length === 0) {
      toast.error(
        t('pos.returns.noItemsSelected', 'Please select at least one item to return')
      )
      return
    }

    if (!terminal?.id || !terminal.warehouseId) {
      toast.error(
        t('pos.returns.configMissing', 'Terminal and warehouse configuration missing')
      )
      return
    }

    if (!session?.id) {
      toast.error(
        t('pos.returns.noActiveSession', 'No active session. Please open a session first.')
      )
      return
    }

    try {
      await returnMutation.mutateAsync({
        originalOrderId: order.id,
        sessionId: session.id,
        terminalId: terminal.id,
        warehouseId: terminal.warehouseId,
        items: activeReturns.map((i) => ({
          salesOrderItemId: i.salesOrderItemId,
          productVariantId: i.productVariantId,
          quantity: i.quantityToReturn,
          unitPrice: i.unitPrice,
          reason: i.reason,
          restockToWarehouseId: i.restock ? terminal.warehouseId! : undefined,
        })),
        refundMethod,
        refundAmount: totalRefundAmount,
        notes: notes.trim() || undefined,
      })

      toast.success(
        t('pos.returns.refundProcessed', 'Refund of {{amount}} processed!', {
          amount: formatCurrency(totalRefundAmount),
        })
      )
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || t('pos.returns.failedProcess', 'Failed to process return'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <RotateCcw className='h-5 w-5 text-rose-500' />
            <DialogTitle>
              {t('pos.returns.title', 'Return Items & Issue Refund')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t(
              'pos.returns.desc',
              'Search original sales order by order number or receipt code to process return.'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Order search box */}
        <form onSubmit={handleSearchSubmit} className='flex gap-2 py-2'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t(
                'pos.returns.searchPlaceholder',
                'Scan receipt barcode or enter order # (e.g. SO-2026-0001)...'
              )}
              className='pl-9'
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              autoFocus
            />
          </div>
          <Button type='submit' disabled={isSearching || !searchRef}>
            {isSearching ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              t('pos.returns.searchBtn', 'Lookup')
            )}
          </Button>
        </form>

        {order ? (
          <div className='space-y-4 py-2'>
            {/* Order info banner */}
            <div className='rounded-lg border bg-muted/40 p-3 text-xs flex justify-between items-center'>
              <div>
                <p className='font-bold text-sm'>
                  {t('pos.returns.order', 'Order')}: {order.order_number || order.id}
                </p>
                <p className='text-muted-foreground'>
                  {t('pos.returns.date', 'Date')}: {new Date(order.created_at).toLocaleDateString()} • {t('pos.returns.channel', 'Channel')}: {order.channel || 'POS'}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-muted-foreground'>
                  {t('pos.returns.totalPaid', 'Total Paid')}
                </p>
                <p className='font-bold text-base text-primary'>
                  {formatCurrency(Number(order.total_amount || 0))}
                </p>
              </div>
            </div>

            {returnItems.length === 0 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleSelectOrder}
                className='w-full'
              >
                {t('pos.returns.loadItems', 'Load Items from this Order')}
              </Button>
            )}

            {/* Return items table */}
            {returnItems.length > 0 && (
              <ScrollArea className='max-h-60 border rounded-md p-3'>
                <div className='space-y-3'>
                  {returnItems.map((item) => (
                    <div
                      key={item.productVariantId}
                      className='flex items-center justify-between gap-3 text-xs border-b pb-2'
                    >
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold truncate'>{item.productName}</p>
                        <p className='text-muted-foreground'>
                          {item.sku} • {formatCurrency(item.unitPrice)}{' '}
                          {t('pos.returns.each', 'each')}
                        </p>
                        <p className='text-[10px] text-muted-foreground'>
                          {t('pos.returns.maxReturnable', 'Max returnable')}:{' '}
                          {item.maxReturnable}
                        </p>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          min='0'
                          max={item.maxReturnable}
                          value={item.quantityToReturn}
                          onChange={(e) =>
                            updateItemQty(
                              item.productVariantId,
                              Number(e.target.value) || 0
                            )
                          }
                          className='w-16 h-8 text-center font-bold'
                        />

                        <Select
                          value={item.reason}
                          onValueChange={(val) =>
                            updateItemReason(item.productVariantId, val)
                          }
                        >
                          <SelectTrigger className='w-28 h-8 text-[11px]'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='defective'>
                              {t('pos.returns.reasons.defective', 'Defective')}
                            </SelectItem>
                            <SelectItem value='wrong_item'>
                              {t('pos.returns.reasons.wrongItem', 'Wrong Item')}
                            </SelectItem>
                            <SelectItem value='customer_mind'>
                              {t('pos.returns.reasons.customerMind', 'Changed Mind')}
                            </SelectItem>
                            <SelectItem value='expired'>
                              {t('pos.returns.reasons.expired', 'Expired')}
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <div className='flex items-center gap-1'>
                          <Checkbox
                            id={`restock-${item.productVariantId}`}
                            checked={item.restock}
                            onCheckedChange={(checked) =>
                              updateItemRestock(
                                item.productVariantId,
                                Boolean(checked)
                              )
                            }
                          />
                          <Label
                            htmlFor={`restock-${item.productVariantId}`}
                            className='text-[10px] cursor-pointer'
                          >
                            {t('pos.returns.restock', 'Restock')}
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Refund Method & Summary */}
            {activeReturns.length > 0 && (
              <div className='rounded-lg border bg-rose-500/5 p-3 border-rose-500/20 space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>
                    {t('pos.returns.refundMethod', 'Refund Method')}
                  </Label>
                  <Select
                    value={refundMethod}
                    onValueChange={(v) => setRefundMethod(v as any)}
                  >
                    <SelectTrigger className='w-36 h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='cash'>
                        {t('pos.returns.refundCash', 'Cash')}
                      </SelectItem>
                      <SelectItem value='card'>
                        {t('pos.returns.refundCard', 'Card Refund')}
                      </SelectItem>
                      <SelectItem value='wallet'>
                        {t('pos.returns.refundWallet', 'Store Wallet')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex justify-between items-center text-sm font-bold pt-1 border-t border-rose-500/20'>
                  <span>{t('pos.returns.totalRefund', 'Total Refund Due:')}</span>
                  <span className='text-rose-600 dark:text-rose-400 text-lg'>
                    {formatCurrency(totalRefundAmount)}
                  </span>
                </div>
              </div>
            )}

            <div className='space-y-1.5'>
              <Label className='text-xs text-muted-foreground'>
                {t(
                  'pos.returns.notes',
                  'Return Reason / Authorization Notes'
                )}
              </Label>
              <Textarea
                placeholder={t(
                  'pos.returns.notesPlaceholder',
                  'Manager approval reference or customer comments...'
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            {t(
              'pos.returns.emptyPrompt',
              'Enter a valid Order ID or Receipt Number to load customer transaction.'
            )}
          </div>
        )}

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            {t('pos.returns.cancel', 'Cancel')}
          </Button>
          <Button
            type='button'
            disabled={
              activeReturns.length === 0 || returnMutation.isPending || !order
            }
            onClick={handleSubmitReturn}
            className='gap-2 bg-rose-600 hover:bg-rose-700 text-white'
          >
            {returnMutation.isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Undo2 className='h-4 w-4' />
            )}
            {t('pos.returns.processReturnBtn', 'Process Refund')} ({formatCurrency(totalRefundAmount)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
