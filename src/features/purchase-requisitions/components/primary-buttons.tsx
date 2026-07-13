import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useRequisitionsContext } from './provider'

export function RequisitionsPrimaryButtons() {
  const { setCurrentRow, setOpen } = useRequisitionsContext()
  return (
    <Can permission='purchasing.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New requisition
      </Button>
    </Can>
  )
}
