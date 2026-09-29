import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  History,
  Package,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  User,
  Warehouse,
  Weight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/status-badge'
import { TransferMovementHistory } from '@/features/stock-transfers/components/transfer-movement-history'
import { TransferTimeline } from '@/features/stock-transfers/components/transfer-timeline'
import { TransferWorkflowActions } from '@/features/stock-transfers/components/transfer-workflow-actions'
import type {
  StockCondition,
  TransferDetail,
  TransferItemRow,
  TransferPriority,
} from '@/features/stock-transfers/data/schema'
import { useTransfer } from '@/features/stock-transfers/hooks/use-stock-transfers'

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

const PRIORITY_BADGES: Record<
  TransferPriority,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    className: string
  }
> = {
  low: {
    label: 'Low Priority',
    variant: 'outline',
    className: 'text-muted-foreground',
  },
  normal: {
    label: 'Normal Priority',
    variant: 'secondary',
    className:
      'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  },
  high: {
    label: 'High Priority',
    variant: 'default',
    className:
      'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  urgent: {
    label: 'Urgent Priority',
    variant: 'destructive',
    className:
      'bg-red-500/10 text-red-700 border-red-500/30 animate-pulse dark:text-red-400',
  },
}

const TYPE_LABELS: Record<string, string> = {
  internal: 'Internal Bin Move',
  inter_warehouse: 'Inter-Warehouse',
  warehouse: 'Inter-Warehouse',
  inter_store: 'Inter-Store',
  store: 'Inter-Store',
  inter_branch: 'Inter-Branch',
  branch: 'Inter-Branch',
}

function getEntityMeta(
  warehouse?: { name: string | null; code?: string | null } | null,
  store?: { name: string | null } | null,
  branch?: { name: string | null } | null
) {
  if (warehouse?.name) {
    return {
      name: warehouse.name,
      code: warehouse.code,
      type: 'Warehouse',
      Icon: Warehouse,
    }
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
      <div className='flex h-64 items-center justify-center'>
        <p className='text-muted-foreground'>
          Loading stock transfer details...
        </p>
      </div>
    )
  }

  if (error || !rawTransfer) {
    return (
      <div className='mx-auto max-w-7xl space-y-4 p-6'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate({ to: '/stock-transfers' })}
          className='gap-2'
        >
          <ArrowLeft className='h-4 w-4' /> Back to Transfers
        </Button>
        <Card className='border-destructive/50'>
          <CardHeader>
            <CardTitle className='text-destructive'>
              Transfer Not Found
            </CardTitle>
            <CardDescription>
              The requested transfer ({transferId}) could not be loaded or does
              not exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const transfer = rawTransfer as unknown as TransferDetail
  const items = (transfer.stock_transfer_items || []) as TransferItemRow[]
  const shipments = transfer.stock_transfer_shipments || []
  const receipts = transfer.stock_transfer_receipts || []

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

  const totalQuantity = items.reduce((acc, it) => acc + Number(it.qty || 0), 0)
  const totalShipped = items.reduce(
    (acc, it) => acc + Number(it.shipped_qty || 0),
    0
  )
  const totalReceived = items.reduce(
    (acc, it) => acc + Number(it.received_qty || 0),
    0
  )
  const totalRejected = items.reduce(
    (acc, it) => acc + Number(it.rejected_qty || 0),
    0
  )
  const totalCost = items.reduce(
    (acc, it) => acc + Number(it.qty || 0) * Number(it.unit_cost || 0),
    0
  )
  const totalWeight = items.reduce(
    (acc, it) =>
      acc +
      Number(
        it.weight ||
          it.product_variants?.weight ||
          (it.product_variants?.products as any)?.weight ||
          0
      ) *
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

  const isShippedOrInTransit = [
    'partially_shipped',
    'shipped',
    'in_transit',
    'partially_received',
    'received',
    'closed',
    'completed',
  ].includes(transfer.status)

  const isReceivedOrDone = [
    'partially_received',
    'received',
    'closed',
    'completed',
  ].includes(transfer.status)

  const priorityMeta = transfer.priority
    ? PRIORITY_BADGES[transfer.priority]
    : null
  const transferTypeLabel = transfer.transfer_type
    ? TYPE_LABELS[transfer.transfer_type] || transfer.transfer_type
    : null

  return (
    <div className='mx-auto max-w-7xl space-y-6 p-4 sm:p-6'>
      {/* Top Bar Navigation & Actions */}
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => navigate({ to: '/stock-transfers' })}
            className='h-9 w-9 rounded-full'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <div className='flex flex-wrap items-center gap-2.5'>
              <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
                Transfer{' '}
                {transfer.reference_no || `TR-${transfer.id.slice(0, 8)}`}
              </h1>
              {transfer.transfer_no && (
                <span className='font-mono text-sm text-muted-foreground'>
                  #{transfer.transfer_no}
                </span>
              )}
              <StatusBadge status={transfer.status} size='md' />

              {priorityMeta && (
                <Badge
                  variant={priorityMeta.variant}
                  className={`px-2 py-0.5 text-xs font-semibold ${priorityMeta.className}`}
                >
                  {priorityMeta.label}
                </Badge>
              )}

              {transferTypeLabel && (
                <Badge variant='outline' className='text-xs font-medium'>
                  {transferTypeLabel}
                </Badge>
              )}

              {transfer.reason_code && (
                <Badge
                  variant='secondary'
                  className='gap-1 text-xs font-normal'
                >
                  <Tag className='h-3 w-3 text-muted-foreground' />
                  {transfer.reason_code}
                </Badge>
              )}
            </div>
            <p className='mt-0.5 text-xs text-muted-foreground'>
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

      {/* Cancellation Reason Alert (if cancelled) */}
      {transfer.status === 'cancelled' && (
        <div className='flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive'>
          <AlertCircle className='mt-0.5 h-5 w-5 shrink-0' />
          <div className='space-y-1'>
            <h4 className='text-sm font-bold'>Transfer Cancelled</h4>
            <p className='text-xs leading-relaxed'>
              {transfer.cancellation_reason
                ? `Reason: ${transfer.cancellation_reason}`
                : 'This stock transfer was cancelled without a specified reason.'}
            </p>
            {transfer.cancelled_at && (
              <p className='text-[11px] opacity-80'>
                Cancelled on {new Date(transfer.cancelled_at).toLocaleString()}
                {transfer.cancelled_by_user_id
                  ? ` (Actor: ${transfer.cancelled_by_user_id})`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visual Timeline Progress */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-semibold'>
            Workflow Status & Stage Progression
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-2'>
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
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {/* Source Card */}
        <Card>
          <CardContent className='flex items-start gap-3 pt-6'>
            <div className='rounded-lg bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400'>
              <origin.Icon className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Origin
                </span>
                <Badge variant='outline' className='h-4 px-1 py-0 text-[10px]'>
                  {origin.type}
                </Badge>
              </div>
              <p className='text-sm font-bold'>{origin.name}</p>
              {origin.code && (
                <p className='font-mono text-[11px] text-muted-foreground'>
                  Code: {origin.code}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Destination Card */}
        <Card>
          <CardContent className='flex items-start gap-3 pt-6'>
            <div className='rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400'>
              <destination.Icon className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Destination
                </span>
                <Badge variant='outline' className='h-4 px-1 py-0 text-[10px]'>
                  {destination.type}
                </Badge>
              </div>
              <p className='text-sm font-bold'>{destination.name}</p>
              {destination.code && (
                <p className='font-mono text-[11px] text-muted-foreground'>
                  Code: {destination.code}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quantities & Freight Weight */}
        <Card>
          <CardContent className='flex items-start gap-3 pt-6'>
            <div className='rounded-lg bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400'>
              <Package className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <p className='text-xs font-medium text-muted-foreground'>
                Cargo & Freight
              </p>
              <p className='text-sm font-bold'>
                {totalQuantity} Units ({items.length} lines)
              </p>
              <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
                <span className='inline-flex items-center gap-0.5'>
                  <Weight className='h-3 w-3' />
                  {totalWeight > 0 ? `${totalWeight.toFixed(2)} kg` : '0.00 kg'}
                </span>
                {isShippedOrInTransit && totalShipped > 0 && (
                  <span>
                    • Ship:{' '}
                    <strong className='text-blue-600'>{totalShipped}</strong>
                  </span>
                )}
                {isReceivedOrDone && (
                  <span>
                    • Rec:{' '}
                    <strong className='text-emerald-600'>
                      {totalReceived}
                    </strong>
                  </span>
                )}
                {totalRejected > 0 && (
                  <span>
                    • Rej:{' '}
                    <strong className='text-rose-600'>{totalRejected}</strong>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valuations Card */}
        <Card>
          <CardContent className='flex items-start gap-3 pt-6'>
            <div className='rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400'>
              <DollarSign className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <p className='text-xs font-medium text-muted-foreground'>
                Financial Valuation
              </p>
              <p className='font-mono text-sm font-bold'>
                ${totalCost.toFixed(2)}{' '}
                <span className='text-xs font-normal text-muted-foreground'>
                  Cost
                </span>
              </p>
              <div className='text-[11px] text-muted-foreground'>
                {totalRetailValuation > 0 ? (
                  <span className='flex items-center gap-1 font-mono'>
                    Retail: ${totalRetailValuation.toFixed(2)}
                    {markupPercent && (
                      <Badge
                        variant='outline'
                        className='border-emerald-500/30 px-1 py-0 text-[9px] text-emerald-600'
                      >
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

      {/* Transit Schedule & Workflow Actors Bar */}
      <Card className='bg-muted/10'>
        <CardContent className='pt-4 pb-4'>
          <div className='grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4'>
            {/* Expected Ship */}
            <div className='flex items-center gap-2.5'>
              <div className='shrink-0 rounded-md bg-primary/10 p-2 text-primary'>
                <Truck className='h-4 w-4' />
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>
                  Expected Ship Date
                </span>
                <span className='font-semibold text-foreground'>
                  {transfer.expected_ship_date
                    ? new Date(transfer.expected_ship_date).toLocaleDateString()
                    : 'Not specified'}
                </span>
              </div>
            </div>

            {/* Expected Receive */}
            <div className='flex items-center gap-2.5'>
              <div className='shrink-0 rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400'>
                <Calendar className='h-4 w-4' />
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>
                  Expected Receive Date
                </span>
                <span className='font-semibold text-foreground'>
                  {transfer.expected_receive_date
                    ? new Date(
                        transfer.expected_receive_date
                      ).toLocaleDateString()
                    : 'Not specified'}
                </span>
              </div>
            </div>

            {/* Requested By / At */}
            <div className='flex items-center gap-2.5'>
              <div className='shrink-0 rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400'>
                <User className='h-4 w-4' />
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>
                  Requested By / Time
                </span>
                <span className='block max-w-[170px] truncate font-semibold text-foreground'>
                  {transfer.created_by ||
                    transfer.requested_by_user_id ||
                    'System User'}
                </span>
                <span className='text-[10px] text-muted-foreground'>
                  {new Date(
                    transfer.requested_at || transfer.created_at
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Approved By / At */}
            <div className='flex items-center gap-2.5'>
              <div className='shrink-0 rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400'>
                <ShieldCheck className='h-4 w-4' />
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>
                  Approval Status
                </span>
                <span className='block max-w-[170px] truncate font-semibold text-foreground'>
                  {transfer.approved_at
                    ? transfer.approved_by || transfer.approved_by_user_id
                      ? `Approved by ${transfer.approved_by || transfer.approved_by_user_id}`
                      : 'Approved'
                    : 'Pending Approval'}
                </span>
                {transfer.approved_at && (
                  <span className='text-[10px] text-muted-foreground'>
                    {new Date(transfer.approved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs: Line Items vs Shipments & Receipts vs Movement Ledger & Audit */}
      <Tabs defaultValue='items' className='w-full space-y-4'>
        <TabsList className='grid h-9 w-full grid-cols-3 sm:w-[600px]'>
          <TabsTrigger value='items' className='gap-2 text-xs'>
            <Package className='h-4 w-4' />
            Transfer Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value='shipments' className='gap-2 text-xs'>
            <Truck className='h-4 w-4' />
            Shipments & Receipts ({shipments.length + receipts.length})
          </TabsTrigger>
          <TabsTrigger value='movements' className='gap-2 text-xs'>
            <History className='h-4 w-4' />
            Ledger & Reconciliation
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Transfer Items Table */}
        <TabsContent value='items' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-3'>
              <div>
                <CardTitle className='text-base font-bold'>
                  Transfer Line Items
                </CardTitle>
                <CardDescription className='text-xs'>
                  List of product variants, condition, locations, weights, and
                  valuations for this transfer.
                </CardDescription>
              </div>
              <Badge variant='secondary' className='font-semibold'>
                {items.length} Lines • {totalQuantity} Units •{' '}
                {totalWeight.toFixed(2)} kg
              </Badge>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead>SKU / Variant</TableHead>
                      <TableHead>Product Details</TableHead>
                      <TableHead>Specs</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Locations (From → To)</TableHead>
                      <TableHead className='text-end'>Transfer Qty</TableHead>
                      {isShippedOrInTransit && (
                        <TableHead className='text-end'>Shipped Qty</TableHead>
                      )}
                      {isReceivedOrDone && (
                        <TableHead className='text-end'>Received Qty</TableHead>
                      )}
                      <TableHead className='text-end'>Unit Cost</TableHead>
                      <TableHead className='text-end'>List Price</TableHead>
                      <TableHead className='text-end'>Cost Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const qty = Number(item.qty || 0)
                      const cost = Number(item.unit_cost || 0)
                      const subtotal = qty * cost
                      const sku =
                        item.product_variants?.sku ?? item.product_variant_id
                      const productName = item.product_variants?.products?.name
                      const brand =
                        item.brand ??
                        (item.product_variants?.products as any)?.brands?.name
                      const category =
                        item.category ??
                        (item.product_variants?.products as any)?.categories
                          ?.name
                      const uom =
                        item.uom ??
                        (item.product_variants?.products as any)?.base_uom
                          ?.name ??
                        (item.product_variants?.products as any)?.base_uom?.code
                      const weight = Number(
                        item.weight ||
                          item.product_variants?.weight ||
                          (item.product_variants?.products as any)?.weight ||
                          0
                      )
                      const listPrice = Number(item.list_price || 0)

                      return (
                        <TableRow key={item.id} className='align-top'>
                          <TableCell>
                            <div className='flex flex-col'>
                              <span className='font-mono font-bold text-foreground'>
                                {sku}
                              </span>
                              {item.product_variants?.barcode && (
                                <span className='font-mono text-[10px] text-muted-foreground'>
                                  {item.product_variants.barcode}
                                </span>
                              )}
                              {(item.batch_id || item.serial_id) && (
                                <span className='mt-0.5 font-mono text-[10px] text-muted-foreground'>
                                  {item.batch_id
                                    ? `Batch: ${item.batch_id} `
                                    : ''}
                                  {item.serial_id
                                    ? `SN: ${item.serial_id}`
                                    : ''}
                                </span>
                              )}
                              {item.notes && (
                                <p className='mt-1 rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground italic'>
                                  Note: {item.notes}
                                </p>
                              )}
                              {(Number(item.rejected_qty || 0) > 0 ||
                                item.rejection_reason) && (
                                <div className='mt-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-600'>
                                  Rejected: {item.rejected_qty}{' '}
                                  {item.rejection_reason
                                    ? `(${item.rejection_reason})`
                                    : ''}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex max-w-[200px] flex-col'>
                              <span className='truncate text-xs font-medium text-foreground'>
                                {productName || '—'}
                              </span>
                              <div className='mt-0.5 flex items-center gap-1.5'>
                                {brand && (
                                  <Badge
                                    variant='outline'
                                    className='h-4 px-1 py-0 text-[9px]'
                                  >
                                    {brand}
                                  </Badge>
                                )}
                                {category && (
                                  <span className='truncate text-[10px] text-muted-foreground'>
                                    {category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            <div className='flex flex-col'>
                              <span>{uom || 'Unit'}</span>
                              {weight > 0 && (
                                <span className='font-mono text-[10px] text-muted-foreground'>
                                  {weight} kg/ea
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                CONDITION_BADGE[item.condition] ?? 'secondary'
                              }
                              className='text-xs capitalize'
                            >
                              {item.condition}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            <div className='flex flex-col font-mono text-[11px]'>
                              <span>
                                From:{' '}
                                {item.source_location?.code ||
                                  item.source_location?.name ||
                                  'Default'}
                              </span>
                              <span>
                                To:{' '}
                                {item.destination_location?.code ||
                                  item.destination_location?.name ||
                                  'Default'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-end text-sm font-semibold'>
                            {item.qty}
                          </TableCell>
                          {isShippedOrInTransit && (
                            <TableCell className='text-end text-sm font-semibold text-blue-600'>
                              {item.shipped_qty ?? 0}
                            </TableCell>
                          )}
                          {isReceivedOrDone && (
                            <TableCell className='text-end text-sm font-bold text-emerald-600'>
                              {item.received_qty}
                            </TableCell>
                          )}
                          <TableCell className='text-end font-mono text-xs text-muted-foreground'>
                            ${cost.toFixed(2)}
                          </TableCell>
                          <TableCell className='text-end font-mono text-xs'>
                            {listPrice > 0 ? (
                              <div className='flex flex-col items-end'>
                                <span className='font-medium text-foreground'>
                                  ${listPrice.toFixed(2)}
                                </span>
                                {item.price_list_name && (
                                  <span className='max-w-[80px] truncate text-[9px] text-muted-foreground'>
                                    {item.price_list_name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className='text-end font-mono font-bold'>
                            ${subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {transfer.notes && (
                <div className='mt-4 space-y-1 rounded-lg border bg-muted/20 p-3.5 text-xs'>
                  <span className='flex items-center gap-1.5 font-semibold text-foreground'>
                    <FileText className='h-3.5 w-3.5 text-muted-foreground' />{' '}
                    Notes & Instructions:
                  </span>
                  <p className='text-muted-foreground'>{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Shipments & Receipts Batches */}
        <TabsContent value='shipments' className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {/* Shipment Dispatches */}
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base font-bold'>
                  <Truck className='h-4 w-4 text-primary' />
                  Shipment Dispatches ({shipments.length})
                </CardTitle>
                <CardDescription className='text-xs'>
                  Outbound shipments logged for this stock transfer.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                {shipments.length === 0 ? (
                  <p className='rounded-lg border py-6 text-center text-xs text-muted-foreground'>
                    No shipments dispatched yet.
                  </p>
                ) : (
                  shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className='space-y-2 rounded-lg border bg-muted/10 p-3 text-xs'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-mono font-bold text-primary'>
                          {shipment.shipment_number ||
                            `SH-${shipment.id.slice(0, 8)}`}
                        </span>
                        <span className='text-[11px] text-muted-foreground'>
                          {new Date(shipment.shipped_at).toLocaleString()}
                        </span>
                      </div>
                      {shipment.shipped_by_user_id && (
                        <p className='text-[11px] text-muted-foreground'>
                          Dispatched by:{' '}
                          <span className='font-mono'>
                            {shipment.shipped_by_user_id}
                          </span>
                        </p>
                      )}
                      {shipment.notes && (
                        <p className='rounded bg-muted/30 p-1.5 text-[11px] text-muted-foreground'>
                          Notes: {shipment.notes}
                        </p>
                      )}
                      {shipment.stock_transfer_shipment_items &&
                        shipment.stock_transfer_shipment_items.length > 0 && (
                          <div className='space-y-1 border-t pt-2'>
                            <span className='text-[11px] font-semibold text-muted-foreground'>
                              Dispatched Items (
                              {shipment.stock_transfer_shipment_items.length}):
                            </span>
                            <div className='flex flex-wrap gap-1.5'>
                              {shipment.stock_transfer_shipment_items.map(
                                (it) => (
                                  <Badge
                                    key={it.id}
                                    variant='secondary'
                                    className='font-mono text-[10px]'
                                  >
                                    Qty: {it.shipped_qty} • {it.condition}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Arrival Receipts */}
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base font-bold'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                  Destination Receipts ({receipts.length})
                </CardTitle>
                <CardDescription className='text-xs'>
                  Inbound receiving events and item condition checks.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                {receipts.length === 0 ? (
                  <p className='rounded-lg border py-6 text-center text-xs text-muted-foreground'>
                    No arrival receipts logged yet.
                  </p>
                ) : (
                  receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className='space-y-2 rounded-lg border bg-muted/10 p-3 text-xs'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                          {receipt.receipt_number ||
                            `RC-${receipt.id.slice(0, 8)}`}
                        </span>
                        <span className='text-[11px] text-muted-foreground'>
                          {new Date(receipt.received_at).toLocaleString()}
                        </span>
                      </div>
                      {receipt.received_by_user_id && (
                        <p className='text-[11px] text-muted-foreground'>
                          Received by:{' '}
                          <span className='font-mono'>
                            {receipt.received_by_user_id}
                          </span>
                        </p>
                      )}
                      {receipt.notes && (
                        <p className='rounded bg-muted/30 p-1.5 text-[11px] text-muted-foreground'>
                          Notes: {receipt.notes}
                        </p>
                      )}
                      {receipt.stock_transfer_receipt_items &&
                        receipt.stock_transfer_receipt_items.length > 0 && (
                          <div className='space-y-1 border-t pt-2'>
                            <span className='text-[11px] font-semibold text-muted-foreground'>
                              Received Items (
                              {receipt.stock_transfer_receipt_items.length}):
                            </span>
                            <div className='flex flex-wrap gap-1.5'>
                              {receipt.stock_transfer_receipt_items.map(
                                (it) => (
                                  <Badge
                                    key={it.id}
                                    variant={
                                      Number(it.rejected_qty || 0) > 0
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                    className='font-mono text-[10px]'
                                  >
                                    Rec: {it.received_qty}
                                    {Number(it.rejected_qty || 0) > 0 &&
                                      ` (Rej: ${it.rejected_qty})`}
                                    {` • ${it.condition}`}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Movements & Audit History Ledger */}
        <TabsContent value='movements' className='space-y-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-bold'>
                Inventory Movements & Reconciliation Ledger
              </CardTitle>
              <CardDescription className='text-xs'>
                Real-time tracking of stock dispatch, transit receipts,
                discrepancies, and state audit history.
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

export const Route = createFileRoute(
  '/_authenticated/stock-transfers/$transferId'
)({
  component: StockTransferDetailPage,
})
