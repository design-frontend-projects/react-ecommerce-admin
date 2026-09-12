import { useState } from 'react'
import { Printer, Warehouse, Building2, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import {
  customerName,
  type OrderAction,
  type OrderListItem,
  type OrderStatus,
} from '../data/schema'
import { useOrder, useOrderAction } from '../hooks/use-sales-orders'
import { OrderStatusBadge } from './columns'
import { useOrdersContext } from './provider'

const STEPS: OrderStatus[] = [
  'draft',
  'confirmed',
  'picking',
  'packed',
  'delivered',
  'invoiced',
  'completed',
]

function StatusStepper({ status }: { status: OrderStatus }) {
  const { t } = useTranslation()
  const currentIndex = STEPS.indexOf(status)
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex
        const current = index === currentIndex
        return (
          <div key={step} className='flex items-center gap-1'>
            {index > 0 ? (
              <div
                className={cn('h-px w-4', reached ? 'bg-primary' : 'bg-border')}
              />
            ) : null}
            <div className='flex flex-col items-center gap-1'>
              <div
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  current
                    ? 'bg-primary ring-2 ring-primary/30'
                    : reached
                      ? 'bg-primary'
                      : 'bg-border'
                )}
              />
              <span
                className={cn(
                  'text-[10px] leading-none capitalize',
                  current
                    ? 'font-semibold text-primary'
                    : reached
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {t(`salesOrders.status.${step}`, step)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ActionButton {
  action: OrderAction
  label: string
  variant?: 'default' | 'outline'
  confirm?: { title: string; desc: string; destructive?: boolean }
}

function getStatusActions(t: (key: string, fallback: string) => string): Partial<Record<OrderStatus, ActionButton[]>> {
  return {
    draft: [
      {
        action: 'confirm',
        label: t('salesOrders.actions.confirm', 'Confirm'),
        confirm: {
          title: t('salesOrders.dialogs.confirmTitle', 'Confirm this order?'),
          desc: t('salesOrders.dialogs.confirmDesc', 'Stock will be reserved for every line item.'),
        },
      },
      {
        action: 'cancel',
        label: t('salesOrders.actions.cancel', 'Cancel'),
        variant: 'outline',
        confirm: {
          title: t('salesOrders.dialogs.cancelTitle', 'Cancel this order?'),
          desc: t('salesOrders.dialogs.cancelDesc', 'The order will be marked cancelled.'),
          destructive: true,
        },
      },
    ],
    confirmed: [
      { action: 'picking', label: t('salesOrders.actions.startPicking', 'Start picking') },
      {
        action: 'fulfill',
        label: t('salesOrders.actions.fulfillAll', 'Fulfill all'),
        confirm: {
          title: t('salesOrders.dialogs.fulfillTitle', 'Fulfill this order?'),
          desc: t('salesOrders.dialogs.fulfillDesc', 'Remaining reserved stock will physically leave the store.'),
        },
      },
      {
        action: 'cancel',
        label: t('salesOrders.actions.cancel', 'Cancel'),
        variant: 'outline',
        confirm: {
          title: t('salesOrders.dialogs.cancelTitle', 'Cancel this order?'),
          desc: t('salesOrders.dialogs.cancelDesc', 'Active reservations will be released back to stock.'),
          destructive: true,
        },
      },
    ],
    picking: [
      { action: 'packed', label: t('salesOrders.actions.markPacked', 'Mark packed') },
      {
        action: 'fulfill',
        label: t('salesOrders.actions.fulfillAll', 'Fulfill all'),
        confirm: {
          title: t('salesOrders.dialogs.fulfillTitle', 'Fulfill this order?'),
          desc: t('salesOrders.dialogs.fulfillDesc', 'Remaining reserved stock will physically leave the store.'),
        },
      },
      {
        action: 'cancel',
        label: t('salesOrders.actions.cancel', 'Cancel'),
        variant: 'outline',
        confirm: {
          title: t('salesOrders.dialogs.cancelTitle', 'Cancel this order?'),
          desc: t('salesOrders.dialogs.cancelDesc', 'Active reservations will be released back to stock.'),
          destructive: true,
        },
      },
    ],
    packed: [
      {
        action: 'fulfill',
        label: t('salesOrders.actions.fulfillAll', 'Fulfill all'),
        confirm: {
          title: t('salesOrders.dialogs.fulfillTitle', 'Fulfill this order?'),
          desc: t('salesOrders.dialogs.fulfillDesc', 'Remaining reserved stock will physically leave the store.'),
        },
      },
      {
        action: 'cancel',
        label: t('salesOrders.actions.cancel', 'Cancel'),
        variant: 'outline',
        confirm: {
          title: t('salesOrders.dialogs.cancelTitle', 'Cancel this order?'),
          desc: t('salesOrders.dialogs.cancelDesc', 'Active reservations will be released back to stock.'),
          destructive: true,
        },
      },
    ],
    delivered: [{ action: 'invoice', label: t('salesOrders.actions.createInvoice', 'Create invoice') }],
    invoiced: [{ action: 'complete', label: t('salesOrders.actions.markCompleted', 'Mark completed') }],
  }
}

export function OrderViewDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useOrdersContext()
  const { data: detail, isLoading } = useOrder(open ? order.id : undefined)
  const orderAction = useOrderAction()
  const [pendingConfirm, setPendingConfirm] = useState<ActionButton | null>(
    null
  )

  const current = detail ?? order
  const actions = getStatusActions(t)[current.status] ?? []

  const runAction = async (action: OrderAction) => {
    try {
      await orderAction.mutateAsync({ id: order.id, action })
      setPendingConfirm(null)
    } catch {
      setPendingConfirm(null)
    }
  }

  const handleOpenPrint = () => {
    setCurrentRow(current)
    onOpenChange(false)
    setOpen('review')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <DialogTitle className='flex items-center gap-2'>
                  {order.order_number}
                  {current.status === 'cancelled' ? (
                    <Badge variant='destructive' className='capitalize'>
                      {t('salesOrders.status.cancelled', 'cancelled')}
                    </Badge>
                  ) : (
                    <OrderStatusBadge status={current.status} />
                  )}
                </DialogTitle>
              </div>

              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 text-xs shrink-0'
                onClick={handleOpenPrint}
              >
                <Printer className='mr-1.5 h-3.5 w-3.5 text-primary' />
                {t('salesOrders.viewDialog.reviewAndPrint', 'Review & Print')}
              </Button>
            </div>
            <DialogDescription className='flex flex-wrap items-center gap-2 text-xs'>
              <span className='flex items-center gap-1 font-medium text-foreground'>
                <Building2 className='h-3 w-3 text-muted-foreground' />
                {current.stores?.name ?? '—'}
              </span>
              <span>·</span>
              <span className='flex items-center gap-1 font-medium text-foreground'>
                <User className='h-3 w-3 text-muted-foreground' />
                {customerName(current.customers)}
              </span>
              {current.warehouses?.name && (
                <>
                  <span>·</span>
                  <span className='flex items-center gap-1 text-muted-foreground'>
                    <Warehouse className='h-3 w-3' />
                    {current.warehouses.name}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {current.status !== 'cancelled' ? (
            <StatusStepper status={current.status} />
          ) : null}

          <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 bg-muted/20 p-3.5 rounded-lg border'>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.ordered', 'Ordered:')}</span>
              <span className='font-medium'>
                {new Date(current.order_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.expected', 'Expected:')}</span>
              <span className='font-medium'>
                {current.expected_date
                  ? new Date(current.expected_date).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.subtotal', 'Subtotal:')}</span>
              <span className='tabular-nums font-mono'>
                ${current.subtotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.discount', 'Discount:')}</span>
              <span className='tabular-nums font-mono text-rose-600'>
                -${current.discount_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.tax', 'Tax:')}</span>
              <span className='tabular-nums font-mono'>
                +${current.tax_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-xs text-muted-foreground block'>{t('salesOrders.viewDialog.total', 'Total:')}</span>
              <span className='font-bold tabular-nums font-mono text-primary text-base'>
                ${current.total_amount.toFixed(2)} {current.currency || 'USD'}
              </span>
            </div>
          </div>

          {isLoading ? (
            <p className='text-sm text-muted-foreground py-4 text-center'>{t('salesOrders.viewDialog.loadingItems', 'Loading items...')}</p>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('salesOrders.itemsTable.productSku', 'Product / SKU')}</TableHead>
                    <TableHead className='w-16 text-center'>{t('salesOrders.itemsTable.uom', 'UOM')}</TableHead>
                    <TableHead className='text-end'>{t('salesOrders.itemsTable.ordered', 'Ordered')}</TableHead>
                    <TableHead className='text-end'>{t('salesOrders.itemsTable.reserved', 'Reserved')}</TableHead>
                    <TableHead className='text-end'>{t('salesOrders.itemsTable.fulfilled', 'Fulfilled')}</TableHead>
                    <TableHead className='text-end'>{t('salesOrders.itemsTable.unitPrice', 'Unit Price')}</TableHead>
                    <TableHead className='text-end'>{t('salesOrders.itemsTable.lineTotal', 'Line Total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.sales_order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className='font-medium text-sm text-foreground'>
                          {item.product_variants?.products?.name ||
                            item.product_variants?.name ||
                            '—'}
                        </div>
                        <div className='font-mono text-xs text-muted-foreground'>
                          {item.product_variants?.sku ?? item.product_variant_id}
                        </div>
                      </TableCell>
                      <TableCell className='text-center text-xs text-muted-foreground'>
                        {item.uoms?.code || item.uoms?.name || '—'}
                      </TableCell>
                      <TableCell className='text-end tabular-nums font-medium'>
                        {item.qty_ordered}
                      </TableCell>
                      <TableCell className='text-end tabular-nums text-muted-foreground'>
                        {item.qty_reserved}
                      </TableCell>
                      <TableCell className='text-end tabular-nums text-muted-foreground'>
                        {item.qty_fulfilled}
                      </TableCell>
                      <TableCell className='text-end tabular-nums font-mono'>
                        ${item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className='text-end tabular-nums font-mono font-semibold'>
                        ${item.line_total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {current.notes ? (
            <div className='p-3 rounded-md bg-muted/20 border text-xs text-muted-foreground'>
              <span className='font-semibold text-foreground mr-1'>{t('salesOrders.viewDialog.notes', 'Notes:')}</span>
              {current.notes}
            </div>
          ) : null}

          <DialogFooter className='flex-row items-center justify-between sm:justify-between w-full'>
            <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              {t('common.close', 'Close')}
            </Button>

            {actions.length > 0 && (
              <Can permission='sales.manage'>
                <div className='flex items-center gap-2'>
                  {actions.map((button) => (
                    <Button
                      key={button.action}
                      size='sm'
                      variant={button.variant ?? 'default'}
                      disabled={orderAction.isPending}
                      onClick={() => {
                        if (button.confirm) {
                          setPendingConfirm(button)
                        } else {
                          void runAction(button.action)
                        }
                      }}
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              </Can>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingConfirm?.confirm ? (
        <ConfirmDialog
          open={Boolean(pendingConfirm)}
          onOpenChange={(value) => {
            if (!value) setPendingConfirm(null)
          }}
          title={pendingConfirm.confirm.title}
          desc={pendingConfirm.confirm.desc}
          destructive={pendingConfirm.confirm.destructive}
          confirmText={pendingConfirm.label}
          isLoading={orderAction.isPending}
          handleConfirm={() => void runAction(pendingConfirm.action)}
        />
      ) : null}
    </>
  )
}
