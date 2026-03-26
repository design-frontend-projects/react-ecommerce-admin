import { DataTable } from '@/components/data-table/data-table'
import { areaColumns } from './areas-columns'
import { useAreas } from '../hooks/use-areas'

export function AreasTable() {
  const { data, isLoading } = useAreas()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0'>
      <DataTable 
        data={data?.data || []} 
        columns={areaColumns} 
      />
    </div>
  )
}
