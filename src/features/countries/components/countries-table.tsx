import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'

import { DataTable } from '@/components/data-table'
import { type Country } from '../data/schema'
import { countriesColumns } from './countries-columns'
import { CountriesTableAction } from './countries-table-action'

type CountriesTableProps = {
  data: Country[]
  search: Record<string, unknown>
  navigate: NavigateFn
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
    sorting,
    onSortingChange,
    pagination,
    onPaginationChange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'name', searchKey: 'name', type: 'string' },
      { columnId: 'code', searchKey: 'code', type: 'string' },
    ],
    sorting: { enabled: true },
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <DataTable
      table={table}
      columns={columns}
      searchKey='name'
      searchPlaceholder='Search countries...'
      toolbarActions={<CountriesTableAction />}
    />
  )
}
