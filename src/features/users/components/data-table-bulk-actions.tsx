import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: `${status === 'active' ? 'Activating' : 'Deactivating'} users...`,
      success: () => {
        table.resetRowSelection()
        return `${status === 'active' ? 'Activated' : 'Deactivated'} ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`
      },
      error: `Error ${status === 'active' ? 'activating' : 'deactivating'} users`,
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: 'Inviting users...',
      success: () => {
        table.resetRowSelection()
        return `Invited ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`
      },
      error: 'Error inviting users',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='user'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label={t('users.bulkActions.invite')}
              title={t('users.bulkActions.invite')}
            >
              <Mail />
              <span className='sr-only'>{t('users.bulkActions.invite')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.bulkActions.invite')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label={t('users.bulkActions.activate')}
              title={t('users.bulkActions.activate')}
            >
              <UserCheck />
              <span className='sr-only'>{t('users.bulkActions.activate')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.bulkActions.activate')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('inactive')}
              className='size-8'
              aria-label={t('users.bulkActions.deactivate')}
              title={t('users.bulkActions.deactivate')}
            >
              <UserX />
              <span className='sr-only'>{t('users.bulkActions.deactivate')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.bulkActions.deactivate')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label={t('users.bulkActions.delete')}
              title={t('users.bulkActions.delete')}
            >
              <Trash2 />
              <span className='sr-only'>{t('users.bulkActions.delete')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('users.bulkActions.delete')}</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
