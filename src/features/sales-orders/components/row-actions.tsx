import { Eye, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderListItem } from '../data/schema'
import { useOrdersContext } from './provider'

export function OrderRowActions({ row }: { row: OrderListItem }) {
  const { setCurrentRow, setOpen } = useOrdersContext()

  return (
    <div className='flex items-center gap-1 justify-end'>
      {/* Quick Review & Print Button */}
      <Button
        variant='outline'
        size='sm'
        className='h-8 text-xs px-2.5'
        title='Review Order & Print'
        onClick={() => {
          setCurrentRow(row)
          setOpen('review')
        }}
      >
        <Printer className='mr-1 h-3.5 w-3.5 text-primary' />
        Print
      </Button>

      {/* View Workflow & Actions */}
      <Button
        variant='ghost'
        size='sm'
        className='h-8 text-xs px-2.5'
        title='View Status Workflow'
        onClick={() => {
          setCurrentRow(row)
          setOpen('view')
        }}
      >
        <Eye className='mr-1 h-3.5 w-3.5 text-muted-foreground' />
        Workflow
      </Button>
    </div>
  )
}
