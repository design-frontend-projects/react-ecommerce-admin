import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { DataTable } from '@/components/data-table'
import { type City } from '../data/schema'
import { citiesColumns } from './cities-columns'
import { CitiesTableAction } from './cities-table-action'

type CitiesTableProps = {
  data: City[]
}

const route = getRouteApi('/_authenticated/cities')

export function CitiesTable({ data }: CitiesTableProps) {
  const columns = useMemo(() => citiesColumns, [])
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
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
    sorting: {
      enabled: true,
      defaultSorting: [{ id: 'name', desc: false }],
    },
  })

  return (
    <DataTable
      data={data}
      columns={columns}
      globalFilter={globalFilter}
      onGlobalFilterChange={onGlobalFilterChange}
      columnFilters={columnFilters}
      onColumnFiltersChange={onColumnFiltersChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      toolbarActions={<CitiesTableAction />}
    />
  )
}
