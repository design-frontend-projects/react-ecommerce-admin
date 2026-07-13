import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useBrandsContext } from './provider'

export function BrandsPrimaryButtons() {
  const { setCurrentRow, setOpen } = useBrandsContext()
  return (
    <Can permission='inventory.manage'>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        <Plus className='me-1 h-4 w-4' />
        New brand
      </Button>
    </Can>
  )
}
