import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useCategoriesContext } from './categories-provider'

export function CategoriesPrimaryButtons() {
  const { setOpen } = useCategoriesContext()

  return (
    <div className='flex gap-2'>
      <Can permission='products.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>Create Category</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
