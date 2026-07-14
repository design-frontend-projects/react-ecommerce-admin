import { AlertCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface SubscriptionRenewalModalProps {
  open: boolean
  onManageBilling: () => void
}

export function SubscriptionRenewalModal({
  open,
  onManageBilling,
}: SubscriptionRenewalModalProps) {
  // Prevents closing by clicking outside or pressing Escape
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) return // Prevent closing
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-[500px]'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className='mb-2 flex items-center gap-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10'>
              <AlertCircle className='h-5 w-5 text-destructive' />
            </div>
            <DialogTitle className='text-2xl font-bold text-destructive'>
              Subscription Expired
            </DialogTitle>
          </div>
          <DialogDescription className='text-base'>
            Your Bluewave POS subscription has expired or payment failed. To
            restore access to your workspace, please update your billing details
            or renew your subscription.
          </DialogDescription>
        </DialogHeader>

        <div className='mt-4 rounded-md border bg-muted/30 p-4'>
          <h4 className='mb-2 text-sm font-medium'>What you lose access to:</h4>
          <ul className='list-disc space-y-1 pl-5 text-sm text-muted-foreground'>
            <li>Creating new orders and processing payments</li>
            <li>Managing inventory and shifts</li>
            <li>Accessing analytics and reporting</li>
          </ul>
        </div>

        <DialogFooter className='mt-6'>
          <Button onClick={onManageBilling} className='w-full sm:w-auto'>
            <CreditCard className='mr-2 h-4 w-4' />
            Manage Billing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
