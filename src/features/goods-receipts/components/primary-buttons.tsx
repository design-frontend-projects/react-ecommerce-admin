import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useReceiptsContext } from './provider'

export function ReceiptsPrimaryButtons() {
  const { setCurrentRow, setOpen } = useReceiptsContext()
  return (
    <Can permission='purchasing.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New receipt
      </Button>
    </Can>
  )
}
