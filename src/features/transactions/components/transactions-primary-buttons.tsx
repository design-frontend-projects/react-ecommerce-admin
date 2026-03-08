import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTransactionsContext } from './transactions-provider'

export function TransactionsPrimaryButtons() {
  const { setOpen } = useTransactionsContext()

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Create Transaction</span> <Plus size={18} />
      </Button>
    </div>
  )
}
