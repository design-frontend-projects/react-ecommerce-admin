import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePOContext } from './purchase-orders-provider'

export function POPrimaryButtons() {
  const { setOpen } = usePOContext()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>Create Order</span>
        <Plus size={18} />
      </Button>
    </div>
  )
}
