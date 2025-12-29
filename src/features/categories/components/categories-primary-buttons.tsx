import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCategoriesContext } from './categories-provider'

export function CategoriesPrimaryButtons() {
  const { setOpen } = useCategoriesContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Create Category</span> <Plus size={18} />
      </Button>
    </div>
  )
}
