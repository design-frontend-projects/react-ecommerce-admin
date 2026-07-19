import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useInventoryContext } from './inventory-provider'

export function InventoryPrimaryButtons() {
  const { setOpen } = useInventoryContext()
  return (
    <div className='flex gap-2'>
      <Can permission='inventory.manage'>
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>Add Inventory</span> <PackagePlus size={18} />
        </Button>
      </Can>
    </div>
  )
}
