import { Plus, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLookupsContext } from './provider'

export function LookupsPrimaryButtons() {
  const { selectedType, setIsCreateOpen, setIsCreateTypeOpen } = useLookupsContext()

  return (
    <div className='flex items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => setIsCreateTypeOpen(true)}
        className='h-8 text-xs font-semibold gap-1.5'
      >
        <FolderPlus className='h-3.5 w-3.5 text-primary' />
        <span>New Catalog</span>
      </Button>

      <Button
        size='sm'
        onClick={() => setIsCreateOpen(true)}
        disabled={!selectedType}
        className='h-8 text-xs font-semibold gap-1.5 shadow-2xs'
      >
        <Plus className='h-3.5 w-3.5' />
        <span>Add Option</span>
      </Button>
    </div>
  )
}
