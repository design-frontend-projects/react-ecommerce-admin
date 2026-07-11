import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePaymentMethodsContext } from './payment-methods-provider'

export function PaymentMethodsPrimaryButtons() {
  const { setOpen } = usePaymentMethodsContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Create Payment Method</span> <Plus size={18} />
      </Button>
    </div>
  )
}
