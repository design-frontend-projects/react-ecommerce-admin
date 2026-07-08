import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useTransfersContext } from './provider'

export function TransfersPrimaryButtons() {
  const { setCurrentRow, setOpen } = useTransfersContext()
  return (
    <Can permission='inventory.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New transfer
      </Button>
    </Can>
  )
}
