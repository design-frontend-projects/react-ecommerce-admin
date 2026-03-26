import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { useCountries } from '../hooks/use-countries'
import { countriesColumns } from './countries-columns'

export function CountriesTable() {
  const { data: countries = [], isLoading } = useCountries()
  const columns = useMemo(() => countriesColumns, [])

  const table = useReactTable({
    data: countries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <p className='text-muted-foreground'>Loading countries...</p>
      </div>
    )
  }

  return (
    <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0'>
      <DataTable
        table={table}
        columns={columns}
        searchKey='name'
        searchPlaceholder='Search countries...'
      />
    </div>
  )
}
