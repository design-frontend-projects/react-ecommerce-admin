import { MoreHorizontal, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWarehousesContext } from './provider'
import type { WarehouseListItem } from '../data/schema'

export function WarehouseRowActions({ row }: { row: WarehouseListItem }) {
  const { setCurrentRow, setOpen } = useWarehousesContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row)
            setOpen('locations')
          }}
        >
          <MapPin className='me-2 h-4 w-4' />
          Manage locations
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row)
            setOpen('edit')
          }}
        >
          <Pencil className='me-2 h-4 w-4' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className='text-rose-600'
          onClick={() => {
            setCurrentRow(row)
            setOpen('delete')
          }}
        >
          <Trash2 className='me-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
