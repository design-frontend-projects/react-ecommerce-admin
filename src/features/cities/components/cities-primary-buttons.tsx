import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCitiesContext } from './cities-provider'

export function CitiesPrimaryButtons() {
  const { open } = useCitiesContext()

  return (
    <div className='flex items-center gap-2'>
      <Button onClick={() => open('create')} size='sm'>
        <Plus className='mr-2 h-4 w-4' />
        Add City
      </Button>
    </div>
  )
}
