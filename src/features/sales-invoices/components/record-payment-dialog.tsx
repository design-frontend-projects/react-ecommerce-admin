import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recordPaymentSchema, type RecordPaymentFormData } from '../schemas'
import type { SalesInvoice } from '../types'
import { CreditCard, DollarSign, Wallet, Building, CheckCircle2 } from 'lucide-react'

interface RecordPaymentDialogProps {
  invoice: SalesInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RecordPaymentFormData) => Promise<void>
  isSubmitting?: boolean
}

export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  invoice,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentFormData>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      paymentMethod: 'cash',
      amount: invoice?.due_amount || 0,
      paymentDate: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    if (invoice && open) {
      reset({
        paymentMethod: 'cash',
        amount: invoice.due_amount > 0 ? invoice.due_amount : invoice.total_amount,
        paymentDate: new Date().toISOString().slice(0, 10),
        referenceNumber: '',
        notes: '',
      })
    }
  }, [invoice, open, reset])

  const selectedMethod = watch('paymentMethod')

  const handleFormSubmit = async (data: RecordPaymentFormData) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Record Invoice Payment
          </DialogTitle>
          <DialogDescription>
            Record an incoming payment for invoice <strong className="text-foreground">{invoice.invoice_no}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary Pill */}
        <div className="rounded-lg bg-muted/60 p-3 flex justify-between items-center text-sm border">
          <div>
            <div className="text-xs text-muted-foreground">Total Invoiced</div>
            <div className="font-semibold text-foreground">${invoice.total_amount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Already Paid</div>
            <div className="font-semibold text-emerald-600">${invoice.paid_amount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Amount Due</div>
            <div className="font-bold text-amber-600">${invoice.due_amount.toFixed(2)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={selectedMethod}
              onValueChange={(val: any) => setValue('paymentMethod', val)}
            >
              <SelectTrigger id="paymentMethod" className="h-9">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit / Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="wallet">Digital Wallet</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
            )}
          </div>

          {/* Amount with quick "Pay Full Due" button */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Amount ($)</Label>
              {invoice.due_amount > 0 && (
                <button
                  type="button"
                  onClick={() => setValue('amount', invoice.due_amount)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Pay Full Due (${invoice.due_amount.toFixed(2)})
                </button>
              )}
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount')}
              className="h-9"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="referenceNumber">Reference / Authorization #</Label>
            <Input
              id="referenceNumber"
              placeholder="e.g. TXN-98428, Check #102"
              {...register('referenceNumber')}
              className="h-9"
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              {...register('paymentDate')}
              className="h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional payment notes..."
              rows={2}
              {...register('notes')}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
