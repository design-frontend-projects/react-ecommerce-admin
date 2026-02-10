// Shift Management Hook for ResPOS
import { useEffect } from 'react'
import { useResposStore } from '@/stores/respos-store'
import { useOpenShift, useCloseShift } from '../api/mutations'
import { useActiveShift } from '../api/queries'

export function useShift() {
  const { activeShift, setActiveShift } = useResposStore()
  const { data: fetchedShift, isLoading, error, refetch } = useActiveShift()

  const openShiftMutation = useOpenShift()
  const closeShiftMutation = useCloseShift()

  // Sync fetched shift to store
  useEffect(() => {
    if (fetchedShift !== undefined && fetchedShift?.id !== activeShift?.id) {
      setActiveShift(fetchedShift)
    }
  }, [fetchedShift, activeShift?.id, setActiveShift])

  const openShift = async (employeeId: string, openingCash: number) => {
    const result = await openShiftMutation.mutateAsync({
      employeeId,
      openingCash,
    })
    setActiveShift(result)
    return result
  }

  const closeShift = async (
    employeeId: string,
    closingCash: number,
    notes?: string
  ) => {
    if (!activeShift) {
      throw new Error('No active shift to close')
    }

    const result = await closeShiftMutation.mutateAsync({
      shiftId: activeShift.id,
      employeeId,
      closingCash,
      notes,
    })
    setActiveShift(null)
    return result
  }

  return {
    shift: activeShift || fetchedShift,
    isLoading,
    error,
    isShiftOpen: !!(activeShift || fetchedShift),
    openShift,
    closeShift,
    isOpening: openShiftMutation.isPending,
    isClosing: closeShiftMutation.isPending,
    refetch,
  }
}
