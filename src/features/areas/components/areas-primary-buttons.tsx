import { Plus, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAreasContext } from '../context/areas-context'

export function AreasPrimaryButtons() {
  const { setOpen, setCurrentRow } = useAreasContext()

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        className='h-8 w-8 p-0'
        onClick={() => {}}
      >
        <Table className='h-4 w-4' />
      </Button>
      <Button
        className='ml-auto hidden h-8 lg:flex'
        onClick={() => {
          setCurrentRow(null)
          setOpen('add')
        }}
      >
        <Plus className='mr-2 h-4 w-4' />
        Add Area
      </Button>
    </div>
  )
}
