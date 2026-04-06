import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Banknote, Loader2 } from 'lucide-react'
import type { CheckoutRequestType } from '../schemas/checkout'

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onConfirm: (paymentMethod: CheckoutRequestType['paymentMethod']) => void
  isProcessing: boolean
}

export function CheckoutModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  isProcessing,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<CheckoutRequestType['paymentMethod'] | null>(null)

  const handleCheckout = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod)
    }
  }

  // Reset method when modal opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedMethod(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Checkout</DialogTitle>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-6">
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(total)}
          </div>
          <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
            Select Payment Method
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              type="button"
              variant={selectedMethod === 'cash' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2 relative overflow-hidden transition-all hover:border-primary border-2"
              onClick={() => setSelectedMethod('cash')}
            >
              <Banknote className="w-8 h-8" />
              <span className="font-semibold text-lg">Cash</span>
              {selectedMethod === 'cash' && (
                <div className="absolute inset-0 bg-primary/10 rounded pointer-events-none" />
              )}
            </Button>
            
            <Button
              type="button"
              variant={selectedMethod === 'card' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2 relative overflow-hidden transition-all hover:border-primary border-2"
              onClick={() => setSelectedMethod('card')}
            >
              <CreditCard className="w-8 h-8" />
              <span className="font-semibold text-lg">Card</span>
              {selectedMethod === 'card' && (
                <div className="absolute inset-0 bg-primary/10 rounded pointer-events-none" />
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-between w-full">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[120px]"
            onClick={handleCheckout}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
