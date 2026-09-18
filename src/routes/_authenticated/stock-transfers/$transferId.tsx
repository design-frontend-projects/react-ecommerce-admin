import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  FileText,
  Package,
  Store,
  Warehouse,
  UserCheck,
  History,
  TrendingUp,
  Weight,
  DollarSign,
  Tag,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTransfer } from '@/features/stock-transfers/hooks/use-stock-transfers'
import { TransferTimeline } from '@/features/stock-transfers/components/transfer-timeline'
import { TransferWorkflowActions } from '@/features/stock-transfers/components/transfer-workflow-actions'
import { TransferMovementHistory } from '@/features/stock-transfers/components/transfer-movement-history'
import type { StockCondition, TransferDetail, TransferItemRow } from '@/features/stock-transfers/data/schema'

const CONDITION_BADGE: Record<
  StockCondition,
  'secondary' | 'destructive' | 'outline' | 'default'
> = {
  good: 'secondary',
  damaged: 'destructive',
  quarantine: 'outline',
  expired: 'destructive',
  blocked: 'outline',
}

function getEntityMeta(
  warehouse?: { name: string | null; code?: string | null } | null,
  store?: { name: string | null } | null,
  branch?: { name: string | null } | null
) {
  if (warehouse?.name) {
    return { name: warehouse.name, code: warehouse.code, type: 'Warehouse', Icon: Warehouse }
  }
  if (store?.name) {
    return { name: store.name, code: null, type: 'Store', Icon: Store }
  }
  if (branch?.name) {
    return { name: branch.name, code: null, type: 'Branch', Icon: Building2 }
  }
  return { name: '—', code: null, type: 'Location', Icon: Warehouse }
}

