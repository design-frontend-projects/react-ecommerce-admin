import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePromotionsContext } from './promotions-provider'

export function PromotionsPrimaryButtons() {
  const { setOpen } = usePromotionsContext()

  return (
    <div className='flex gap-2'>
      <Can permission='sales.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>Create Promotion</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
