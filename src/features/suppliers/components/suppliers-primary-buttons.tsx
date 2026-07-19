import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useSuppliersContext } from './suppliers-provider'

export function SuppliersPrimaryButtons() {
  const { setOpen } = useSuppliersContext()

  return (
    <div className='flex gap-2'>
      <Can permission='purchasing.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>Create Supplier</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
