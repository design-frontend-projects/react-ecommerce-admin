import { useMemo } from 'react'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { DataTable } from '@/components/data-table'
import { type City } from '../data/schema'
import { citiesColumns } from './cities-columns'
import { CitiesTableAction } from './cities-table-action'

type CitiesTableProps = {
  data: City[]
  search: Record<string, unknown>
  navigate: (opts: {
    search:
      | true
      | Record<string, unknown>
      | ((prev: Record<string, unknown>) => Partial<Record<string, unknown>> | Record<string, unknown>)
    replace?: boolean
  }) => void
}

export function CitiesTable({ data, search, navigate }: CitiesTableProps) {
  const columns = useMemo(() => citiesColumns, [])

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
  } = useTableUrlState({
    search,
    navigate,
    globalFilter: { enabled: true },
    columnFilters: [
      {
        columnId: 'is_active',
        searchKey: 'isActive',
        type: 'array',
      },
    ],
  })

  return (
    <DataTable
      data={data}
      columns={columns}
      globalFilter={globalFilter}
      onGlobalFilterChange={onGlobalFilterChange}
      columnFilters={columnFilters}
      onColumnFiltersChange={onColumnFiltersChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      toolbarActions={<CitiesTableAction />}
    />
  )
}
