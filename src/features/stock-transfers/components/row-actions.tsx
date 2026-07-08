import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTransfersContext } from './provider'
import type { TransferListItem } from '../data/schema'

export function TransferRowActions({ row }: { row: TransferListItem }) {
  const { setCurrentRow, setOpen } = useTransfersContext()
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
