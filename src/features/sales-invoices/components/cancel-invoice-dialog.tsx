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
import { cancelInvoiceSchema, type CancelInvoiceFormData } from '../schemas'
import type { SalesInvoice } from '../types'
import { AlertCircle } from 'lucide-react'

interface CancelInvoiceDialogProps {
  invoice: SalesInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CancelInvoiceFormData) => Promise<void>
  isSubmitting?: boolean
}

export const CancelInvoiceDialog: React.FC<CancelInvoiceDialogProps> = ({
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
  } = useForm<CancelInvoiceFormData>({
    resolver: zodResolver(cancelInvoiceSchema),
    defaultValues: { reason: '' },
  })

  const handleFormSubmit = async (data: CancelInvoiceFormData) => {
    await onSubmit(data)
    reset()
    onOpenChange(false)
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Cancel Invoice
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel invoice <strong className="text-foreground">{invoice.invoice_no}</strong>? This action cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">Reason for Cancellation</Label>
            <Textarea
              id="cancelReason"
              placeholder="e.g. Order cancelled by client, duplicate document issued..."
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
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
