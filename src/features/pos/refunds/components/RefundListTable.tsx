import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Receipt,
  Eye,
  CheckCircle2,
  Play,
  RotateCcw,
  Loader2,
  Calendar,
} from 'lucide-react'
import { RefundStatusBadge } from './RefundStatusBadge'
import { RefundDetailDialog } from './RefundDetailDialog'
import {
  useRefundsList,
  useCanRefundAction,
} from '../hooks/useRefunds'
import type { refund_status_enum } from '@/generated/prisma/enums'

export function RefundListTable() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const canApprove = useCanRefundAction('approve')
  const canExecute = useCanRefundAction('execute')

  const { data, isLoading, isFetching } = useRefundsList({
    status: statusFilter !== 'all' ? (statusFilter as refund_status_enum) : undefined,
    search: searchTerm || undefined,
    pageSize: 30,
  })

  const refunds = data?.items ?? []

  const handleOpenDetail = (id: string) => {
    setSelectedRefundId(id)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search refund #, reference, or reason..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved (Ready)</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {isFetching && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs">
              <TableHead className="w-[150px]">Refund #</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading refund records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : refunds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
                  <Receipt className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  No refund records match the selected criteria.
                </TableCell>
              </TableRow>
            ) : (
              refunds.map((refund) => {
                const formattedDate = new Date(refund.created_at).toLocaleDateString()
                const customerName = refund.sales_invoices?.customers?.name || 'Walk-in Customer'

                return (
                  <TableRow
                    key={refund.id}
                    className="hover:bg-muted/30 cursor-pointer text-xs"
                    onClick={() => handleOpenDetail(refund.id)}
                  >
                    <TableCell className="font-semibold text-foreground">
                      {refund.refund_number}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {refund.sales_invoices?.invoice_no || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {customerName}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      ${Number(refund.requested_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${Number(refund.approved_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <RefundStatusBadge status={refund.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formattedDate}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Approve: strictly hidden if unauthorized or not pending_approval */}
                        {canApprove && refund.status === 'pending_approval' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                            onClick={() => handleOpenDetail(refund.id)}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}

                        {/* Quick Execute: strictly hidden if unauthorized or not approved */}
                        {canExecute && refund.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            onClick={() => handleOpenDetail(refund.id)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Disburse
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => handleOpenDetail(refund.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <RefundDetailDialog
        refundId={selectedRefundId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
