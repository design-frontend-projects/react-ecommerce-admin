import { useState } from 'react'
import { AlertCircle, Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ResOrder } from '../../types'
import { useRefundOrder } from '../../api/mutations'
import { formatCurrency } from '../../lib/formatters'

export function RefundDialog({ order }: { order: ResOrder }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const refundOrder = useRefundOrder()

  const handleRefund = async () => {
    if (!reason.trim()) {
      toast.error('Refund reason is required')
      return
    }

    try {
      await refundOrder.mutateAsync({
        orderId: order.id,
        reason: reason.trim(),
      })
      toast.success('Order refunded successfully', {
        description: `Order ${order.order_number} has been refunded.`,
      })
      setOpen(false)
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || 'Failed to refund order')
      } else {
        toast.error('Failed to refund order')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs font-bold text-orange-600 hover:bg-orange-50 hover:text-orange-700'
        >
          <Undo2 className='mr-1.5 h-3 w-3' />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent className='overflow-hidden rounded-3xl sm:max-w-[425px]'>
        <DialogHeader>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100'>
            <AlertCircle className='h-6 w-6 text-orange-600' />
          </div>
          <DialogTitle className='text-center text-xl font-black tracking-tight'>
            Confirm Refund
          </DialogTitle>
          <DialogDescription className='text-center text-sm font-medium'>
            Are you sure you want to refund this order? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className='my-4 rounded-xl border bg-muted/30 p-4'>
          <div className='flex justify-between text-sm'>
            <span className='font-medium text-muted-foreground'>
              Order Number
            </span>
            <span className='font-mono font-bold'>{order.order_number}</span>
          </div>
          <div className='mt-2 flex justify-between text-sm'>
            <span className='font-medium text-muted-foreground'>Amount</span>
            <span className='font-black tracking-tight text-destructive'>
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='reason' className='font-semibold'>
            Refund Reason <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='reason'
            placeholder='e.g., Customer requested cancellation'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className='rounded-xl focus-visible:ring-orange-500'
          />
        </div>

        <DialogFooter className='mt-6 gap-2 sm:justify-stretch sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(false)}
            className='w-full rounded-xl font-bold'
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleRefund}
            disabled={refundOrder.isPending || !reason.trim()}
            className='w-full rounded-xl bg-orange-600 font-bold hover:bg-orange-700'
          >
            {refundOrder.isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              'Confirm Refund'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
