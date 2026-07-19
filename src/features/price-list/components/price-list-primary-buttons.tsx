import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePriceListContext } from './price-list-provider'

export function PriceListPrimaryButtons() {
  const { setOpen } = usePriceListContext()

  return (
    <div className='flex gap-2'>
      <Can permission='sales.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>Add Price Rule</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
