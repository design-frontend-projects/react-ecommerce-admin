import { CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomerCardsContext } from './customer-cards-provider'

export function CustomerCardsPrimaryButtons() {
  const { setOpen } = useCustomerCardsContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Add Card</span> <CreditCard size={18} />
      </Button>
    </div>
  )
}
