import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useCitiesDialog } from './cities-provider'

export function CitiesTableAction() {
  const { setOpen } = useCitiesDialog()

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='default'
        size='sm'
        className='h-8'
        onClick={() => setOpen('add')}
      >
        <IconPlus className='mr-2 h-4 w-4' />
        Add City
      </Button>
    </div>
  )
}
