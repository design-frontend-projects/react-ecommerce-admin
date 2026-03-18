import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBranchesContext } from './branches-provider'

export function BranchesPrimaryButtons() {
  const { setOpen } = useBranchesContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Create Branch</span> <Plus size={18} />
      </Button>
    </div>
  )
}
