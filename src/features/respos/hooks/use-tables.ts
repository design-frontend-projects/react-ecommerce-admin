// Table Hook for ResPOS
import { useResposStore } from '@/stores/respos-store'
import { useUpdateTableStatus } from '../api/mutations'
import { useTables as useTablesQuery } from '../api/queries'
import type { ResTable, TableStatus } from '../types'

export function useTablesManager(floorId?: string) {
  const {
    selectedFloorId,
    selectedTable,
    setSelectedTable,
    setSelectedFloorId,
  } = useResposStore()

  const effectiveFloorId = floorId || selectedFloorId || undefined
  const {
    data: tables,
    isLoading,
    error,
    refetch,
  } = useTablesQuery(effectiveFloorId)

  const updateStatusMutation = useUpdateTableStatus()

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    return updateStatusMutation.mutateAsync({ tableId, status })
  }

  const selectTable = (table: ResTable | null) => {
    setSelectedTable(table)
  }

  const selectFloor = (floorId: string | null) => {
    setSelectedFloorId(floorId)
    setSelectedTable(null) // Clear selected table when changing floors
  }

  // Group tables by status
  const tablesByStatus = tables?.reduce(
    (acc, table) => {
      acc[table.status] = acc[table.status] || []
      acc[table.status].push(table)
      return acc
    },
    {} as Record<TableStatus, ResTable[]>
  )

  // Get stats
  const stats = {
    total: tables?.length || 0,
    free: tables?.filter((t) => t.status === 'free').length || 0,
    occupied: tables?.filter((t) => t.status === 'occupied').length || 0,
    reserved: tables?.filter((t) => t.status === 'reserved').length || 0,
    dirty: tables?.filter((t) => t.status === 'dirty').length || 0,
  }

  return {
    tables: tables || [],
    isLoading,
    error,
    refetch,
    selectedTable,
    selectedFloorId: effectiveFloorId,
    selectTable,
    selectFloor,
    updateTableStatus,
    isUpdating: updateStatusMutation.isPending,
    tablesByStatus,
    stats,
  }
}
