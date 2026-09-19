import React from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { voidInvoiceSchema, type VoidInvoiceFormData } from '../schemas'
import type { SalesInvoice } from '../types'
import { Ban, AlertTriangle } from 'lucide-react'

interface VoidInvoiceDialogProps {
  invoice: SalesInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: VoidInvoiceFormData) => Promise<void>
  isSubmitting?: boolean
}

export const VoidInvoiceDialog: React.FC<VoidInvoiceDialogProps> = ({
  invoice,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoidInvoiceFormData>({
    resolver: zodResolver(voidInvoiceSchema),
    defaultValues: { reason: '' },
  })

  const handleFormSubmit = async (data: VoidInvoiceFormData) => {
    await onSubmit(data)
    reset()
    onOpenChange(false)
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Ban className="w-5 h-5" />
            Void Posted Invoice
          </DialogTitle>
          <DialogDescription>
            Voiding invoice <strong className="text-foreground">{invoice.invoice_no}</strong> maintains an audit trail in compliance with commercial accounting standards.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Voiding an invoice marks the financial record as nullified. A comprehensive justification is required for tax and audit records.
          </span>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="voidReason">Accounting Justification / Reason</Label>
            <Textarea
              id="voidReason"
              placeholder="e.g. Invoiced under incorrect legal entity; re-issuing under revised tax registration..."
              rows={3}
              {...register('reason')}
              className="text-sm resize-none"
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
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
              className="bg-purple-800 hover:bg-purple-900 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Voiding...' : 'Confirm Void'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
