import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdjustmentListItem } from '../data/schema'
import { useAdjustmentsContext } from './provider'

export function AdjustmentRowActions({ row }: { row: AdjustmentListItem }) {
  const { setCurrentRow, setOpen } = useAdjustmentsContext()
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
