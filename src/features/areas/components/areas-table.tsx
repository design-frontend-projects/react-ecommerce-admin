import { useMemo } from 'react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import { areaColumns } from './areas-columns'
import { useAreas } from '../hooks/use-areas'

export function AreasTable() {
  const { data, isLoading } = useAreas()
  const columns = useMemo(() => areaColumns, [])

  const table = useReactTable({
    data: (data as any) || [],
    columns: columns as any,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0'>
      <DataTable 
        table={table}
        columns={columns as any} 
      />
    </div>
  )
}
