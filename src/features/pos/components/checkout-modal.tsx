import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCard, Banknote, Loader2, Truck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  type CheckoutRequestType,
  shipmentSchema,
  type ShipmentType,
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle className='text-center text-2xl font-bold'>
            Checkout
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col items-center gap-6 py-4'>
          <div className='text-4xl font-bold text-primary'>
            {formatCurrency(total)}
          </div>

          <div className='w-full space-y-4'>
            <div className='text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase'>
              Select Payment Method
            </div>

            <div className='grid w-full grid-cols-2 gap-4'>
              <Button
                type='button'
                variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                className='relative flex h-20 flex-col gap-2 overflow-hidden border-2 transition-all hover:border-primary'
                onClick={() => setSelectedMethod('cash')}
              >
                <Banknote className='h-6 w-6' />
                <span className='font-semibold'>Cash</span>
                {selectedMethod === 'cash' && (
                  <div className='pointer-events-none absolute inset-0 rounded bg-primary/10' />
                )}
              </Button>

              <Button
                type='button'
                variant={selectedMethod === 'card' ? 'default' : 'outline'}
                className='relative flex h-20 flex-col gap-2 overflow-hidden border-2 transition-all hover:border-primary'
                onClick={() => setSelectedMethod('card')}
              >
                <CreditCard className='h-6 w-6' />
                <span className='font-semibold'>Card</span>
                {selectedMethod === 'card' && (
                  <div className='pointer-events-none absolute inset-0 rounded bg-primary/10' />
                )}
              </Button>
            </div>
          </div>

          <div className='w-full space-y-4 border-t pt-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Truck className='h-5 w-5 text-primary' />
                <Label htmlFor='shipment-toggle' className='font-semibold'>
                  Shipment / Delivery
                </Label>
              </div>
              <Switch
                id='shipment-toggle'
                checked={isShipment}
                onCheckedChange={setIsShipment}
              />
            </div>

            {isShipment && (
              <Form {...form}>
                <form className='grid animate-in grid-cols-2 gap-4 duration-300 fade-in slide-in-from-top-2'>
                  <FormField
                    control={form.control}
                    name='recipientName'
                    render={({ field }) => (
                      <FormItem className='col-span-2'>
                        <FormLabel>Recipient Name *</FormLabel>
                        <FormControl>
                          <Input placeholder='John Doe' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='recipientPhone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder='+1234567890' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='postalCode'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder='12345' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='deliveryAddress'
                    render={({ field }) => (
                      <FormItem className='col-span-2'>
                        <FormLabel>Delivery Address *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='Street, Building, Apartment...'
                            className='min-h-[80px]'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='city'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder='New York' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='state'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                          <Input placeholder='NY' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='notes'
                    render={({ field }) => (
                      <FormItem className='col-span-2'>
                        <FormLabel>Delivery Notes</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Gate code, landmark, etc.'
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

        <DialogFooter className='w-full sm:justify-between'>
          <Button
            variant='ghost'
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            size='lg'
            className='w-full min-w-[150px] sm:w-auto'
            onClick={isShipment ? onSubmit : () => handleCheckout()}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
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
