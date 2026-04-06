import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useStoresContext } from './stores-provider'

export function StoresPrimaryButtons() {
  const { setOpen, setCurrentRow } = useStoresContext()

  return (
    <div className='flex items-center gap-2'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
        size='sm'
        className='h-8'
      >
        <Plus className='mr-2 h-4 w-4' /> Create Store
      </Button>
    </div>
  )
}
