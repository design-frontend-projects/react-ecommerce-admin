import { type Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  toolbarActions?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  searchKey,
  toolbarActions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const effectiveSearchKey = searchKey || 'transaction_number'
  const effectivePlaceholder = searchPlaceholder || 'Filter...'

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder={effectivePlaceholder}
          value={
            (table.getColumn(effectiveSearchKey)?.getFilterValue() as string) ??
            ''
          }
          onChange={(event) =>
            table
              .getColumn(effectiveSearchKey)
              ?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Reset
            <X className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='flex items-center space-x-2'>
        {toolbarActions}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
