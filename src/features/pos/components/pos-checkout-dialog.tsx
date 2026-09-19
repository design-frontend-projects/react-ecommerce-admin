import { useState } from 'react'
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
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
      toast.info('Total order amount is already fully covered')
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
      toast.error('Payments must balance the total order amount')
      return
    }

    if (!terminal?.id || !terminal.warehouseId) {
      toast.error('Terminal and warehouse configuration is missing')
      return
    }

    if (!session?.id) {
      toast.error('No active session found. Please open a session first.')
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
      }

      const res = await checkoutMutation.mutateAsync(payload)

      // Prepare receipt data
      const receiptData: ReceiptData = {
        orderNumber: res.orderNumber || 'POS-ORDER',
        invoiceNumber: res.invoiceNumber || res.orderNumber,
        date: new Date(),
        storeName: terminal.name || 'Retail POS',
        cashierName: session.cashierName || 'Cashier',
        terminalCode: terminal.code,
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
      const message = err instanceof Error ? err.message : 'Checkout failed'
      toast.error(message)
    }
  }

  return (
    <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='text-2xl font-bold'>
                Payment & Checkout
              </DialogTitle>
              <DialogDescription>
                Select payment methods or split across multiple options.
              </DialogDescription>
            </div>
            <div className='text-right'>
              <span className='text-xs font-bold tracking-wider text-muted-foreground uppercase'>
                Total Due
              </span>
              <div className='text-2xl font-black text-primary'>
                {formatCurrency(total)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Payment Lines */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm font-semibold'>
                Payment Split Breakdown
              </Label>
              {remainingToAssign > 0 && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={addPaymentRow}
                  className='h-7 gap-1 text-xs'
                >
                  <Plus className='h-3.5 w-3.5' /> Split Payment
                </Button>
              )}
            </div>

            {payments.map((p) => (
              <div
                key={p.id}
                className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3'
              >
                <div className='w-36'>
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
                          <Banknote className='h-4 w-4 text-emerald-600' /> Cash
                        </div>
                      </SelectItem>
                      <SelectItem value='card'>
                        <div className='flex items-center gap-2'>
                          <CreditCard className='h-4 w-4 text-blue-600' /> Card
                        </div>
                      </SelectItem>
                      <SelectItem value='bank_transfer'>
                        <div className='flex items-center gap-2'>
                          <Building2 className='h-4 w-4 text-purple-600' /> Bank
                          Transfer
                        </div>
                      </SelectItem>
                      <SelectItem value='wallet'>
                        <div className='flex items-center gap-2'>
                          <Wallet className='h-4 w-4 text-amber-600' /> Digital
                          Wallet
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='min-w-[120px] flex-1'>
                  <Input
                    type='number'
                    step='0.01'
                    min='0.01'
                    className='h-9 font-semibold'
                    value={p.amount}
                    onChange={(e) =>
                      handleAmountChange(p.id, Number(e.target.value) || 0)
                    }
                    placeholder='Amount'
                  />
                </div>

                {p.method !== 'cash' && (
                  <div className='min-w-[130px] flex-1'>
                    <Input
                      type='text'
                      className='h-9 text-xs'
                      placeholder='Ref / Auth #'
                      value={p.referenceNumber || ''}
                      onChange={(e) => handleRefChange(p.id, e.target.value)}
                    />
                  </div>
                )}

                {payments.length > 1 && (
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='h-9 w-9 text-muted-foreground hover:text-rose-500'
                    onClick={() => removePaymentRow(p.id)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Cash details (Tendered & Change) if cash is included */}
          {cashPayment && (
            <div className='space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4'>
              <div className='flex items-center justify-between'>
                <Label className='flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400'>
                  <Banknote className='h-4 w-4' /> Cash Tendered
                </Label>
                <span className='text-xs text-muted-foreground'>
                  Required cash: {formatCurrency(cashRequired)}
                </span>
              </div>

              <div className='flex items-center gap-3'>
                <Input
                  type='number'
                  step='0.01'
                  min='0'
                  className='h-11 max-w-[200px] text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400'
                  value={cashTenderedInput}
                  onChange={(e) => setCashTenderedInput(e.target.value)}
                  placeholder='0.00'
                />

                {/* Quick denomination pills */}
                <div className='flex flex-1 flex-wrap gap-1.5'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs font-semibold'
                    onClick={() => handleQuickCash(cashRequired)}
                  >
                    Exact
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
                  Change Due:
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
                <CheckCircle className='h-4 w-4 text-emerald-600' />
              ) : (
                <AlertCircle className='h-4 w-4 text-amber-600' />
              )}
              <span>
                {isBalanced
                  ? 'Payment fully balanced'
                  : remainingToAssign > 0
                    ? `${formatCurrency(remainingToAssign)} remaining to assign`
                    : 'Cash tendered is less than required'}
              </span>
            </div>
            <span className='font-bold'>
              {formatCurrency(totalAssignedPayments)} / {formatCurrency(total)}
            </span>
          </div>

          <div className='space-y-1.5'>
            <Label
              htmlFor='checkoutNotes'
              className='text-xs text-muted-foreground'
            >
              Order Notes / Delivery Instructions (Optional)
            </Label>
            <Textarea
              id='checkoutNotes'
              placeholder='Add reference or special instructions...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className='gap-2 pt-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            disabled={!isBalanced || checkoutMutation.isPending}
            onClick={handleSubmit}
            className='h-11 gap-2 bg-primary px-6 text-base font-bold text-primary-foreground'
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className='h-5 w-5 animate-spin' /> Processing Sale...
              </>
            ) : (
              <>Complete Sale ({formatCurrency(total)})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
  )
}
