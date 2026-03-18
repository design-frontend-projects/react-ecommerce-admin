import { useCities } from '../hooks/use-cities'
import { DataTable } from '@/components/ui/data-table/data-table'
import { columns } from './cities-columns'

export function CitiesTable() {
  const { data: cities, isLoading } = useCities()

  return (
    <DataTable
      columns={columns}
      data={cities || []}
      isLoading={isLoading}
      searchKey='name'
    />
  )
}
