import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { usePosCheckoutMutation } from '../hooks/use-pos-queries'
import { usePosStore } from '../store/use-pos-store'
import type { ReceiptData } from './pos-receipt-dialog'

type PaymentMethodType = 'cash' | 'card' | 'bank_transfer' | 'wallet'

interface PaymentRow {
  id: string
  method: PaymentMethodType
  amount: number
  tenderedCash?: number
  referenceNumber?: string
}

interface PosCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckoutSuccess: (receipt: ReceiptData) => void
}

const QUICK_CASH_DENOMINATIONS = [10, 20, 50, 100, 200]

export function PosCheckoutDialog({
  open,
  onOpenChange,
  onCheckoutSuccess,
}: PosCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <PosCheckoutDialogContent
          onOpenChange={onOpenChange}
          onCheckoutSuccess={onCheckoutSuccess}
        />
      )}
    </Dialog>
  )
}

function PosCheckoutDialogContent({
  onOpenChange,
  onCheckoutSuccess,
}: Omit<PosCheckoutDialogProps, 'open'>) {
  const { t } = useTranslation()
  const {
    items,
    terminal,
    session,
    customer,
    priceListId,
    getTotalAmount,
    getSubtotal,
    getTotalDiscountAmount,
    getTaxAmount,
    clearCart,
  } = usePosStore()

  const total = getTotalAmount()
  const checkoutMutation = usePosCheckoutMutation()

  const [payments, setPayments] = useState<PaymentRow[]>([
    {
      id: '1',
      method: 'cash',
      amount: total,
      tenderedCash: total,
    },
  ])
  const [cashTenderedInput, setCashTenderedInput] = useState<string>(
    total.toString()
  )
  const [notes, setNotes] = useState<string>('')

  // Shipment / Delivery state
  const queryClient = useQueryClient()
  const [isShipmentEnabled, setIsShipmentEnabled] = useState(false)
  const [recipientName, setRecipientName] = useState(customer?.name || '')
  const [recipientPhone, setRecipientPhone] = useState(customer?.phone || '')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shipmentNotes, setShipmentNotes] = useState('')

  useEffect(() => {
    if (customer?.name && !recipientName) {
      setRecipientName(customer.name)
    }
    if (customer?.phone && !recipientPhone) {
      setRecipientPhone(customer.phone)
    }
  }, [customer])

  const totalAssignedPayments = payments.reduce((sum, p) => sum + p.amount, 0)
  const remainingToAssign = Math.max(0, total - totalAssignedPayments)

  const cashPayment = payments.find((p) => p.method === 'cash')
  const actualTendered = cashPayment ? Number(cashTenderedInput) || 0 : 0
  const cashRequired = cashPayment?.amount || 0
  const changeDue = Math.max(0, actualTendered - cashRequired)

  const isBalanced =
    Math.abs(total - totalAssignedPayments) < 0.01 &&
    (!cashPayment || actualTendered >= cashRequired)

  const handleMethodChange = (id: string, newMethod: PaymentMethodType) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              method: newMethod,
              tenderedCash: newMethod === 'cash' ? p.amount : undefined,
            }
          : p
      )
    )
    if (newMethod === 'cash') {
      setCashTenderedInput(
        payments.find((p) => p.id === id)?.amount.toString() || ''
      )
    }
  }

  const handleAmountChange = (id: string, newAmount: number) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, amount: Math.max(0, newAmount) } : p
      )
    )
  }

  const handleRefChange = (id: string, ref: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, referenceNumber: ref } : p))
    )
  }

  const addPaymentRow = () => {
    if (remainingToAssign <= 0) {
      toast.info(
        t(
          'pos.checkout.underpaidError',
          'Total order amount is already fully covered'
        )
      )
      return
    }

    const newRow: PaymentRow = {
      id: Date.now().toString(),
      method: 'card',
      amount: remainingToAssign,
    }
    setPayments((prev) => [...prev, newRow])
  }

  const removePaymentRow = (id: string) => {
    if (payments.length <= 1) return
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  const handleQuickCash = (amount: number) => {
    setCashTenderedInput(amount.toString())
  }

  const handleSubmit = async () => {
    if (!isBalanced) {
      toast.error(
        t(
          'pos.checkout.underpaidError',
          'Payments must balance the total order amount'
        )
      )
      return
    }

    if (!terminal?.id || !terminal.warehouseId) {
      toast.error(
        t(
          'pos.checkout.errorConfigMissing',
          'Terminal and warehouse configuration is missing'
        )
      )
      return
    }

    if (!session?.id) {
      toast.error(
        t(
          'pos.checkout.errorNoSession',
          'No active session found. Please open a session first.'
        )
      )
      return
    }

    try {
      const payload = {
        terminalId: terminal.id,
        sessionId: session.id,
        warehouseId: terminal.warehouseId,
        storeId: terminal.storeId ?? undefined,
        branchId: terminal.branchId ?? undefined,
        customerId: customer?.id ?? null,
        priceListId: priceListId ?? terminal.defaultPriceListId ?? null,
        items: items.map((item) => ({
          productVariantId: item.productVariantId,
          sku: item.sku,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: Math.round(Number(item.unitPrice) * 100) / 100,
          unitCost: Math.round(Number(item.unitCost ?? 0) * 100) / 100,
          discountAmount: Math.round(Number(item.discountAmount ?? 0) * 100) / 100,
          taxAmount: Math.round(Number(item.taxAmount ?? 0) * 100) / 100,
          taxRateId: item.taxRateId,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount:
            p.method === 'cash' && actualTendered > p.amount
              ? actualTendered
              : p.amount,
          referenceNumber: p.referenceNumber,
        })),
        orderDiscountAmount:
          Math.round(Number(getTotalDiscountAmount() ?? 0) * 100) / 100,
        notes: notes.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
        isShipment: isShipmentEnabled,
        shipment: isShipmentEnabled
          ? {
              recipientName: recipientName.trim() || customer?.name || undefined,
              recipientPhone: recipientPhone.trim() || customer?.phone || undefined,
              deliveryAddress: deliveryAddress.trim() || undefined,
              city: city.trim() || undefined,
              state: stateVal.trim() || undefined,
              postalCode: postalCode.trim() || undefined,
              carrier: carrier.trim() || undefined,
              notes: shipmentNotes.trim() || undefined,
            }
          : undefined,
      }

      const res = await checkoutMutation.mutateAsync(payload)

      if (isShipmentEnabled) {
        queryClient.invalidateQueries({ queryKey: ['non-restaurant-shipments'] })
        toast.success(
          t(
            'pos.checkout.shipmentCreated',
            'Order sent with shipment! Track it in the Shipments tab.'
          )
        )
      }

      // Prepare receipt data
      const receiptData: ReceiptData = {
        orderNumber: res.orderNumber || 'POS-ORDER',
        invoiceNumber: res.invoiceNumber || res.orderNumber,
        date: new Date(),
        storeName: terminal.name || 'Retail POS',
        cashierName: session.cashierName || 'Cashier',
        terminalCode: terminal.code,
        customerName: customer?.name || undefined,
        customerPhone: customer?.phone || undefined,
        isShipment: isShipmentEnabled,
        shipmentDetails: isShipmentEnabled
          ? {
              recipientName: recipientName.trim() || customer?.name || undefined,
              recipientPhone: recipientPhone.trim() || customer?.phone || undefined,
              deliveryAddress: deliveryAddress.trim() || undefined,
              city: city.trim() || undefined,
              state: stateVal.trim() || undefined,
              postalCode: postalCode.trim() || undefined,
              carrier: carrier.trim() || undefined,
              notes: shipmentNotes.trim() || undefined,
            }
          : undefined,
        items: items.map((i) => ({
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
          taxAmount: i.taxAmount,
          total: i.total,
        })),
        subtotal: getSubtotal(),
        discountTotal: getTotalDiscountAmount(),
        taxTotal: getTaxAmount(),
        totalAmount: total,
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          referenceNumber: p.referenceNumber,
        })),
        changeGiven: changeDue,
        notes: notes.trim() || undefined,
      }

      clearCart()
      onOpenChange(false)
      onCheckoutSuccess(receiptData)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('pos.checkout.errorFailed', 'Checkout failed')
      toast.error(message)
    }
  }

  return (
    <DialogContent className='flex max-h-[90dvh] w-[95vw] sm:max-w-xl flex-col p-0 overflow-hidden'>
      {/* Pinned Sticky Header */}
      <DialogHeader className='shrink-0 border-b bg-card p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <DialogTitle className='text-xl sm:text-2xl font-bold'>
              {t('pos.checkout.title', 'Payment & Checkout')}
            </DialogTitle>
            <DialogDescription className='text-xs sm:text-sm'>
              {t(
                'pos.checkout.description',
                'Select payment methods or split across multiple options.'
              )}
            </DialogDescription>
          </div>
          <div className='text-right shrink-0'>
            <span className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
              {t('pos.checkout.totalDue', 'Total Due')}
            </span>
            <div className='text-xl sm:text-2xl font-black text-primary'>
              {formatCurrency(total)}
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Scrollable Middle Body */}
      <div className='flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4'>
        {/* Payment Lines */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm font-semibold'>
              {t('pos.checkout.splitBreakdown', 'Payment Split Breakdown')}
            </Label>
            {remainingToAssign > 0 && (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={addPaymentRow}
                className='h-7 gap-1 text-xs'
              >
                <Plus className='h-3.5 w-3.5' /> {t('pos.checkout.splitPayment', 'Split Payment')}
              </Button>
            )}
          </div>

          {payments.map((p) => (
            <div
              key={p.id}
              className='grid grid-cols-1 sm:grid-cols-12 items-center gap-2 rounded-lg border bg-muted/20 p-2.5 sm:p-3'
            >
              <div className='sm:col-span-4'>
                <Select
                  value={p.method}
                  onValueChange={(val) =>
                    handleMethodChange(p.id, val as PaymentMethodType)
                  }
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='cash'>
                      <div className='flex items-center gap-2'>
                        <Banknote className='h-4 w-4 text-emerald-600' /> {t('pos.checkout.cash', 'Cash')}
                      </div>
                    </SelectItem>
                    <SelectItem value='card'>
                      <div className='flex items-center gap-2'>
                        <CreditCard className='h-4 w-4 text-blue-600' /> {t('pos.checkout.card', 'Card')}
                      </div>
                    </SelectItem>
                    <SelectItem value='bank_transfer'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='h-4 w-4 text-purple-600' /> {t('pos.checkout.bankTransfer', 'Bank Transfer')}
                      </div>
                    </SelectItem>
                    <SelectItem value='wallet'>
                      <div className='flex items-center gap-2'>
                        <Wallet className='h-4 w-4 text-amber-600' /> {t('pos.checkout.wallet', 'Digital Wallet')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={p.method !== 'cash' ? 'sm:col-span-4' : payments.length > 1 ? 'sm:col-span-7' : 'sm:col-span-8'}>
                <Input
                  type='number'
                  step='0.01'
                  min='0.01'
                  className='h-9 font-semibold'
                  value={p.amount}
                  onChange={(e) =>
                    handleAmountChange(p.id, Number(e.target.value) || 0)
                  }
                  placeholder={t('pos.checkout.amount', 'Amount')}
                />
              </div>

              {p.method !== 'cash' && (
                <div className={payments.length > 1 ? 'sm:col-span-3' : 'sm:col-span-4'}>
                  <Input
                    type='text'
                    className='h-9 text-xs'
                    placeholder={t('pos.checkout.referencePlaceholder', 'Ref / Auth #')}
                    value={p.referenceNumber || ''}
                    onChange={(e) => handleRefChange(p.id, e.target.value)}
                  />
                </div>
              )}

              {payments.length > 1 && (
                <div className='flex justify-end sm:col-span-1'>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='h-9 w-9 text-muted-foreground hover:text-rose-500'
                    onClick={() => removePaymentRow(p.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cash details (Tendered & Change) if cash is included */}
        {cashPayment && (
          <div className='space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 sm:p-4'>
            <div className='flex items-center justify-between'>
              <Label className='flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400'>
                <Banknote className='h-4 w-4' /> {t('pos.checkout.amountTendered', 'Cash Tendered')}
              </Label>
              <span className='text-xs text-muted-foreground'>
                {t('pos.checkout.requiredCash', 'Required cash')}: {formatCurrency(cashRequired)}
              </span>
            </div>

            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
              <Input
                type='number'
                step='0.01'
                min='0'
                className='h-11 sm:max-w-[180px] text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400'
                value={cashTenderedInput}
                onChange={(e) => setCashTenderedInput(e.target.value)}
                placeholder='0.00'
              />

              {/* Quick denomination pills */}
              <div className='grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 flex-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 text-xs font-semibold'
                  onClick={() => handleQuickCash(cashRequired)}
                >
                  {t('pos.checkout.exact', 'Exact')}
                </Button>
                {QUICK_CASH_DENOMINATIONS.map((amt) => {
                  if (amt >= cashRequired) {
                    return (
                      <Button
                        key={amt}
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-8 text-xs font-semibold'
                        onClick={() => handleQuickCash(amt)}
                      >
                        ${amt}
                      </Button>
                    )
                  }
                  return null
                })}
              </div>
            </div>

            {/* Change calculation */}
            <div className='flex items-center justify-between border-t border-emerald-500/20 pt-1 text-sm'>
              <span className='font-medium text-muted-foreground'>
                {t('pos.checkout.changeDue', 'Change Due')}:
              </span>
              <span className='text-lg font-extrabold text-emerald-600 dark:text-emerald-400'>
                {formatCurrency(changeDue)}
              </span>
            </div>
          </div>
        )}

        {/* Balance status banner */}
        <div
          className={`flex items-center justify-between rounded-md p-3 text-xs font-medium ${
            isBalanced
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          <div className='flex items-center gap-2'>
            {isBalanced ? (
              <CheckCircle className='h-4 w-4 text-emerald-600 shrink-0' />
            ) : (
              <AlertCircle className='h-4 w-4 text-amber-600 shrink-0' />
            )}
            <span>
              {isBalanced
                ? t('pos.checkout.paymentBalanced', 'Payment fully balanced')
                : remainingToAssign > 0
                  ? `${formatCurrency(remainingToAssign)} ${t('pos.checkout.remainingToAssign', 'remaining to assign')}`
                  : t('pos.checkout.cashUnderpaidError', 'Cash tendered is less than required')}
            </span>
          </div>
          <span className='font-bold shrink-0'>
            {formatCurrency(totalAssignedPayments)} / {formatCurrency(total)}
          </span>
        </div>

        {/* Shipment / Delivery Option */}
        <div className='rounded-lg border bg-muted/20 p-3.5 space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0'>
                <Truck className='h-4 w-4' />
              </div>
              <div>
                <Label htmlFor='shipment-toggle' className='text-sm font-semibold cursor-pointer'>
                  {t('pos.checkout.sendWithShipment', 'Send with Shipment / Delivery')}
                </Label>
                <p className='text-xs text-muted-foreground'>
                  {t('pos.checkout.sendWithShipmentDesc', 'Create delivery tracking displayed in the Shipments tab')}
                </p>
              </div>
            </div>
            <Switch
              id='shipment-toggle'
              checked={isShipmentEnabled}
              onCheckedChange={setIsShipmentEnabled}
            />
          </div>

          {isShipmentEnabled && (
            <div className='space-y-3 pt-2.5 border-t border-border/50'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium'>
                    {t('pos.checkout.recipientName', 'Recipient Name')}
                  </Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={customer?.name || t('pos.checkout.recipientNamePlaceholder', 'Customer / Recipient name')}
                    className='h-8 text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium'>
                    {t('pos.checkout.recipientPhone', 'Recipient Phone')}
                  </Label>
                  <Input
                    type='tel'
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder={customer?.phone || t('pos.checkout.recipientPhonePlaceholder', '+1234567890')}
                    className='h-8 text-xs'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-medium'>
                  {t('pos.checkout.deliveryAddress', 'Delivery Address')}
                </Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={t('pos.checkout.deliveryAddressPlaceholder', 'Street address, building, apt / suite')}
                  className='h-8 text-xs'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium'>
                    {t('pos.checkout.city', 'City')}
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('pos.checkout.cityPlaceholder', 'City')}
                    className='h-8 text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium'>
                    {t('pos.checkout.state', 'State / Region')}
                  </Label>
                  <Input
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder={t('pos.checkout.statePlaceholder', 'State')}
                    className='h-8 text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-medium'>
                    {t('pos.checkout.carrier', 'Carrier')}
                  </Label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder={t('pos.checkout.carrierPlaceholder', 'e.g. Courier')}
                    className='h-8 text-xs'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='text-xs font-medium'>
                  {t('pos.checkout.shippingNotes', 'Delivery Instructions / Notes')}
                </Label>
                <Input
                  value={shipmentNotes}
                  onChange={(e) => setShipmentNotes(e.target.value)}
                  placeholder={t('pos.checkout.shippingNotesPlaceholder', 'Gate code, delivery window, etc.')}
                  className='h-8 text-xs'
                />
              </div>
            </div>
          )}
        </div>

        <div className='space-y-1.5'>
          <Label
            htmlFor='checkoutNotes'
            className='text-xs text-muted-foreground'
          >
            {t('pos.checkout.orderNotes', 'Order Notes / Delivery Instructions (Optional)')}
          </Label>
          <Textarea
            id='checkoutNotes'
            placeholder={t('pos.checkout.orderNotesPlaceholder', 'Add reference or special instructions...')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Pinned Sticky Footer */}
      <DialogFooter className='shrink-0 border-t bg-muted/20 p-3 sm:p-4 flex-row justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => onOpenChange(false)}
        >
          {t('pos.checkout.cancel', 'Cancel')}
        </Button>
        <Button
          type='button'
          disabled={!isBalanced || checkoutMutation.isPending}
          onClick={handleSubmit}
          className='h-10 sm:h-11 gap-2 bg-primary px-5 sm:px-6 text-sm sm:text-base font-bold text-primary-foreground'
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className='h-5 w-5 animate-spin' /> {t('pos.checkout.processing', 'Processing Sale...')}
            </>
          ) : (
            <>{t('pos.checkout.completeSale', 'Complete Sale')} ({formatCurrency(total)})</>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
