import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Receipt,
  User,
  Calendar,
} from 'lucide-react'
import { RefundItemSelector } from './RefundItemSelector'
import { RefundSummary } from './RefundSummary'
import { InvoiceSearchDialog } from './InvoiceSearchDialog'
import { ManagerPinModal } from './ManagerPinModal'
import {
  useRefundableItems,
  useCreateRefund,
  useExecuteRefund,
  useCanRefundAction,
} from '../hooks/useRefunds'
import type {
  RefundItemDraft,
  refund_method_enum,
} from '../types'

interface POSRefundWorkflowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialInvoiceId?: string | null
  onRefundCompleted?: (refundId: string) => void
}

export function POSRefundWorkflowModal({
  open,
  onOpenChange,
  initialInvoiceId = null,
  onRefundCompleted,
}: POSRefundWorkflowModalProps) {
  // Can user initiate refunds?
  const canCreate = useCanRefundAction('create')

  // Step state: 'select_invoice' | 'select_items' | 'summary'
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(initialInvoiceId)
  const [searchDialogOpen, setSearchDialogOpen] = useState(!initialInvoiceId)
  const [selectedDrafts, setSelectedDrafts] = useState<Map<string, RefundItemDraft>>(new Map())

  // Financial & Method form state
  const [refundMethod, setRefundMethod] = useState<refund_method_enum>('cash')
  const [refundReference, setRefundReference] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [inventoryReturnRequired, setInventoryReturnRequired] = useState(true)

  // PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pendingPinSubmit, setPendingPinSubmit] = useState<((pin: string) => Promise<void>) | null>(null)

  // Fetch refundable items
  const { data: invoiceData, isLoading: isLoadingInvoice } = useRefundableItems(selectedInvoiceId)

  // Mutations
  const createRefundMutation = useCreateRefund()
  const executeRefundMutation = useExecuteRefund()

  // Calculate total refund amount from drafts
  const totalRefundAmount = Array.from(selectedDrafts.values()).reduce(
    (sum, draft) => sum + draft.refundAmount,
    0
  )

  const handleDraftChange = (itemId: string, draft: RefundItemDraft | null) => {
    setSelectedDrafts((prev) => {
      const next = new Map(prev)
      if (!draft) {
        next.delete(itemId)
      } else {
        next.set(itemId, draft)
      }
      return next
    })
  }

  const handleReset = () => {
    setSelectedInvoiceId(null)
    setSelectedDrafts(new Map())
    setReason('')
    setNotes('')
    setRefundReference('')
    onOpenChange(false)
  }

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id)
    setSelectedDrafts(new Map())
  }

  const handleSubmitRefund = async () => {
    if (!selectedInvoiceId || selectedDrafts.size === 0) return

    const items = Array.from(selectedDrafts.values()).map((d) => ({
      salesInvoiceItemId: d.salesInvoiceItemId,
      productVariantId: d.productVariantId,
      refundQuantity: d.refundQuantity,
      disposition: d.disposition,
      reason: d.reason || undefined,
    }))

    const payload = {
      salesInvoiceId: selectedInvoiceId,
      items,
      refundMethod,
      refundReference: refundReference || undefined,
      reason: reason || undefined,
      notes: notes || undefined,
      inventoryReturnRequired,
      idempotencyKey: crypto.randomUUID(),
    }

    // Attempt creation. If PIN required, open PIN dialog
    const attemptCreation = async (userPin?: string) => {
      setPinError(null)
      try {
        const result = await createRefundMutation.mutateAsync({
          ...payload,
          pin: userPin,
        })

        // If refund was auto-approved and cashier can execute, execute payout immediately
        if (result.refund.status === 'approved') {
          await executeRefundMutation.mutateAsync({
            refundId: result.refund.id,
            pin: userPin,
          })
        }

        setPinModalOpen(false)
        handleReset()
        if (onRefundCompleted) onRefundCompleted(result.refund.id)
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('pin')) {
          // Open PIN modal
          setPendingPinSubmit(() => async (pin: string) => {
            await attemptCreation(pin)
          })
          setPinModalOpen(true)
        } else {
          setPinError(err.message || 'Refund processing failed')
        }
      }
    }

    await attemptCreation()
  }

  const isSubmitting = createRefundMutation.isPending || executeRefundMutation.isPending

  // If user cannot create refunds, hide modal content
  if (!canCreate) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">POS Refund & Return Workflow</DialogTitle>
                  <DialogDescription>
                    Process item returns, calculate proportional refunds, and update inventory
                  </DialogDescription>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setSearchDialogOpen(true)}
              >
                <Search className="w-3.5 h-3.5" />
                {selectedInvoiceId ? 'Switch Invoice' : 'Find Invoice'}
              </Button>
            </div>
          </DialogHeader>

          {/* Selected Invoice Banner */}
          {invoiceData?.invoice && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {invoiceData.invoice.invoiceNo}
                </span>
                <Badge variant="outline" className="text-[10px] py-0 font-normal">
                  {invoiceData.invoice.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(invoiceData.invoice.invoiceDate).toLocaleDateString()}
                </span>
                {invoiceData.invoice.customerName && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {invoiceData.invoice.customerName}
                  </span>
                )}
                <span>
                  Invoice Paid: <strong className="text-foreground">${invoiceData.invoice.paidAmount.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isLoadingInvoice ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs">Loading invoice items and policy...</span>
              </div>
            ) : !selectedInvoiceId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg p-8">
                <Receipt className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-foreground text-sm">No Invoice Selected</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                  Please search and select the original sales invoice to review refundable line items.
                </p>
                <Button onClick={() => setSearchDialogOpen(true)} className="gap-2 text-xs">
                  <Search className="w-4 h-4" />
                  Search Invoices
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Items Selector */}
                <div className="lg:col-span-7">
                  <RefundItemSelector
                    items={invoiceData?.items ?? []}
                    selectedDrafts={selectedDrafts}
                    onDraftChange={handleDraftChange}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Right: Refund Summary & Controls */}
                <div className="lg:col-span-5">
                  <RefundSummary
                    totalAmount={totalRefundAmount}
                    itemCount={selectedDrafts.size}
                    policy={invoiceData?.policy}
                    originalPaymentMethod={invoiceData?.invoice.primaryPaymentMethod}
                    refundMethod={refundMethod}
                    onRefundMethodChange={setRefundMethod}
                    refundReference={refundReference}
                    onRefundReferenceChange={setRefundReference}
                    reason={reason}
                    onReasonChange={setReason}
                    notes={notes}
                    onNotesChange={setNotes}
                    inventoryReturnRequired={inventoryReturnRequired}
                    onInventoryReturnRequiredChange={setInventoryReturnRequired}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSubmitRefund}
              disabled={!selectedInvoiceId || selectedDrafts.size === 0 || isSubmitting}
              className="text-xs gap-1.5 bg-primary font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Process Refund (${totalRefundAmount.toFixed(2)})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectInvoice={handleSelectInvoice}
      />

      <ManagerPinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="POS PIN Verification"
        description="Please enter your authorization PIN to verify and finalize this refund."
        onSubmit={async (pin) => {
          if (pendingPinSubmit) {
            await pendingPinSubmit(pin)
          }
        }}
        isLoading={isSubmitting}
        error={pinError}
      />
    </>
  )
}
