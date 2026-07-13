import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReceiptsContext } from './provider'
import type { ReceiptListItem } from '../data/schema'

export function ReceiptRowActions({ row }: { row: ReceiptListItem }) {
  const { setCurrentRow, setOpen } = useReceiptsContext()
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
