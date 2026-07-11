import { useMemo } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { useAuth, useUser } from '@/hooks/use-auth'
import { useOpenShift } from '@/features/respos/api/mutations'
import { useActiveShift, useShifts } from '@/features/respos/api/queries'
import { RoleNames } from '@/features/respos/constants'
import {
  isResposPath,
  shouldEnforceShiftGate,
} from '@/features/respos/lib/shift-enforcement'
import {
  OpenShiftDialog,
  type OpenShiftFormValues,
} from '@/features/respos/pages/shifts'

export function ResposShiftEnforcementGate() {
  const { t } = useTranslation()
  const { isLoaded, isSignedIn, has } = useAuth()
  const { user } = useUser()
  const { pathname } = useLocation()
  const setActiveShift = useResposStore((state) => state.setActiveShift)
  const openShiftMutation = useOpenShift()

  const authUserId = user?.id ?? null
  const isCashier = has?.({ role: RoleNames.cashier }) ?? false
  const shouldEvaluateShiftGate =
    isLoaded &&
    isSignedIn &&
    isCashier &&
    !!authUserId &&
    isResposPath(pathname)

  const {
    data: activeShift,
    isLoading: activeShiftLoading,
    refetch: refetchActiveShift,
  } = useActiveShift(shouldEvaluateShiftGate ? authUserId : undefined)

  const { data: shifts = [], isLoading: shiftsLoading } = useShifts(
    shouldEvaluateShiftGate ? authUserId : undefined
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
        authUserId: authUserId ?? undefined,
      })
      setActiveShift(openedShift)
      await refetchActiveShift()
      toast.success(t('respos.shift.success.opened'))
    } catch {
      toast.error(t('respos.shift.error.open'))
    }
  }

  if (!isSignedIn || !isLoaded) {
    return null
  }

  return (
    <OpenShiftDialog
      open={isGateOpen}
      onOpenChange={() => {}}
      employeeName={
        user
          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || t('respos.shift.unknown')
          : t('respos.shift.unknown')
      }
      isPending={openShiftMutation.isPending}
      defaultOpeningCash={previousClosingCash}
      nonDismissible
      showCancelButton={false}
      lockOpeningCash
      onSubmit={handleSubmit}
    />
  )
}
