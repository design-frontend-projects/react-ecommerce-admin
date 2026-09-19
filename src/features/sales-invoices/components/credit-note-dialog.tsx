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
import { creditNoteSchema, type CreditNoteFormData } from '../schemas'
import type { SalesInvoice } from '../types'
import { FileText, ArrowLeftRight } from 'lucide-react'

interface CreditNoteDialogProps {
  invoice: SalesInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreditNoteFormData) => Promise<void>
  isSubmitting?: boolean
}

export const CreditNoteDialog: React.FC<CreditNoteDialogProps> = ({
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
  } = useForm<CreditNoteFormData>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: { reason: '' },
  })

  const handleFormSubmit = async (data: CreditNoteFormData) => {
    await onSubmit(data)
    reset()
    onOpenChange(false)
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ArrowLeftRight className="w-5 h-5" />
            Issue Credit Note
          </DialogTitle>
          <DialogDescription>
            Generate an official credit note referencing invoice <strong className="text-foreground">{invoice.invoice_no}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="creditReason">Credit Note Reason / Notes</Label>
            <Textarea
              id="creditReason"
              placeholder="e.g. Returned merchandise, billing price adjustment approved by management..."
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Generate Credit Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
