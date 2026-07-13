import { MoreHorizontal, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { useDismissSuggestion } from '../hooks/use-replenishment'
import type { SuggestionListItem } from '../data/schema'

export function SuggestionRowActions({ row }: { row: SuggestionListItem }) {
  const dismissSuggestion = useDismissSuggestion()

  if (row.status !== 'open') {
    return null
  }

  return (
    <Can permission='purchasing.manage'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => dismissSuggestion.mutate(row.id)}>
            <XCircle className='me-2 h-4 w-4' />
            Dismiss
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Can>
  )
}
