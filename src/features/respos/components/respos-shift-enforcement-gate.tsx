import { useMemo } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useLocation } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { useOpenShift } from '@/features/respos/api/mutations'
import { useActiveShift, useShifts } from '@/features/respos/api/queries'
import { RoleNames } from '@/features/respos/constants'
import { isResposPath, shouldEnforceShiftGate } from '@/features/respos/lib/shift-enforcement'
import { OpenShiftDialog, type OpenShiftFormValues } from '@/features/respos/pages/shifts'

export function ResposShiftEnforcementGate() {
  const { isLoaded, isSignedIn, has } = useAuth()
  const { user } = useUser()
  const { pathname } = useLocation()
  const setActiveShift = useResposStore((state) => state.setActiveShift)
  const openShiftMutation = useOpenShift()

  const clerkUserId = user?.id ?? null
  const isCashier = has?.({ role: RoleNames.cashier }) ?? false
  const shouldEvaluateShiftGate =
    isLoaded &&
    isSignedIn &&
    isCashier &&
    !!clerkUserId &&
    isResposPath(pathname)

  const { data: activeShift, isLoading: activeShiftLoading, refetch: refetchActiveShift } =
    useActiveShift(shouldEvaluateShiftGate ? clerkUserId : undefined)

  const { data: shifts = [], isLoading: shiftsLoading } = useShifts(
    shouldEvaluateShiftGate ? clerkUserId : undefined
  )

  const previousClosingCash = useMemo(() => {
    const lastClosedShift = shifts.find((shift) => shift.status === 'closed')
    return lastClosedShift?.closing_cash ?? 0
  }, [shifts])

  const isCheckingShiftState =
    shouldEvaluateShiftGate && (activeShiftLoading || shiftsLoading)

  const isGateOpen =
    !isCheckingShiftState &&
    shouldEnforceShiftGate({
      isSignedIn: !!isSignedIn,
      isCashier,
      pathname,
      hasActiveShift: !!activeShift,
    })

  const handleSubmit = async (values: OpenShiftFormValues) => {
    if (!user) return

    try {
      const openedShift = await openShiftMutation.mutateAsync({
        employeeId: user.id,
        openingCash: values.openingCash,
        clerkUserId,
      })
      setActiveShift(openedShift)
      await refetchActiveShift()
      toast.success('Shift opened successfully')
    } catch {
      toast.error('Failed to open shift')
    }
  }

  if (!isSignedIn || !isLoaded) {
    return null
  }

  return (
    <OpenShiftDialog
      open={isGateOpen}
      onOpenChange={() => {}}
      employeeName={user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown' : 'Unknown'}
      isPending={openShiftMutation.isPending}
      defaultOpeningCash={previousClosingCash}
      nonDismissible
      showCancelButton={false}
      lockOpeningCash
      onSubmit={handleSubmit}
    />
  )
}
