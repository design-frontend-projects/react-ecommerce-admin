import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Building2, FileText, Package } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTransfer } from '@/features/stock-transfers/hooks/use-stock-transfers'
import { TransferTimeline } from '@/features/stock-transfers/components/transfer-timeline'
import { TransferWorkflowActions } from '@/features/stock-transfers/components/transfer-workflow-actions'

interface TransferLineItem {
  id: string
  product_variant_id: string
  qty?: number | null
  unit_cost?: number | null
  product_variants?: {
    sku?: string | null
  } | null
}

function StockTransferDetailPage() {
  const { transferId } = Route.useParams()
  const navigate = useNavigate()
  const { data: transfer, isLoading, error } = useTransfer(transferId)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading stock transfer details...</p>
      </div>
    )
  }

  if (error || !transfer) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/stock-transfers' })}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Transfers
        </Button>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Transfer Not Found</CardTitle>
            <CardDescription>
              The requested transfer ({transferId}) could not be loaded or does not exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const items = (transfer.stock_transfer_items as TransferLineItem[]) || []

  const totalQuantity = items.reduce(
    (acc, it) => acc + Number(it.qty || 0),
    0
  )

  const totalCost = items.reduce(
    (acc, it) =>
      acc + Number(it.qty || 0) * Number(it.unit_cost || 0),
    0
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/stock-transfers' })}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Transfer {transfer.reference_no || transfer.id.slice(0, 8)}
              </h1>
              <StatusBadge status={transfer.status} size="md" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {transfer.id}
            </p>
          </div>
        </div>

        <TransferWorkflowActions
          transferId={transfer.id}
          status={transfer.status}
          referenceNo={transfer.reference_no}
        />
      </div>

      {/* Visual Timeline Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Workflow Status & Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TransferTimeline
            status={transfer.status}
            createdAt={transfer.created_at}
          />
        </CardContent>
      </Card>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Source Store / WH</p>
              <p className="text-sm font-bold">{transfer.from_store?.name || '—'}</p>
              <p className="text-[11px] text-muted-foreground">Origin location</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Destination Store / WH</p>
              <p className="text-sm font-bold">{transfer.to_store?.name || '—'}</p>
              <p className="text-[11px] text-muted-foreground">Target location</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Package className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Quantity & Value</p>
              <p className="text-sm font-bold">{totalQuantity} Units</p>
              <p className="text-[11px] text-muted-foreground">
                Est. Total: ${totalCost.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Transfer Line Items</CardTitle>
            <CardDescription className="text-xs">
              List of variants and quantities included in this transfer.
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted">
            {items.length} Lines
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>SKU / Variant</TableHead>
                  <TableHead className="text-end">Transfer Qty</TableHead>
                  <TableHead className="text-end">Unit Cost</TableHead>
                  <TableHead className="text-end">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const subtotal = Number(item.qty || 0) * Number(item.unit_cost || 0)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product_variants?.sku ?? item.product_variant_id}
                      </TableCell>
                      <TableCell className="text-end font-semibold">
                        {item.qty}
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground">
                        ${Number(item.unit_cost || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-end font-bold">
                        ${subtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {transfer.notes && (
            <div className="mt-4 p-3 rounded-lg border bg-muted/20 space-y-1 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Notes & Instructions:
              </span>
              <p className="text-muted-foreground">{transfer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/stock-transfers/$transferId')({
  component: StockTransferDetailPage,
})
