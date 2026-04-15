import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Banknote, Loader2, Truck } from 'lucide-react'
import {
  CheckoutRequestType,
  shipmentSchema,
  ShipmentType,
} from '../schemas/checkout'

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onConfirm: (data: {
    paymentMethod: CheckoutRequestType['paymentMethod']
    shipment?: ShipmentType
  }) => void
  isProcessing: boolean
}

export function CheckoutModal({
  open,
  onOpenChange,
  total,
  onConfirm,
  isProcessing,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<
    CheckoutRequestType['paymentMethod'] | null
  >(null)
  const [isShipment, setIsShipment] = useState(false)

  const form = useForm<ShipmentType>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      recipientName: '',
      recipientPhone: '',
      deliveryAddress: '',
      city: '',
      state: '',
      postalCode: '',
      notes: '',
    },
  })

  const handleCheckout = (data?: ShipmentType) => {
    if (selectedMethod) {
      onConfirm({
        paymentMethod: selectedMethod,
        shipment: isShipment ? data : undefined,
      })
    }
  }

  const onSubmit = form.handleSubmit((data) => {
    handleCheckout(data)
  })

  // Reset method and form when modal opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedMethod(null)
      setIsShipment(false)
      form.reset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center gap-6">
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(total)}
          </div>

          <div className="w-full space-y-4">
            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-center">
              Select Payment Method
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <Button
                type="button"
                variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                className="h-20 flex flex-col gap-2 relative overflow-hidden transition-all hover:border-primary border-2"
                onClick={() => setSelectedMethod('cash')}
              >
                <Banknote className="w-6 h-6" />
                <span className="font-semibold">Cash</span>
                {selectedMethod === 'cash' && (
                  <div className="absolute inset-0 bg-primary/10 rounded pointer-events-none" />
                )}
              </Button>

              <Button
                type="button"
                variant={selectedMethod === 'card' ? 'default' : 'outline'}
                className="h-20 flex flex-col gap-2 relative overflow-hidden transition-all hover:border-primary border-2"
                onClick={() => setSelectedMethod('card')}
              >
                <CreditCard className="w-6 h-6" />
                <span className="font-semibold">Card</span>
                {selectedMethod === 'card' && (
                  <div className="absolute inset-0 bg-primary/10 rounded pointer-events-none" />
                )}
              </Button>
            </div>
          </div>

          <div className="w-full space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <Label htmlFor="shipment-toggle" className="font-semibold">
                  Shipment / Delivery
                </Label>
              </div>
              <Switch
                id="shipment-toggle"
                checked={isShipment}
                onCheckedChange={setIsShipment}
              />
            </div>

            {isShipment && (
              <Form {...form}>
                <form className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Recipient Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Delivery Address *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Street, Building, Apartment..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Delivery Notes</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Gate code, landmark, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between w-full">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[150px]"
            onClick={isShipment ? onSubmit : () => handleCheckout()}
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
