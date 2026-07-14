import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CountListItem } from '../data/schema'
import { useCountsContext } from './provider'

export function CountRowActions({ row }: { row: CountListItem }) {
  const { setCurrentRow, setOpen } = useCountsContext()
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
