import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useAdjustmentsContext } from './provider'

export function AdjustmentsPrimaryButtons() {
  const { setCurrentRow, setOpen } = useAdjustmentsContext()
  return (
    <Can permission='inventory.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New adjustment
      </Button>
    </Can>
  )
}
