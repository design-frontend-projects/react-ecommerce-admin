import * as React from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  History,
  Info,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import type {
  InventoryMovementRecord,
  TransferDetail,
  TransferItemRow,
} from '../data/schema'

export interface TransferMovementHistoryProps {
  transfer: TransferDetail
  className?: string
}

export function TransferMovementHistory({
  transfer,
  className,
}: TransferMovementHistoryProps) {
  const { t } = useTranslation()

  const items = (transfer.stock_transfer_items || []) as TransferItemRow[]
  const movements = (transfer.inventory_movements ||
    []) as InventoryMovementRecord[]

  // Discrepancy calculation
  const discrepancyItems = React.useMemo(() => {
    return items.map((item) => {
      const sent = Number(item.qty || 0)
      const received = Number(item.received_qty || 0)
      const variance = received - sent
      const cost = Number(item.unit_cost || 0)
      const costImpact = variance * cost

      return {
        item,
        sent,
        received,
        variance,
        costImpact,
        hasDiscrepancy:
          variance !== 0 && ['received', 'completed'].includes(transfer.status),
      }
    })
  }, [items, transfer.status])

  const totalDiscrepancyQty = discrepancyItems.reduce(
    (acc, d) => acc + d.variance,
    0
  )
  const totalDiscrepancyCost = discrepancyItems.reduce(
    (acc, d) => acc + d.costImpact,
    0
  )

  const isShippedOrDone = ['in_transit', 'received', 'completed'].includes(
    transfer.status
  )

  return (
    <div className={className}>
      <Tabs defaultValue='movements' className='w-full'>
        <TabsList className='grid h-9 w-full grid-cols-3'>
          <TabsTrigger value='movements' className='gap-1.5 text-xs'>
            <History className='h-3.5 w-3.5' />
            {t('stockTransfers.history.ledger', 'Movements Ledger')} (
            {movements.length})
          </TabsTrigger>
          <TabsTrigger value='discrepancy' className='gap-1.5 text-xs'>
            <Scale className='h-3.5 w-3.5' />
            {t(
              'stockTransfers.history.reconciliation',
              'Fulfillment & Variance'
            )}
          </TabsTrigger>
          <TabsTrigger value='audit' className='gap-1.5 text-xs'>
            <ShieldCheck className='h-3.5 w-3.5' />
            {t('stockTransfers.history.audit', 'Lifecycle Audit')}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MOVEMENTS LEDGER */}
        <TabsContent value='movements' className='space-y-3 pt-3'>
          {movements.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border bg-muted/10 p-6 text-center text-muted-foreground'>
              <Info className='mb-2 h-8 w-8 text-muted-foreground/60' />
              <p className='text-xs font-semibold text-foreground'>
                {isShippedOrDone
                  ? t('stockTransfers.history.noLedgerEntries', 'No automated inventory ledger entries recorded yet.')
                  : t('stockTransfers.history.immutableRecordsDesc', 'Immutable ledger records are posted when the transfer is shipped (transfer_out) and received (transfer_in).')}
              </p>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                {t('stockTransfers.history.status', { status: transfer.status.toUpperCase(), defaultValue: `Status: ${transfer.status.toUpperCase()}` })}
              </p>
            </div>
          ) : (
            <div className='overflow-hidden rounded-md border text-xs'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-[11px]'>{t('stockTransfers.history.timestamp', 'Timestamp')}</TableHead>
                    <TableHead className='text-[11px]'>{t('stockTransfers.history.movementType', 'Movement Type')}</TableHead>
                    <TableHead className='text-[11px]'>{t('stockTransfers.history.skuOrItem', 'SKU / Item')}</TableHead>
                    <TableHead className='text-[11px]'>{t('stockTransfers.history.warehouse', 'Warehouse')}</TableHead>
                    <TableHead className='text-end text-[11px]'>
                      {t('stockTransfers.history.delta', 'Delta')}
                    </TableHead>
                    <TableHead className='text-end text-[11px]'>
                      {t('stockTransfers.history.beforeAfter', 'Before → After')}
                    </TableHead>
                    <TableHead className='text-end text-[11px]'>
                      {t('stockTransfers.history.unitCost', 'Unit Cost')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => {
                    const delta = Number(m.quantity_delta || 0)
                    const isOut = delta < 0
                    const typeLabel = m.movement_type
                      .replace('_', ' ')
                      .toUpperCase()

                    return (
                      <TableRow key={m.id}>
                        <TableCell className='font-mono text-[11px] whitespace-nowrap text-muted-foreground'>
                          {m.movement_date || m.occurred_at || m.created_at
                            ? new Date(
                                (m.movement_date ||
                                  m.occurred_at ||
                                  m.created_at) as string
                              ).toLocaleString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isOut ? 'secondary' : 'default'}
                            className={
                              isOut
                                ? 'gap-1 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                : 'gap-1 bg-emerald-600'
                            }
                          >
                            {isOut ? (
                              <ArrowUpRight className='h-3 w-3' />
                            ) : (
                              <ArrowDownRight className='h-3 w-3' />
                            )}
                            {m.movement_type === 'transfer_out'
                              ? t('stockTransfers.movementTypes.transfer_out', 'TRANSFER OUT')
                              : m.movement_type === 'transfer_in'
                                ? t('stockTransfers.movementTypes.transfer_in', 'TRANSFER IN')
                                : typeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='font-mono font-bold text-foreground'>
                              {m.product_variants?.sku || m.product_variant_id}
                            </span>
                            {m.product_variants?.products?.name && (
                              <span className='max-w-[140px] truncate text-[10px] text-muted-foreground'>
                                {m.product_variants.products.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-muted-foreground'>
                            {m.warehouses?.name || 'Warehouse'}
                          </span>
                        </TableCell>
                        <TableCell className='text-end font-mono font-bold'>
                          <span
                            className={
                              isOut ? 'text-blue-600' : 'text-emerald-600'
                            }
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </TableCell>
                        <TableCell className='text-end font-mono text-[11px] text-muted-foreground'>
                          {m.qty_before != null && m.qty_after != null ? (
                            <span>
                              {m.qty_before} →{' '}
                              <strong className='text-foreground'>
                                {m.qty_after}
                              </strong>
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className='text-end font-mono text-muted-foreground'>
                          ${Number(m.unit_cost || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: DISCREPANCY & FULFILLMENT */}
        <TabsContent value='discrepancy' className='space-y-3 pt-3'>
          <div className='overflow-hidden rounded-md border text-xs'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40'>
                  <TableHead className='text-[11px]'>{t('stockTransfers.history.productOrSku', 'Product / SKU')}</TableHead>
                  <TableHead className='text-end text-[11px]'>
                    {t('stockTransfers.history.sentQty', 'Sent Qty')}
                  </TableHead>
                  <TableHead className='text-end text-[11px]'>
                    {t('stockTransfers.history.receivedQty', 'Received Qty')}
                  </TableHead>
                  <TableHead className='text-end text-[11px]'>
                    {t('stockTransfers.history.variance', 'Variance')}
                  </TableHead>
                  <TableHead className='text-end text-[11px]'>
                    {t('stockTransfers.history.unitCost', 'Unit Cost')}
                  </TableHead>
                  <TableHead className='text-end text-[11px]'>
                    {t('stockTransfers.history.costVariance', 'Cost Variance')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancyItems.map(
                  ({ item, sent, received, variance, costImpact }) => {
                    const sku =
                      item.product_variants?.sku ?? item.product_variant_id
                    const name = item.product_variants?.products?.name

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span className='font-bold text-foreground'>
                              {sku}
                            </span>
                            {name && (
                              <span className='truncate text-[10px] text-muted-foreground'>
                                {name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-end font-semibold'>
                          {sent}
                        </TableCell>
                        <TableCell className='text-end font-semibold text-emerald-600'>
                          {received}
                        </TableCell>
                        <TableCell className='text-end font-mono font-bold'>
                          {variance === 0 ? (
                            <span className='inline-flex items-center gap-1 text-emerald-600'>
                              <CheckCircle2 className='h-3 w-3' /> 0
                            </span>
                          ) : variance < 0 ? (
                            <span className='inline-flex items-center gap-1 text-rose-600'>
                              <AlertTriangle className='h-3 w-3' /> {variance}
                            </span>
                          ) : (
                            <span className='text-blue-600'>+{variance}</span>
                          )}
                        </TableCell>
                        <TableCell className='text-end text-muted-foreground'>
                          ${Number(item.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className='text-end font-mono'>
                          {costImpact === 0 ? (
                            '$0.00'
                          ) : (
                            <span
                              className={
                                costImpact < 0
                                  ? 'font-bold text-destructive'
                                  : 'text-blue-600'
                              }
                            >
                              {costImpact < 0
                                ? `-$${Math.abs(costImpact).toFixed(2)}`
                                : `+$${costImpact.toFixed(2)}`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  }
                )}
              </TableBody>
            </Table>
          </div>

          {/* Variance Summary Footer */}
          {totalDiscrepancyQty !== 0 && (
            <div className='flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs'>
              <div className='flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300'>
                <AlertTriangle className='h-4 w-4' />
                <span>
                  {t('stockTransfers.history.netTransferVariance', { count: totalDiscrepancyQty, defaultValue: `Net Transfer Variance: ${totalDiscrepancyQty} units` })}
                </span>
              </div>
              <span className='font-bold text-rose-700 dark:text-rose-300'>
                {t('stockTransfers.history.financialImpact', 'Financial Impact:')}{' '}
                {totalDiscrepancyCost < 0
                  ? `-$${Math.abs(totalDiscrepancyCost).toFixed(2)}`
                  : `$${totalDiscrepancyCost.toFixed(2)}`}
              </span>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: LIFECYCLE AUDIT */}
        <TabsContent value='audit' className='space-y-3 pt-3'>
          <div className='space-y-3 rounded-lg border bg-muted/20 p-4 text-xs'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <span className='font-medium text-muted-foreground'>
                  {t('stockTransfers.history.creation', 'Creation:')}
                </span>
                <p className='font-semibold text-foreground'>
                  {new Date(transfer.created_at).toLocaleString()}
                </p>
                {transfer.created_by && (
                  <p className='text-[11px] text-muted-foreground'>
                    {t('stockTransfers.history.byUser', { user: transfer.created_by, defaultValue: `By User: ${transfer.created_by}` })}
                  </p>
                )}
              </div>

              {transfer.approved_at && (
                <div className='space-y-1'>
                  <span className='font-medium text-muted-foreground'>
                    {t('stockTransfers.history.approval', 'Approval:')}
                  </span>
                  <p className='font-semibold text-foreground'>
                    {new Date(transfer.approved_at).toLocaleString()}
                  </p>
                  {transfer.approved_by && (
                    <p className='text-[11px] text-muted-foreground'>
                      {t('stockTransfers.history.approvedBy', { user: transfer.approved_by, defaultValue: `Approved by: ${transfer.approved_by}` })}
                    </p>
                  )}
                </div>
              )}

              {transfer.shipped_at && (
                <div className='space-y-1'>
                  <span className='font-medium text-muted-foreground'>
                    {t('stockTransfers.history.shippedInTransit', 'Shipped (In Transit):')}
                  </span>
                  <p className='font-semibold text-foreground'>
                    {new Date(transfer.shipped_at).toLocaleString()}
                  </p>
                  {transfer.shipped_by && (
                    <p className='text-[11px] text-muted-foreground'>
                      {t('stockTransfers.history.dispatchedBy', { user: transfer.shipped_by, defaultValue: `Dispatched by: ${transfer.shipped_by}` })}
                    </p>
                  )}
                </div>
              )}

              {transfer.received_at && (
                <div className='space-y-1'>
                  <span className='font-medium text-muted-foreground'>
                    {t('stockTransfers.history.receivedAtDestination', 'Received at Destination:')}
                  </span>
                  <p className='font-semibold text-foreground'>
                    {new Date(transfer.received_at).toLocaleString()}
                  </p>
                  {transfer.received_by && (
                    <p className='text-[11px] text-muted-foreground'>
                      {t('stockTransfers.history.receivedBy', { user: transfer.received_by, defaultValue: `Received by: ${transfer.received_by}` })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {transfer.notes && (
              <div className='mt-2 border-t pt-3'>
                <span className='font-semibold text-foreground'>
                  {t('stockTransfers.history.transferNotes', 'Transfer Notes:')}
                </span>
                <p className='mt-0.5 text-muted-foreground'>{transfer.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
