import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Receipt,
  User,
  Clock,
  Loader2,
} from 'lucide-react'
import { useRefundsList, useCanRefundAction } from '../hooks/useRefunds'
import { RefundDetailDialog } from './RefundDetailDialog'

export function RefundApprovalQueue() {
  const canApprove = useCanRefundAction('approve')
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, isLoading } = useRefundsList({
    status: 'pending_approval',
    pageSize: 50,
  })

  const pendingRefunds = data?.items ?? []

  // If user lacks approval permissions, don't show the approval queue management controls
  if (!canApprove) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
        <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <h3 className="font-semibold text-foreground text-sm">Restricted Access</h3>
        <p className="text-xs max-w-sm mx-auto mt-1">
          You do not have supervisor or manager authorization to view or act upon the refund approval queue.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Manager Approval Queue
          </h3>
          <p className="text-xs text-muted-foreground">
            Refund requests requiring manager or supervisor authorization
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-300">
          {pendingRefunds.length} Pending Request(s)
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : pendingRefunds.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-lg bg-card text-muted-foreground space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
          <h4 className="font-medium text-sm text-foreground">All Clear</h4>
          <p className="text-xs max-w-sm mx-auto">
            There are no pending refund approval requests requiring manager intervention at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingRefunds.map((refund) => {
            const formattedTime = new Date(refund.created_at).toLocaleString()
            const customerName = refund.sales_invoices?.customers?.name || 'Walk-in Customer'

            return (
              <Card
                key={refund.id}
                className="border-amber-200/60 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/5 to-transparent hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedRefundId(refund.id)
                  setDetailOpen(true)
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      {refund.refund_number}
                    </span>
                    <Badge variant="outline" className="text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 font-semibold uppercase">
                      {refund.approval_level} Level
                    </Badge>
                  </div>
                  <CardDescription className="text-xs flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5" />
                    Invoice: <span className="font-mono text-foreground">{refund.sales_invoices?.invoice_no}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between bg-background/80 p-2.5 rounded border text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Customer</span>
                      <span className="font-medium text-foreground">{customerName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Requested Payout</span>
                      <span className="text-base font-bold text-foreground">
                        ${Number(refund.requested_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {refund.approval_reason && (
                    <div className="text-xs text-muted-foreground bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/40">
                      <strong className="text-foreground">Policy Trigger:</strong> {refund.approval_reason}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      {formattedTime}
                    </span>

                    <Button
                      size="sm"
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedRefundId(refund.id)
                        setDetailOpen(true)
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review & Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RefundDetailDialog
        refundId={selectedRefundId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
