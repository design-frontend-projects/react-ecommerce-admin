import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useCustomersContext } from './customers-provider'

export function CustomersPrimaryButtons() {
  const { setOpen } = useCustomersContext()

  return (
    <div className='flex gap-2'>
      <Can permission='sales.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>Add Customer</span> <UserPlus size={18} />
        </Button>
      </Can>
    </div>
  )
}