function StockTransferDetailPage() {
  const { transferId } = Route.useParams()
  const navigate = useNavigate()
  const { data: rawTransfer, isLoading, error } = useTransfer(transferId)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading stock transfer details...</p>
      </div>
    )
  }

  if (error || !rawTransfer) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
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

  const transfer = rawTransfer as unknown as TransferDetail
  const items = (transfer.stock_transfer_items || []) as TransferItemRow[]

  const origin = getEntityMeta(
    transfer.source_warehouse,
    transfer.from_store,
    transfer.from_branch
  )
  const destination = getEntityMeta(
    transfer.destination_warehouse,
    transfer.to_store,
    transfer.to_branch
  )

  const totalQuantity = items.reduce(
    (acc, it) => acc + Number(it.qty || 0),
    0
  )
  const totalReceived = items.reduce(
    (acc, it) => acc + Number(it.received_qty || 0),
    0
  )
  const totalCost = items.reduce(
    (acc, it) => acc + Number(it.qty || 0) * Number(it.unit_cost || 0),
    0
  )
  const totalWeight = items.reduce(
    (acc, it) =>
      acc +
      Number(it.weight || it.product_variants?.weight || it.product_variants?.products?.weight || 0) *
        Number(it.qty || 0),
    0
  )
  const totalRetailValuation = items.reduce(
    (acc, it) => acc + Number(it.list_price || 0) * Number(it.qty || 0),
    0
  )

  const markupPercent =
    totalCost > 0 && totalRetailValuation > totalCost
      ? (((totalRetailValuation - totalCost) / totalCost) * 100).toFixed(1)
      : null

  const isReceivedOrDone = ['received', 'completed'].includes(transfer.status)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar Navigation & Actions */}
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
                Transfer {transfer.reference_no || `TR-${transfer.id.slice(0, 8)}`}
              </h1>
              {transfer.transfer_no && (
                <span className="text-sm font-mono text-muted-foreground">
                  #{transfer.transfer_no}
                </span>
              )}
              <StatusBadge status={transfer.status} size="md" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transfer UUID: {transfer.id}
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
          <CardTitle className="text-sm font-semibold">Workflow Status & Stage Progression</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TransferTimeline
            status={transfer.status}
            createdAt={transfer.created_at}
            approvedAt={transfer.approved_at}
            shippedAt={transfer.shipped_at}
            receivedAt={transfer.received_at}
            updatedAt={transfer.updated_at}
          />
        </CardContent>
      </Card>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Source Card */}
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <origin.Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Origin</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {origin.type}
                </Badge>
              </div>
              <p className="text-sm font-bold">{origin.name}</p>
              {origin.code && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  Code: {origin.code}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Destination Card */}
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <destination.Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Destination</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {destination.type}
                </Badge>
              </div>
              <p className="text-sm font-bold">{destination.name}</p>
              {destination.code && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  Code: {destination.code}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quantities & Freight Weight */}
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Package className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Cargo & Freight</p>
              <p className="text-sm font-bold">{totalQuantity} Units ({items.length} lines)</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-0.5">
                  <Weight className="h-3 w-3" />
                  {totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '0.00 kg'}
                </span>
                {isReceivedOrDone && (
                  <span>• Rec: <strong className="text-emerald-600">{totalReceived}</strong></span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuations Card */}
        <Card>
          <CardContent className="pt-6 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Financial Valuation</p>
              <p className="text-sm font-bold font-mono">
                ${totalCost.toFixed(2)}{' '}
                <span className="text-xs font-normal text-muted-foreground">Cost</span>
              </p>
              <div className="text-[11px] text-muted-foreground">
                {totalRetailValuation > 0 ? (
                  <span className="flex items-center gap-1 font-mono">
                    Retail: ${totalRetailValuation.toFixed(2)}
                    {markupPercent && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-500/30">
                        +{markupPercent}%
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span>Cost valuation based on transfer unit costs</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs: Line Items vs Movement Ledger & Audit */}
      <Tabs defaultValue="items" className="w-full space-y-4">
        <TabsList className="grid w-full sm:w-[460px] grid-cols-2 h-9">
          <TabsTrigger value="items" className="gap-2 text-xs">
            <Package className="h-4 w-4" />
            Transfer Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-2 text-xs">
            <History className="h-4 w-4" />
            Movements & Audit Ledger
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Transfer Items Table */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Transfer Line Items</CardTitle>
                <CardDescription className="text-xs">
                  List of product variants, condition, locations, weights, and valuations for this transfer.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {items.length} Lines • {totalQuantity} Units • {totalWeight.toFixed(2)} kg
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>SKU / Variant</TableHead>
                      <TableHead>Product Details</TableHead>
                      <TableHead>Specs</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead className="text-end">Transfer Qty</TableHead>
                      {isReceivedOrDone && (
                        <TableHead className="text-end">Received Qty</TableHead>
                      )}
                      <TableHead className="text-end">Unit Cost</TableHead>
                      <TableHead className="text-end">List Price</TableHead>
                      <TableHead className="text-end">Cost Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const qty = Number(item.qty || 0)
                      const cost = Number(item.unit_cost || 0)
                      const subtotal = qty * cost
                      const sku = item.product_variants?.sku ?? item.product_variant_id
                      const productName = item.product_variants?.products?.name
                      const brand = item.brand ?? item.product_variants?.products?.brands?.name
                      const category = item.category ?? item.product_variants?.products?.categories?.name
                      const uom = item.uom ?? item.product_variants?.products?.base_uom?.name ?? item.product_variants?.products?.base_uom?.code
                      const weight = Number(item.weight || item.product_variants?.weight || item.product_variants?.products?.weight || 0)
                      const listPrice = Number(item.list_price || 0)

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground font-mono">{sku}</span>
                              {item.product_variants?.barcode && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {item.product_variants.barcode}
                                </span>
                              )}
                              {(item.batch_id || item.serial_id) && (
                                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {item.batch_id ? `Batch: ${item.batch_id} ` : ''}
                                  {item.serial_id ? `SN: ${item.serial_id}` : ''}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col max-w-[200px]">
                              <span className="text-xs font-medium text-foreground truncate">
                                {productName || '—'}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {brand && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                    {brand}
                                  </Badge>
                                )}
                                {category && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span>{uom || 'Unit'}</span>
                              {weight > 0 && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {weight} kg/ea
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={CONDITION_BADGE[item.condition] ?? 'secondary'}
                              className="text-xs capitalize"
                            >
                              {item.condition}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span>
                                From: {item.source_location?.code || 'Default'}
                              </span>
                              <span>
                                To: {item.destination_location?.code || 'Default'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-end font-semibold text-sm">
                            {item.qty}
                          </TableCell>
                          {isReceivedOrDone && (
                            <TableCell className="text-end font-bold text-emerald-600 text-sm">
                              {item.received_qty}
                            </TableCell>
                          )}
                          <TableCell className="text-end text-muted-foreground font-mono text-xs">
                            ${cost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-end font-mono text-xs">
                            {listPrice > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-foreground font-medium">
                                  ${listPrice.toFixed(2)}
                                </span>
                                {item.price_list_name && (
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                                    {item.price_list_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-end font-bold font-mono">
                            ${subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {transfer.notes && (
                <div className="mt-4 p-3.5 rounded-lg border bg-muted/20 space-y-1 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Notes & Instructions:
                  </span>
                  <p className="text-muted-foreground">{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Movements & Audit History Ledger */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                Inventory Movements & Reconciliation Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time tracking of stock dispatch, transit receipts, discrepancies, and state audit history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransferMovementHistory transfer={transfer} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/stock-transfers/$transferId')({
  component: StockTransferDetailPage,
})
