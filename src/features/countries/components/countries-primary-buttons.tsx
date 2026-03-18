import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCountriesContext } from './countries-provider'

export function CountriesPrimaryButtons() {
  const { setOpen } = useCountriesContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Create Country</span> <Plus size={18} />
      </Button>
    </div>
  )
}
