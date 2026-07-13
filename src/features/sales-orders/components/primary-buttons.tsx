import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useOrdersContext } from './provider'

export function OrdersPrimaryButtons() {
  const { setCurrentRow, setOpen } = useOrdersContext()
  return (
    <Can permission='sales.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New sales order
      </Button>
    </Can>
  )
}
