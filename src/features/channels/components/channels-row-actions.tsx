import { type Row } from '@tanstack/react-table'
import { Edit, Eye, MoreHorizontal, Trash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Channel } from '../data/schema'
import { useChannelsContext } from './channels-provider'

interface ChannelsRowActionsProps<TData> {
  row: Row<TData>
}

export function ChannelsRowActions<TData>({
  row,
}: ChannelsRowActionsProps<TData>) {
  const { t } = useTranslation()
  const channel = row.original as Channel
  const { setOpen, setCurrentRow } = useChannelsContext()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>{t('common.openMenu', { defaultValue: 'Open menu' })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(channel)
            setOpen('view')
          }}
        >
          <Eye className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          {t('common.view', { defaultValue: 'View' })}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(channel)
            setOpen('update')
          }}
        >
          <Edit className='mr-2 h-3.5 w-3.5 text-muted-foreground/70' />
          {t('common.edit', { defaultValue: 'Edit' })}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onClick={() => {
            setCurrentRow(channel)
            setOpen('delete')
          }}
        >
          <Trash className='mr-2 h-3.5 w-3.5 text-destructive/70' />
          {t('common.delete', { defaultValue: 'Delete' })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
