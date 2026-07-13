import { Lock, LockOpen, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { useSetBatchStatus } from '../hooks/use-batches'
import type { BatchListItem } from '../data/schema'

export function BatchRowActions({ row }: { row: BatchListItem }) {
  const setBatchStatus = useSetBatchStatus()

  if (row.status !== 'active' && row.status !== 'blocked') {
    return null
  }

  return (
    <Can permission='inventory.manage'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {row.status === 'active' ? (
            <DropdownMenuItem
              onClick={() =>
                setBatchStatus.mutate({ id: row.id, status: 'blocked' })
              }
            >
              <Lock className='me-2 h-4 w-4' />
              Block
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                setBatchStatus.mutate({ id: row.id, status: 'active' })
              }
            >
              <LockOpen className='me-2 h-4 w-4' />
              Unblock
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Can>
  )
}
