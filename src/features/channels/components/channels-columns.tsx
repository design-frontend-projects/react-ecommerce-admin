import { type ColumnDef } from '@tanstack/react-table'
import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import type { Channel } from '../data/schema'
import { ChannelsRowActions } from './channels-row-actions'

export const columns: ColumnDef<Channel>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Code' />
    ),
    cell: ({ row }) => {
      const code = row.getValue('code') as string
      return (
        <Badge variant='outline' className='font-mono font-semibold tracking-wide'>
          {code}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <div className='font-medium text-foreground max-w-[200px] truncate'>
        {row.getValue('name')}
      </div>
    ),
  },
  {
    accessorKey: 'name_ar',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Arabic Name' />
    ),
    cell: ({ row }) => {
      const nameAr = row.getValue('name_ar') as string | null
      return (
        <div dir='rtl' className='text-muted-foreground text-sm max-w-[180px] truncate'>
          {nameAr || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Description' />
    ),
    cell: ({ row }) => {
      const desc = row.getValue('description') as string | null
      return (
        <div
          className='text-muted-foreground text-sm max-w-[250px] truncate'
          title={desc || ''}
        >
          {desc || '—'}
        </div>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20'
              : 'text-muted-foreground'
          }
        >
          {isActive ? (
            <Check className='mr-1 h-3 w-3' />
          ) : (
            <Minus className='mr-1 h-3 w-3' />
          )}
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      if (value === 'all' || !value) return true
      return row.getValue(id) === (value === 'true')
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created' />
    ),
    cell: ({ row }) => {
      const raw = row.getValue('created_at') as string | null
      if (!raw) return <span className='text-muted-foreground text-xs'>—</span>
      const date = new Date(raw)
      return (
        <span className='text-muted-foreground text-xs'>
          {date.toLocaleDateString()}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <ChannelsRowActions row={row} />,
  },
]
