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
import { type City } from '../data/schema'
import { citiesColumns } from './cities-columns'
import { CitiesTableAction } from './cities-table-action'

type CitiesTableProps = {
  data: City[]
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function CitiesTable({
  data,
  search,
  navigate,
}: CitiesTableProps) {
  const columns = useMemo(() => citiesColumns, [])

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
      searchPlaceholder='Search cities...'
      toolbarActions={<CitiesTableAction />}
    />
  )
}
