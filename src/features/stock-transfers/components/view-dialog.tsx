import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { ArrowRight, ExternalLink, Building2, Store, Warehouse } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { TransferListItem, StockCondition } from '../data/schema'
import { useTransfer } from '../hooks/use-stock-transfers'
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

  const isReceivedOrDone = ['received', 'completed'].includes(transfer.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {t('stockTransfers.viewDialog.transfer', 'Transfer:')}{' '}
              {transfer.reference_no || `TR-${transfer.id.slice(0, 8)}`}
            </DialogTitle>
            <StatusBadge status={transfer.status} size="sm" />
          </div>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-muted-foreground">
                {t('stockTransfers.viewDialog.from', 'From:')}
              </span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                {from.type && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {from.type}
                  </Badge>
                )}
                {from.name}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t('stockTransfers.viewDialog.to', 'To:')}
              </span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                {to.type && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {to.type}
                  </Badge>
                )}
                {to.name}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Visual Workflow Stepper */}
        <div className="my-2 px-3 py-3 rounded-xl border bg-muted/20">
          <TransferTimeline
            status={transfer.status}
            createdAt={transfer.created_at}
            approvedAt={transfer.approved_at}
            shippedAt={transfer.shipped_at}
            receivedAt={transfer.received_at}
            updatedAt={transfer.updated_at}
          />
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>
              {t('stockTransfers.viewDialog.itemsTitle', 'Transfer Items')} ({items.length})
            </span>
            <div className="flex items-center gap-3">
              <span>
                {t('stockTransfers.viewDialog.totalQty', 'Total Qty:')} {totalQuantity}
              </span>
              {isReceivedOrDone && (
                <span className="text-emerald-600 font-bold">
                  {t('stockTransfers.viewDialog.received', 'Received:')} {totalReceived}
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('stockTransfers.viewDialog.loading', 'Loading transfer items...')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">
                      {t('stockTransfers.viewDialog.columns.productVariant', 'Product / Variant')}
                    </TableHead>
                    <TableHead className="text-xs">
                      {t('stockTransfers.viewDialog.columns.condition', 'Condition')}
                    </TableHead>
                    <TableHead className="text-xs text-end">
                      {t('stockTransfers.viewDialog.columns.transferQty', 'Transfer Qty')}
                    </TableHead>
                    {isReceivedOrDone && (
                      <TableHead className="text-xs text-end">
                        {t('stockTransfers.viewDialog.columns.received', 'Received')}
                      </TableHead>
                    )}
                    <TableHead className="text-xs text-end">
                      {t('stockTransfers.viewDialog.columns.unitCost', 'Unit Cost')}
                    </TableHead>
                    <TableHead className="text-xs text-end">
                      {t('stockTransfers.viewDialog.columns.subtotal', 'Subtotal')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const lineTotal =
                      Number(item.qty || 0) * Number(item.unit_cost || 0)
                    const sku = item.product_variants?.sku ?? item.product_variant_id
                    const productName = item.product_variants?.products?.name

                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {sku}
                            </span>
                            {productName && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {productName}
                              </span>
                            )}
                            {(item.batch_id || item.serial_id) && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.batch_id
                                  ? `${t('stockTransfers.viewDialog.batch', 'Batch:')} ${item.batch_id} `
                                  : ''}
                                {item.serial_id
                                  ? `${t('stockTransfers.viewDialog.sn', 'SN:')} ${item.serial_id}`
                                  : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={CONDITION_COLORS[item.condition] ?? 'secondary'}
                            className="text-[10px] capitalize px-1.5 py-0 h-4"
                          >
                            {t(`stockTransfers.conditions.${item.condition}`, item.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-semibold">
                          {item.qty}
                        </TableCell>
                        {isReceivedOrDone && (
                          <TableCell className="text-end font-semibold text-emerald-600">
                            {item.received_qty}
                          </TableCell>
                        )}
                        <TableCell className="text-end text-muted-foreground">
                          ${Number(item.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-end font-medium">
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
            <div className="flex justify-end p-2.5 text-xs font-bold text-foreground bg-muted/30 rounded-md">
              <span>
                {t('stockTransfers.viewDialog.totalEstimatedValue', 'Total Estimated Value:')} ${totalCost.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {transfer.notes && (
          <div className="p-3 rounded-md bg-muted/40 text-xs space-y-1">
            <span className="font-semibold text-foreground">
              {t('stockTransfers.viewDialog.notes', 'Notes:')}
            </span>
            <p className="text-muted-foreground">{transfer.notes}</p>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 pt-3 border-t">
          <div className="flex items-center gap-2">
            <TransferWorkflowActions
              transferId={transfer.id}
              status={transfer.status}
              referenceNo={transfer.reference_no}
              onSuccess={() => onOpenChange(false)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate({
                  to: '/stock-transfers/$transferId',
                  params: { transferId: transfer.id },
                })
              }}
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('stockTransfers.viewDialog.fullPage', 'Full Page')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
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
