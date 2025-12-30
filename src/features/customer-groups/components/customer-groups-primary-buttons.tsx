import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomerGroupsContext } from './customer-groups-provider'

export function CustomerGroupsPrimaryButtons() {
  const { setOpen } = useCustomerGroupsContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Add Group</span> <Plus size={18} />
      </Button>
    </div>
  )
}
