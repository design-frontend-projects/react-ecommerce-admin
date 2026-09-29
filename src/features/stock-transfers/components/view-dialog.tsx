import { useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  ExternalLink,
  History,
  Package,
  Store,
  Tag,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import type {
  StockCondition,
  TransferDetail,
  TransferListItem,
  TransferPriority,
} from '../data/schema'
import { useTransfer } from '../hooks/use-stock-transfers'
import { TransferMovementHistory } from './transfer-movement-history'
import { TransferTimeline } from './transfer-timeline'
import { TransferWorkflowActions } from './transfer-workflow-actions'

function getOriginTargetLabels(t: TFunction, item: TransferListItem) {
  const from = item.source_warehouse?.name
    ? {
        name: item.source_warehouse.name,
        type: t('stockTransfers.entityTypes.warehouse', 'Warehouse'),
        Icon: Warehouse,
      }
    : item.from_store?.name
      ? {
          name: item.from_store.name,
          type: t('stockTransfers.entityTypes.store', 'Store'),
          Icon: Store,
        }
      : item.from_branch?.name
        ? {
            name: item.from_branch.name,
            type: t('stockTransfers.entityTypes.branch', 'Branch'),
            Icon: Building2,
          }
        : { name: '—', type: '', Icon: Warehouse }

  const to = item.destination_warehouse?.name
    ? {
        name: item.destination_warehouse.name,
        type: t('stockTransfers.entityTypes.warehouse', 'Warehouse'),
        Icon: Warehouse,
      }
    : item.to_store?.name
      ? {
          name: item.to_store.name,
          type: t('stockTransfers.entityTypes.store', 'Store'),
          Icon: Store,
        }
      : item.to_branch?.name
        ? {
            name: item.to_branch.name,
            type: t('stockTransfers.entityTypes.branch', 'Branch'),
            Icon: Building2,
          }
        : { name: '—', type: '', Icon: Warehouse }

  return { from, to }
}

const CONDITION_COLORS: Record<
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
  low: { label: 'Low', variant: 'outline', className: 'text-muted-foreground' },
  normal: {
    label: 'Normal',
    variant: 'secondary',
    className:
      'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  },
  high: {
    label: 'High',
    variant: 'default',
    className:
      'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  },
  urgent: {
    label: 'Urgent',
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

export function TransferViewDialog({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: TransferListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: detail, isLoading } = useTransfer(
    open ? transfer.id : undefined
  )

  const { from, to } = getOriginTargetLabels(t, transfer)

  const items = detail?.stock_transfer_items || []
  const shipments = detail?.stock_transfer_shipments || []
  const receipts = detail?.stock_transfer_receipts || []

  const totalQuantity = items.reduce((acc, it) => acc + Number(it.qty || 0), 0)
  const totalReceived = items.reduce(
    (acc, it) => acc + Number(it.received_qty || 0),
    0
  )
  const totalCost = items.reduce(
    (acc, it) => acc + Number(it.qty || 0) * Number(it.unit_cost || 0),
    0
  )

  const isReceivedOrDone = ['received', 'completed'].includes(transfer.status)
  const priorityMeta = transfer.priority
    ? PRIORITY_BADGES[transfer.priority]
    : null
  const transferTypeLabel = transfer.transfer_type
    ? TYPE_LABELS[transfer.transfer_type] || transfer.transfer_type
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'>
        <DialogHeader className='shrink-0 space-y-2.5 border-b p-6 pb-4'>
          <div className='flex items-center justify-between gap-3 pr-6'>
            <div className='flex items-center gap-2.5'>
              <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
                {t('stockTransfers.viewDialog.transfer', 'Transfer:')}{' '}
                {transfer.reference_no || `TR-${transfer.id.slice(0, 8)}`}
              </DialogTitle>
              {transfer.transfer_no && (
                <span className='font-mono text-xs text-muted-foreground'>
                  #{transfer.transfer_no}
                </span>
              )}
            </div>
            <StatusBadge status={transfer.status} size='sm' />
          </div>

          <DialogDescription asChild>
            <div className='flex flex-wrap items-center gap-3 pt-1 text-xs'>
              {/* Origin -> Destination Route */}
              <div className='flex items-center gap-1.5'>
                <span className='text-muted-foreground'>
                  {t('stockTransfers.viewDialog.from', 'From:')}
                </span>
                <span className='flex items-center gap-1 font-semibold text-foreground'>
                  {from.type && (
                    <Badge
                      variant='outline'
                      className='h-4 px-1 py-0 text-[10px]'
                    >
                      {from.type}
                    </Badge>
                  )}
                  {from.name}
                </span>
                <ArrowRight className='h-3 w-3 text-muted-foreground rtl:rotate-180' />
                <span className='text-muted-foreground'>
                  {t('stockTransfers.viewDialog.to', 'To:')}
                </span>
                <span className='flex items-center gap-1 font-semibold text-foreground'>
                  {to.type && (
                    <Badge
                      variant='outline'
                      className='h-4 px-1 py-0 text-[10px]'
                    >
                      {to.type}
                    </Badge>
                  )}
                  {to.name}
                </span>
              </div>

              {/* Type, Priority & Reason Code Badges */}
              <div className='ml-auto flex flex-wrap items-center gap-1.5'>
                {transferTypeLabel && (
                  <Badge
                    variant='outline'
                    className='h-5 text-[10px] font-medium'
                  >
                    {transferTypeLabel}
                  </Badge>
                )}
                {priorityMeta && (
                  <Badge
                    variant={priorityMeta.variant}
                    className={`h-5 text-[10px] font-semibold ${priorityMeta.className}`}
                  >
                    {priorityMeta.label}
                  </Badge>
                )}
                {transfer.reason_code && (
                  <Badge
                    variant='secondary'
                    className='h-5 gap-1 text-[10px] font-normal'
                  >
                    <Tag className='h-2.5 w-2.5 text-muted-foreground' />
                    {transfer.reason_code}
                  </Badge>
                )}
              </div>
            </div>
          </DialogDescription>

          {/* Schedule & Cancellation Info */}
          <div className='flex flex-wrap items-center gap-3 pt-1 text-[11px]'>
            {(transfer.expected_ship_date ||
              transfer.expected_receive_date) && (
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Calendar className='h-3.5 w-3.5 text-primary' />
                {transfer.expected_ship_date && (
                  <span>
                    Ship:{' '}
                    <strong className='text-foreground'>
                      {new Date(
                        transfer.expected_ship_date
                      ).toLocaleDateString()}
                    </strong>
                  </span>
                )}
                {transfer.expected_ship_date &&
                  transfer.expected_receive_date && <span>•</span>}
                {transfer.expected_receive_date && (
                  <span>
                    Est. Delivery:{' '}
                    <strong className='text-foreground'>
                      {new Date(
                        transfer.expected_receive_date
                      ).toLocaleDateString()}
                    </strong>
                  </span>
                )}
              </div>
            )}

            {transfer.status === 'cancelled' &&
              transfer.cancellation_reason && (
                <div className='flex w-full items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive'>
                  <AlertCircle className='h-3.5 w-3.5 shrink-0' />
                  <span>
                    <strong>Cancellation Reason:</strong>{' '}
                    {transfer.cancellation_reason}
                  </span>
                </div>
              )}
          </div>
        </DialogHeader>

        <ScrollArea className='min-h-0 flex-1'>
          <div className='space-y-4 p-6'>
            {/* Visual Workflow Stepper */}
            <div className='rounded-xl border bg-muted/20 px-3 py-3'>
              <TransferTimeline
                status={transfer.status}
                createdAt={transfer.created_at}
                approvedAt={transfer.approved_at}
                shippedAt={transfer.shipped_at}
                receivedAt={transfer.received_at}
                updatedAt={transfer.updated_at}
              />
            </div>

            {/* Tabs for Items, Shipments & Receipts, and Movement Ledger */}
            <Tabs defaultValue='items' className='w-full'>
              <TabsList className='mb-3 grid h-8 w-full grid-cols-3 text-xs'>
                <TabsTrigger value='items' className='gap-1.5 text-xs'>
                  <Package className='h-3.5 w-3.5' />
                  {t('stockTransfers.viewDialog.transferLineItems', {
                    count: items.length,
                    defaultValue: `Line Items (${items.length})`,
                  })}
                </TabsTrigger>
                <TabsTrigger value='shipments' className='gap-1.5 text-xs'>
                  <Warehouse className='h-3.5 w-3.5' />
                  {t('stockTransfers.viewDialog.shipmentsReceipts', {
                    count: shipments.length + receipts.length,
                    defaultValue: `Ship / Receive (${shipments.length + receipts.length})`,
                  })}
                </TabsTrigger>
                <TabsTrigger value='ledger' className='gap-1.5 text-xs'>
                  <History className='h-3.5 w-3.5' />
                  {t(
                    'stockTransfers.viewDialog.movementsLedgerAndAudit',
                    'Ledger & Audit'
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value='items' className='m-0 space-y-3'>
                <div className='flex items-center justify-between text-xs font-semibold text-muted-foreground'>
                  <span>
                    {t(
                      'stockTransfers.viewDialog.itemsTitle',
                      'Transfer Items'
                    )}{' '}
                    ({items.length})
                  </span>
                  <div className='flex items-center gap-3'>
                    <span>
                      {t('stockTransfers.viewDialog.totalQty', 'Total Qty:')}{' '}
                      {totalQuantity}
                    </span>
                    {isReceivedOrDone && (
                      <span className='font-bold text-emerald-600'>
                        {t('stockTransfers.viewDialog.received', 'Received:')}{' '}
                        {totalReceived}
                      </span>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <p className='py-6 text-center text-sm text-muted-foreground'>
                    {t(
                      'stockTransfers.viewDialog.loading',
                      'Loading transfer items...'
                    )}
                  </p>
                ) : (
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/40'>
                          <TableHead className='text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.productVariant',
                              'Product / Variant'
                            )}
                          </TableHead>
                          <TableHead className='text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.locations',
                              'Locations'
                            )}
                          </TableHead>
                          <TableHead className='text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.condition',
                              'Condition'
                            )}
                          </TableHead>
                          <TableHead className='text-end text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.transferQty',
                              'Transfer Qty'
                            )}
                          </TableHead>
                          {isReceivedOrDone && (
                            <TableHead className='text-end text-xs'>
                              {t(
                                'stockTransfers.viewDialog.columns.received',
                                'Received'
                              )}
                            </TableHead>
                          )}
                          <TableHead className='text-end text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.unitCost',
                              'Unit Cost'
                            )}
                          </TableHead>
                          <TableHead className='text-end text-xs'>
                            {t(
                              'stockTransfers.viewDialog.columns.subtotal',
                              'Subtotal'
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const lineTotal =
                            Number(item.qty || 0) * Number(item.unit_cost || 0)
                          const sku =
                            item.product_variants?.sku ??
                            item.product_variant_id
                          const productName =
                            item.product_variants?.products?.name ||
                            item.product_variants?.name
                          const brand =
                            item.brand ||
                            item.product_variants?.brand ||
                            item.product_variants?.products?.brand_name
                          const category =
                            item.category ||
                            item.product_variants?.category ||
                            item.product_variants?.products?.category_name
                          const uom =
                            item.uom || item.product_variants?.uom || 'PCS'

                          return (
                            <TableRow
                              key={item.id}
                              className='align-top text-xs'
                            >
                              <TableCell>
                                <div className='flex flex-col gap-0.5'>
                                  <div className='flex flex-wrap items-center gap-1.5'>
                                    <span className='font-mono font-semibold text-foreground'>
                                      {sku}
                                    </span>
                                    {brand && (
                                      <Badge
                                        variant='outline'
                                        className='h-4 px-1 py-0 text-[10px]'
                                      >
                                        {brand}
                                      </Badge>
                                    )}
                                    {category && (
                                      <span className='text-[10px] text-muted-foreground'>
                                        • {category}
                                      </span>
                                    )}
                                  </div>
                                  {productName && (
                                    <span className='line-clamp-1 text-[11px] text-muted-foreground'>
                                      {productName}
                                    </span>
                                  )}
                                  <div className='flex items-center gap-2 font-mono text-[10px] text-muted-foreground'>
                                    <span>
                                      {t('stockTransfers.viewDialog.uom', {
                                        uom,
                                        defaultValue: `UOM: ${uom}`,
                                      })}
                                    </span>
                                    {(item.batch_id || item.serial_id) && (
                                      <span>
                                        {item.batch_id
                                          ? t(
                                              'stockTransfers.viewDialog.batch',
                                              {
                                                batch: item.batch_id,
                                                defaultValue: `Batch: ${item.batch_id} `,
                                              }
                                            )
                                          : ''}
                                        {item.serial_id
                                          ? t(
                                              'stockTransfers.viewDialog.serialNo',
                                              {
                                                serial: item.serial_id,
                                                defaultValue: `SN: ${item.serial_id}`,
                                              }
                                            )
                                          : ''}
                                      </span>
                                    )}
                                  </div>
                                  {item.notes && (
                                    <p className='mt-0.5 rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground italic'>
                                      Note: {item.notes}
                                    </p>
                                  )}
                                  {(Number(item.rejected_qty || 0) > 0 ||
                                    item.rejection_reason) && (
                                    <div className='mt-0.5 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-600'>
                                      Rejected: {item.rejected_qty}{' '}
                                      {item.rejection_reason
                                        ? `(${item.rejection_reason})`
                                        : ''}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className='text-[11px] text-muted-foreground'>
                                {item.source_location?.name ||
                                item.source_location?.code ||
                                item.destination_location?.name ||
                                item.destination_location?.code ? (
                                  <div className='flex flex-col gap-0.5 font-mono text-[10px]'>
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
                                ) : (
                                  <span className='text-[10px] text-muted-foreground/60'>
                                    Default
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    CONDITION_COLORS[item.condition] ??
                                    'secondary'
                                  }
                                  className='h-4 px-1.5 py-0 text-[10px] capitalize'
                                >
                                  {t(
                                    `stockTransfers.conditions.${item.condition}`,
                                    item.condition
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className='text-end font-semibold'>
                                {item.qty}
                              </TableCell>
                              {isReceivedOrDone && (
                                <TableCell className='text-end font-semibold text-emerald-600'>
                                  {item.received_qty}
                                </TableCell>
                              )}
                              <TableCell className='text-end font-mono text-muted-foreground'>
                                ${Number(item.unit_cost || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className='text-end font-mono font-medium'>
                                ${lineTotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {totalCost > 0 && (
                  <div className='flex justify-end rounded-md bg-muted/30 p-2.5 text-xs font-bold text-foreground'>
                    <span>
                      {t(
                        'stockTransfers.viewDialog.totalEstimatedValue',
                        'Total Estimated Value:'
                      )}{' '}
                      ${totalCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value='shipments' className='m-0 space-y-4'>
                {/* Shipment Batches */}
                <div className='space-y-2'>
                  <h4 className='flex items-center justify-between text-xs font-bold text-foreground'>
                    <span>Shipment Dispatches ({shipments.length})</span>
                  </h4>
                  {shipments.length === 0 ? (
                    <p className='rounded-md border p-3 text-center text-xs text-muted-foreground'>
                      No shipment dispatches logged yet.
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {shipments.map((shipment) => (
                        <div
                          key={shipment.id}
                          className='space-y-1.5 rounded-md border bg-muted/10 p-3 text-xs'
                        >
                          <div className='flex items-center justify-between font-semibold'>
                            <span className='font-mono text-primary'>
                              {shipment.shipment_number ||
                                `SH-${shipment.id.slice(0, 8)}`}
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              {new Date(shipment.shipped_at).toLocaleString()}
                            </span>
                          </div>
                          {shipment.notes && (
                            <p className='text-[11px] text-muted-foreground'>
                              Notes: {shipment.notes}
                            </p>
                          )}
                          {shipment.stock_transfer_shipment_items &&
                            shipment.stock_transfer_shipment_items.length >
                              0 && (
                              <div className='flex flex-wrap gap-2 border-t pt-1 text-[11px] text-muted-foreground'>
                                {shipment.stock_transfer_shipment_items.map(
                                  (it) => (
                                    <span
                                      key={it.id}
                                      className='rounded bg-muted/40 px-1.5 py-0.5 font-mono'
                                    >
                                      Qty: {it.shipped_qty} ({it.condition})
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Receipt Batches */}
                <div className='space-y-2'>
                  <h4 className='flex items-center justify-between text-xs font-bold text-foreground'>
                    <span>Destination Receipts ({receipts.length})</span>
                  </h4>
                  {receipts.length === 0 ? (
                    <p className='rounded-md border p-3 text-center text-xs text-muted-foreground'>
                      No arrival receipts logged yet.
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className='space-y-1.5 rounded-md border bg-muted/10 p-3 text-xs'
                        >
                          <div className='flex items-center justify-between font-semibold'>
                            <span className='font-mono text-emerald-600 dark:text-emerald-400'>
                              {receipt.receipt_number ||
                                `RC-${receipt.id.slice(0, 8)}`}
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              {new Date(receipt.received_at).toLocaleString()}
                            </span>
                          </div>
                          {receipt.notes && (
                            <p className='text-[11px] text-muted-foreground'>
                              Notes: {receipt.notes}
                            </p>
                          )}
                          {receipt.stock_transfer_receipt_items &&
                            receipt.stock_transfer_receipt_items.length > 0 && (
                              <div className='flex flex-wrap gap-2 border-t pt-1 text-[11px]'>
                                {receipt.stock_transfer_receipt_items.map(
                                  (it) => (
                                    <span
                                      key={it.id}
                                      className='rounded bg-muted/40 px-1.5 py-0.5 font-mono text-foreground'
                                    >
                                      Rec: {it.received_qty}{' '}
                                      {Number(it.rejected_qty || 0) > 0 && (
                                        <span className='text-rose-600'>
                                          (Rej: {it.rejected_qty})
                                        </span>
                                      )}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='ledger' className='m-0'>
                {detail ? (
                  <TransferMovementHistory
                    transfer={detail as TransferDetail}
                  />
                ) : (
                  <div className='p-6 text-center text-xs text-muted-foreground'>
                    {t(
                      'stockTransfers.viewDialog.loadingLedger',
                      'Loading movement ledger...'
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {transfer.notes && (
              <div className='space-y-1 rounded-md bg-muted/40 p-3 text-xs'>
                <span className='font-semibold text-foreground'>
                  {t('stockTransfers.viewDialog.notes', 'Notes:')}
                </span>
                <p className='text-muted-foreground'>{transfer.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className='shrink-0 flex-row items-center justify-between gap-2 border-t bg-muted/10 p-4 sm:justify-between'>
          <div className='flex items-center gap-2'>
            <TransferWorkflowActions
              transferId={transfer.id}
              status={transfer.status}
              referenceNo={transfer.reference_no}
              onSuccess={() => onOpenChange(false)}
            />
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                onOpenChange(false)
                navigate({
                  to: '/stock-transfers/$transferId',
                  params: { transferId: transfer.id },
                })
              }}
              className='gap-1.5'
            >
              <ExternalLink className='h-3.5 w-3.5' />
              {t('stockTransfers.viewDialog.fullPage', 'Full Page')}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              {t('stockTransfers.viewDialog.close', 'Close')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
