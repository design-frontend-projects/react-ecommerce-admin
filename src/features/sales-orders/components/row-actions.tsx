import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOrdersContext } from './provider'
import type { OrderListItem } from '../data/schema'

export function OrderRowActions({ row }: { row: OrderListItem }) {
  const { setCurrentRow, setOpen } = useOrdersContext()
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={() => {
        setCurrentRow(row)
        setOpen('view')
      }}
    >
      <Eye className='me-1 h-4 w-4' />
      View
    </Button>
  )
}
