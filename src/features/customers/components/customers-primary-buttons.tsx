import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustomersContext } from './customers-provider'

export function CustomersPrimaryButtons() {
  const { setOpen } = useCustomersContext()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <span>Add Customer</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
