import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import { cn } from '@/lib/utils'
import { useOrder, useOrderAction } from '../hooks/use-sales-orders'
import { customerName, type OrderAction, type OrderListItem, type OrderStatus } from '../data/schema'
import { OrderStatusBadge } from './columns'

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
                className={cn(
                  'h-px w-4',
                  reached ? 'bg-primary' : 'bg-border'
                )}
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
                  'text-[10px] capitalize leading-none',
                  current
                    ? 'font-semibold text-primary'
                    : reached
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                {step}
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

const STATUS_ACTIONS: Partial<Record<OrderStatus, ActionButton[]>> = {
  draft: [
    {
      action: 'confirm',
      label: 'Confirm',
      confirm: {
        title: 'Confirm this order?',
        desc: 'Stock will be reserved for every line item.',
      },
    },
    {
      action: 'cancel',
      label: 'Cancel',
      variant: 'outline',
      confirm: {
        title: 'Cancel this order?',
        desc: 'The order will be marked cancelled.',
        destructive: true,
      },
    },
  ],
  confirmed: [
    { action: 'picking', label: 'Start picking' },
    {
      action: 'fulfill',
      label: 'Fulfill all',
      confirm: {
        title: 'Fulfill this order?',
        desc: 'Remaining reserved stock will physically leave the store.',
      },
    },
    {
      action: 'cancel',
      label: 'Cancel',
      variant: 'outline',
      confirm: {
        title: 'Cancel this order?',
        desc: 'Active reservations will be released back to stock.',
        destructive: true,
      },
    },
  ],
  picking: [
    { action: 'packed', label: 'Mark packed' },
    {
      action: 'fulfill',
      label: 'Fulfill all',
      confirm: {
        title: 'Fulfill this order?',
        desc: 'Remaining reserved stock will physically leave the store.',
      },
    },
    {
      action: 'cancel',
      label: 'Cancel',
      variant: 'outline',
      confirm: {
        title: 'Cancel this order?',
        desc: 'Active reservations will be released back to stock.',
        destructive: true,
      },
    },
  ],
  packed: [
    {
      action: 'fulfill',
      label: 'Fulfill all',
      confirm: {
        title: 'Fulfill this order?',
        desc: 'Remaining reserved stock will physically leave the store.',
      },
    },
    {
      action: 'cancel',
      label: 'Cancel',
      variant: 'outline',
      confirm: {
        title: 'Cancel this order?',
        desc: 'Active reservations will be released back to stock.',
        destructive: true,
      },
    },
  ],
  delivered: [{ action: 'invoice', label: 'Create invoice' }],
  invoiced: [{ action: 'complete', label: 'Mark completed' }],
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
  const { data: detail, isLoading } = useOrder(open ? order.id : undefined)
  const orderAction = useOrderAction()
  const [pendingConfirm, setPendingConfirm] = useState<ActionButton | null>(
    null
  )

  const current = detail ?? order
  const actions = STATUS_ACTIONS[current.status] ?? []

  const runAction = async (action: OrderAction) => {
    try {
      await orderAction.mutateAsync({ id: order.id, action })
      setPendingConfirm(null)
    } catch {
      setPendingConfirm(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {order.order_number}
              {current.status === 'cancelled' ? (
                <Badge variant='destructive' className='capitalize'>
                  cancelled
                </Badge>
              ) : (
                <OrderStatusBadge status={current.status} />
              )}
            </DialogTitle>
            <DialogDescription>
              {current.stores?.name ?? '—'} · {customerName(current.customers)}
            </DialogDescription>
          </DialogHeader>

          {current.status !== 'cancelled' ? (
            <StatusStepper status={current.status} />
          ) : null}

          <div className='grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3'>
            <div>
              <span className='text-muted-foreground'>Ordered: </span>
              {new Date(current.order_date).toLocaleDateString()}
            </div>
            <div>
              <span className='text-muted-foreground'>Expected: </span>
              {current.expected_date
                ? new Date(current.expected_date).toLocaleDateString()
                : '—'}
            </div>
            <div>
              <span className='text-muted-foreground'>Subtotal: </span>
              <span className='tabular-nums'>{current.subtotal.toFixed(2)}</span>
            </div>
            <div>
              <span className='text-muted-foreground'>Discount: </span>
              <span className='tabular-nums'>
                {current.discount_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground'>Tax: </span>
              <span className='tabular-nums'>
                {current.tax_amount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className='text-muted-foreground'>Total: </span>
              <span className='font-medium tabular-nums'>
                {current.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading items...</p>
          ) : (
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className='text-end'>Ordered</TableHead>
                    <TableHead className='text-end'>Reserved</TableHead>
                    <TableHead className='text-end'>Fulfilled</TableHead>
                    <TableHead className='text-end'>Unit price</TableHead>
                    <TableHead className='text-end'>Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail?.sales_order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product_variants?.sku ?? item.product_variant_id}
                      </TableCell>
                      <TableCell>
                        {item.product_variants?.products?.name ?? '—'}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {item.qty_ordered}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {item.qty_reserved}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {item.qty_fulfilled}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {item.unit_price.toFixed(2)}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {item.line_total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {current.notes ? (
            <p className='text-sm text-muted-foreground'>{current.notes}</p>
          ) : null}

          <DialogFooter>
            {actions.length > 0 ? (
              <Can permission='sales.manage'>
                {actions.map((button) => (
                  <Button
                    key={button.action}
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
              </Can>
            ) : (
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Close
              </Button>
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
