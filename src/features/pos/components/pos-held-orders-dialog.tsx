import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Play, Trash2, PauseCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { usePosStore, type HeldOrder } from '../store/use-pos-store'
import {
  useHeldOrdersQuery,
  useHoldOrderMutation,
  useResumeHeldOrderMutation,
  useCancelHeldOrderMutation,
} from '../hooks/use-pos-queries'

interface PosHeldOrdersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'hold' | 'view'
}

export function PosHeldOrdersDialog({
  open,
  onOpenChange,
  mode = 'view',
}: PosHeldOrdersDialogProps) {
  const { t } = useTranslation()
  const {
    items,
    terminal,
    session,
    customer,
    holdCart,
    resumeHeldCart,
    discardHeldCart,
    heldOrders: localHeldOrders,
    getTotalAmount,
    getSubtotal,
    getTaxAmount,
    getTotalDiscountAmount,
  } = usePosStore()

  const [reference, setReference] = useState('')
  const [activeTab, setActiveTab] = useState<'view' | 'hold'>(mode)

  const holdMutation = useHoldOrderMutation()
  const resumeMutation = useResumeHeldOrderMutation()
  const cancelMutation = useCancelHeldOrderMutation()

  const { data: serverHeldOrders } = useHeldOrdersQuery({
    sessionId: session?.id,
    terminalId: terminal?.id,
  })

  // Merge server and local held orders (prefer server or deduplicate by id/reference)
  const allHeldOrders = localHeldOrders

  const handleHoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error(t('pos.heldOrders.emptyCartError', 'Cannot hold an empty cart'))
      return
    }

    const ref = reference.trim() || `Order #${Date.now().toString().slice(-4)}`

    // First save in local store
    const held = holdCart(ref)

    // Also sync to server if terminal & session are available
    if (terminal?.id && session?.id && held) {
      try {
        await holdMutation.mutateAsync({
          terminalId: terminal.id,
          sessionId: session.id,
          customerId: customer?.id ?? null,
          holdReference: ref,
          cartData: { items: held.items, cartDiscount: held.cartDiscount },
          subtotal: getSubtotal(),
          taxAmount: getTaxAmount(),
          discountAmount: getTotalDiscountAmount(),
          totalAmount: getTotalAmount(),
        })
      } catch {
        // Local hold is still safe even if server sync had issues
      }
    }

    toast.success(
      t('pos.heldOrders.cartHeldToast', 'Cart held with reference "{{ref}}"', {
        ref,
      })
    )
    setReference('')
    onOpenChange(false)
  }

  const handleResume = async (order: HeldOrder) => {
    if (items.length > 0) {
      if (
        !window.confirm(
          t(
            'pos.heldOrders.resumeConfirm',
            'Your active cart has items. Resuming will replace the active cart. Continue?'
          )
        )
      ) {
        return
      }
    }

    const ok = resumeHeldCart(order.id)
    if (ok) {
      toast.success(
        t('pos.heldOrders.resumedCart', 'Resumed cart "{{ref}}"', {
          ref: order.reference,
        })
      )
      onOpenChange(false)
    }
  }

  const handleDiscard = (orderId: string) => {
    discardHeldCart(orderId)
    toast.info(t('pos.heldOrders.discardedToast', 'Held order discarded'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <PauseCircle className='h-5 w-5 text-amber-500' />
            <DialogTitle>
              {t('pos.heldOrders.title', 'Suspended & Held Orders')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t(
              'pos.heldOrders.desc',
              'Temporarily park active carts to serve another customer and resume anytime.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex gap-2 border-b pb-3'>
          <Button
            type='button'
            variant={activeTab === 'view' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setActiveTab('view')}
            className='gap-1.5'
          >
            <Clock className='h-4 w-4' />
            {t('pos.heldOrders.heldCartsTab', 'Held Orders ({{count}})', {
              count: allHeldOrders.length,
            })}
          </Button>
          <Button
            type='button'
            variant={activeTab === 'hold' ? 'default' : 'outline'}
            size='sm'
            disabled={items.length === 0}
            onClick={() => setActiveTab('hold')}
            className='gap-1.5'
          >
            <Plus className='h-4 w-4' />
            {t('pos.heldOrders.holdActiveTab', 'Hold Active Cart ({{count}} items)', {
              count: items.length,
            })}
          </Button>
        </div>

        {activeTab === 'hold' ? (
          <form onSubmit={handleHoldSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='holdRef'>
                {t('pos.heldOrders.referenceLabel', 'Reference Label *')}
              </Label>
              <Input
                id='holdRef'
                placeholder={t(
                  'pos.heldOrders.referencePlaceholder',
                  'e.g., Table 5, John Doe, Blue Shirt'
                )}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoFocus
              />
              <p className='text-xs text-muted-foreground'>
                {t(
                  'pos.heldOrders.referenceHelp',
                  'A tag or name to easily identify this cart when resuming.'
                )}
              </p>
            </div>

            <div className='rounded-md border bg-muted/40 p-3 text-xs space-y-1'>
              <div className='flex justify-between'>
                <span>{t('pos.heldOrders.itemsInCart', 'Items in cart:')}</span>
                <span className='font-semibold'>{items.length}</span>
              </div>
              <div className='flex justify-between font-bold text-sm'>
                <span>{t('pos.heldOrders.cartTotal', 'Cart Total:')}</span>
                <span className='text-primary'>{formatCurrency(getTotalAmount())}</span>
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('pos.heldOrders.cancel', 'Cancel')}
              </Button>
              <Button
                type='submit'
                className='bg-amber-600 hover:bg-amber-700 text-white'
              >
                {t('pos.heldOrders.holdCartBtn', 'Hold Order (F4)')}
              </Button>
            </div>
          </form>
        ) : (
          <div className='py-2'>
            {allHeldOrders.length === 0 ? (
              <div className='py-12 text-center text-muted-foreground'>
                <PauseCircle className='mx-auto h-10 w-10 opacity-30 mb-2' />
                <p className='text-sm font-medium'>
                  {t('pos.heldOrders.noHeldCarts', 'No held orders')}
                </p>
                <p className='text-xs mt-1'>
                  {t(
                    'pos.heldOrders.noHeldCartsDesc',
                    "Use 'Hold Cart' to park an active transaction."
                  )}
                </p>
              </div>
            ) : (
              <ScrollArea className='h-72 pr-2'>
                <div className='space-y-2.5'>
                  {allHeldOrders.map((order) => (
                    <div
                      key={order.id}
                      className='flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm hover:border-primary/50 transition-colors'
                    >
                      <div className='space-y-1 min-w-0 flex-1 pr-3'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-sm truncate'>
                            {order.reference}
                          </span>
                          {order.customerName && (
                            <Badge variant='outline' className='text-[10px]'>
                              {order.customerName}
                            </Badge>
                          )}
                        </div>
                        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                          <span>
                            {t('pos.heldOrders.itemsCount', '{{count}} items', {
                              count: order.items.length,
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className='font-semibold text-foreground'>
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          onClick={() => handleResume(order)}
                        >
                          <Play className='h-3.5 w-3.5' />
                          {t('pos.heldOrders.resume', 'Resume')}
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 text-muted-foreground hover:text-rose-500'
                          onClick={() => handleDiscard(order.id)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
