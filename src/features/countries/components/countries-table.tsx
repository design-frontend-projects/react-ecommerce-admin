import { useMemo } from 'react'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { DataTable } from '@/components/data-table'
import { type Country } from '../data/schema'
import { countriesColumns } from './countries-columns'
import { CountriesTableAction } from './countries-table-action'

type CountriesTableProps = {
  data: Country[]
  search: Record<string, unknown>
  navigate: (opts: {
    search:
      | true
      | Record<string, unknown>
      | ((
          prev: Record<string, unknown>
        ) => Partial<Record<string, unknown>> | Record<string, unknown>)
    replace?: boolean
  }) => void
}

export function CountriesTable({
  data,
  search,
  navigate,
}: CountriesTableProps) {
  const columns = useMemo(() => countriesColumns, [])

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
      toolbarActions={<CountriesTableAction />}
    />
  )
}
