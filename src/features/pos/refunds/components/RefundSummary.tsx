import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldAlert, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react'
import type {
  RefundPolicy,
  refund_method_enum,
} from '../types'

interface RefundSummaryProps {
  totalAmount: number
  itemCount: number
  policy?: RefundPolicy | null
  originalPaymentMethod?: string | null
  refundMethod: refund_method_enum
  onRefundMethodChange: (method: refund_method_enum) => void
  refundReference: string
  onRefundReferenceChange: (ref: string) => void
  reason: string
  onReasonChange: (reason: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  inventoryReturnRequired: boolean
  onInventoryReturnRequiredChange: (req: boolean) => void
  disabled?: boolean
}

export function RefundSummary({
  totalAmount,
  itemCount,
  policy,
  originalPaymentMethod,
  refundMethod,
  onRefundMethodChange,
  refundReference,
  onRefundReferenceChange,
  reason,
  onReasonChange,
  notes,
  onNotesChange,
  inventoryReturnRequired,
  onInventoryReturnRequiredChange,
  disabled = false,
}: RefundSummaryProps) {
  // Determine policy expectation
  const requiresSupervisor = policy && totalAmount > policy.require_supervisor_above
  const requiresManager = policy && totalAmount > policy.require_manager_above
  const requiresTopManagement = policy && totalAmount > policy.require_top_management_above

  let approvalMessage = 'Authorized for direct cashier refund'
  let isApprovalNeeded = false
  if (requiresTopManagement) {
    approvalMessage = `Amount exceeds $${policy.require_top_management_above.toFixed(2)}. Requires top management approval.`
    isApprovalNeeded = true
  } else if (requiresManager) {
    approvalMessage = `Amount exceeds $${policy.require_manager_above.toFixed(2)}. Requires manager approval.`
    isApprovalNeeded = true
  } else if (requiresSupervisor) {
    approvalMessage = `Amount exceeds $${policy.require_supervisor_above.toFixed(2)}. Requires supervisor approval.`
    isApprovalNeeded = true
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Refund Details</span>
          <span className="text-xs font-normal text-muted-foreground">
            {itemCount} item(s) selected
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount Callout */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Total Refund Payout
            </span>
            <div className="text-2xl font-bold text-foreground">
              ${totalAmount.toFixed(2)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Policy Notice */}
        {totalAmount > 0 && (
          <Alert
            variant={isApprovalNeeded ? 'destructive' : 'default'}
            className={`py-2 text-xs flex items-center gap-2 ${
              !isApprovalNeeded
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {isApprovalNeeded ? (
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <AlertDescription className="text-xs">
              {approvalMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">Disbursement Method</Label>
          <Select
            value={refundMethod}
            onValueChange={(val) => onRefundMethodChange(val as refund_method_enum)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select refund method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash Payout</SelectItem>
              <SelectItem value="card">Card Refund</SelectItem>
              <SelectItem value="original_payment_method">
                Original Payment ({originalPaymentMethod || 'Auto'})
              </SelectItem>
              <SelectItem value="store_credit">Store Credit Voucher</SelectItem>
              <SelectItem value="customer_wallet">Customer Wallet Credit</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reference / Transaction ID */}
        {(refundMethod === 'card' || refundMethod === 'bank_transfer') && (
          <div className="space-y-1.5">
            <Label className="text-xs">Transaction / Gateway Reference</Label>
            <Input
              value={refundReference}
              onChange={(e) => onRefundReferenceChange(e.target.value)}
              placeholder="e.g. Card transaction authorization code"
              className="h-9 text-xs"
              disabled={disabled}
            />
          </div>
        )}

        {/* Physical Inventory Restock Switch */}
        <div className="flex items-center justify-between p-2.5 rounded border bg-muted/20">
          <div className="space-y-0.5">
            <Label className="text-xs font-medium cursor-pointer">
              Physical Item Restocking
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Post inbound inventory adjustment to store stock
            </p>
          </div>
          <Switch
            checked={inventoryReturnRequired}
            onCheckedChange={onInventoryReturnRequiredChange}
            disabled={disabled}
          />
        </div>

        {/* Reason & Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Refund Reason</Label>
          <Input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Customer changed mind, wrong size"
            className="h-8 text-xs"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Internal Notes (Optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Additional manager remarks..."
            className="text-xs min-h-[60px]"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}
