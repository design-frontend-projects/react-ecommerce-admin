import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProductsContext } from './products-provider'

export function ProductsPrimaryButtons() {
  const { setOpen } = useProductsContext()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Add Product</span> <PackagePlus size={18} />
      </Button>
    </div>
  )
}
