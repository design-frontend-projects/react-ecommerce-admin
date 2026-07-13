import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { useReorderRulesContext } from './provider'
import type { RuleListItem } from '../data/schema'

export function RuleRowActions({ row }: { row: RuleListItem }) {
  const { setCurrentRow, setOpen } = useReorderRulesContext()

  return (
    <Can permission='inventory.manage'>
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
    </Can>
  )
}
