import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePOContext } from './po-provider'

export function POPrimaryButtons() {
  const { setOpen } = usePOContext()

  return (
    <Can permission='purchasing.manage'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <Plus className='h-4 w-4' />
        <span>Create Purchase Order</span>
      </Button>
    </Can>
  )
}
