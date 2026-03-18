import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrenciesContext } from './currencies-provider'

export function CurrenciesPrimaryButtons() {
  const { setOpen } = useCurrenciesContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Create Currency</span> <Plus size={18} />
      </Button>
    </div>
  )
}
