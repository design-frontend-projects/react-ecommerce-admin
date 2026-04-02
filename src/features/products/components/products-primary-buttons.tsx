import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useProductWizardStore } from '../context/product-wizard-store'

export function ProductsPrimaryButtons() {
  const { setIsOpen } = useProductWizardStore()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setIsOpen(true)}>
        <span>Add Product</span> <PackagePlus size={18} />
      </Button>
    </div>
  )
}
