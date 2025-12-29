import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaxContext } from './tax-rates-provider'

export function TaxPrimaryButtons() {
  const { setOpen } = useTaxContext()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('create')}>
        <span>Add Tax Rate</span>
        <Plus size={18} />
      </Button>
    </div>
  )
}
