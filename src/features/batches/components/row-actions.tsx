import { useTranslation } from 'react-i18next'
import { Eye, Lock, LockOpen, MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import type { BatchListItem } from '../data/schema'
import { useSetBatchStatus } from '../hooks/use-batches'

interface BatchRowActionsProps {
  row: BatchListItem
  onViewDetails?: (row: BatchListItem) => void
  onEdit?: (row: BatchListItem) => void
}

export function BatchRowActions({
  row,
  onViewDetails,
  onEdit,
}: BatchRowActionsProps) {
  const { t } = useTranslation()
  const setBatchStatus = useSetBatchStatus()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8'>
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('batches.columns.actions', 'Actions')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {onViewDetails ? (
          <DropdownMenuItem onClick={() => onViewDetails(row)}>
            <Eye className='me-2 h-4 w-4 text-muted-foreground' />
            {t('batches.actions.viewDetails', 'View Details & Locations')}
          </DropdownMenuItem>
        ) : null}

        <Can permission='inventory.manage'>
          {onEdit ? (
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Pencil className='me-2 h-4 w-4 text-muted-foreground' />
              {t('batches.actions.edit', 'Edit Batch')}
            </DropdownMenuItem>
          ) : null}

          {(row.status === 'active' || row.status === 'blocked') && (
            <>
              <DropdownMenuSeparator />
              {row.status === 'active' ? (
                <DropdownMenuItem
                  onClick={() =>
                    setBatchStatus.mutate({ id: row.id, status: 'blocked' })
                  }
                  className='text-amber-600 focus:text-amber-600'
                >
                  <Lock className='me-2 h-4 w-4' />
                  {t('batches.actions.block', 'Block Batch')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() =>
                    setBatchStatus.mutate({ id: row.id, status: 'active' })
                  }
                  className='text-emerald-600 focus:text-emerald-600'
                >
                  <LockOpen className='me-2 h-4 w-4' />
                  {t('batches.actions.unblock', 'Unblock Batch')}
                </DropdownMenuItem>
              )}
            </>
          )}
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
