import { useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { LogOut, Timer } from 'lucide-react'
import { Trans } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useResposStore } from '@/stores/respos-store'
import { outboxPendingCount } from '@/lib/sync/outbox'
import { useAuth, useSupabase, useUser } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useActiveShift } from '@/features/respos/api/queries'
import {
  useShiftExpected,
  useShiftSettings,
} from '@/features/respos/api/shift-hooks'
import { useShift } from '@/features/respos/hooks/use-shift'
import { isShiftGatedUser } from '@/features/respos/lib/shift-enforcement'
import { CloseShiftDialog } from '@/features/respos/pages/shifts'
import { useRBACStore } from '@/features/users/data/store'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function clearResposSessionState() {
  const resposState = useResposStore.getState()
  resposState.setActiveShift(null)
  resposState.setCurrentEmployee(null)
  resposState.setSelectedTable(null)
  resposState.setSelectedFloorId(null)
  resposState.clearCart()
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useSupabase()
  const auth = useAuthStore((state) => state.auth)
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false)

  const authUserId = user?.id || null
  const roleNames = useRBACStore((state) => state.currentRoleNames)
  const permissionNames = useRBACStore((state) => state.currentPermissionNames)
  const isShiftGated = isShiftGatedUser(roleNames, permissionNames)
  const { data: activeShift, isLoading: isShiftStatusLoading } =
    useActiveShift(authUserId)

  const { closeShift, isClosing } = useShift({ authUserId })

  // Server-computed expected cash + threshold for the close dialog.
  const { data: expected } = useShiftExpected(
    closeShiftDialogOpen ? (activeShift?.id ?? null) : null
  )
  const { data: shiftSettings } = useShiftSettings(
    activeShift?.restaurant_id ?? null,
    activeShift?.branch_id ?? null,
    { enabled: isShiftGated && !!activeShift }
  )

  const signOutAndRedirect = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      auth.reset()
      clearResposSessionState()

      const currentPath = location.href
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleSignOut = async () => {
    await signOutAndRedirect()
  }

  const handleProceedSignOut = async () => {
    onOpenChange(false)
    await signOutAndRedirect()
  }

  const handleCloseShiftAndSignOut = async (values: {
    closingCash: number
    notes?: string
  }) => {
    if (!user) return

    // Closing reconciles cash against synced orders: any offline orders still
    // pending would make the expected cash wrong, so they must sync first.
    const pendingCount = await outboxPendingCount().catch(() => 0)
    if (pendingCount > 0) {
      toast.error(
        `You have ${pendingCount} offline order(s) pending sync. Go online and let them sync before closing the shift.`
      )
      return
    }

    try {
      if (activeShift && !useResposStore.getState().activeShift) {
        useResposStore.getState().setActiveShift(activeShift)
      }
      await closeShift(user.id, values.closingCash, values.notes)
      toast.success('Shift closed successfully')
      setCloseShiftDialogOpen(false)
      await signOutAndRedirect()
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Failed to close shift'
      )
    }
  }

  const shouldCheckShiftForSignOut =
    open && isLoaded && isSignedIn && isShiftGated && !!authUserId

  const shouldShowShiftActionDialog =
    shouldCheckShiftForSignOut && !!activeShift

  if (shouldCheckShiftForSignOut && isShiftStatusLoading) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title='Checking shift status'
        desc='Please wait while we verify your active shift.'
        confirmText='Continue'
        disabled
        isLoading
        handleConfirm={() => {}}
        className='sm:max-w-sm'
      />
    )
  }

  return (
    <>
      {shouldShowShiftActionDialog ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent showCloseButton={false} className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Timer className='h-5 w-5 text-orange-500' />
                Active shift detected
              </DialogTitle>
              <DialogDescription>
                You still have an open cashier shift. Close shift first or
                proceed to sign out without closing it.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSigningOut}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='secondary'
                onClick={() => {
                  onOpenChange(false)
                  setCloseShiftDialogOpen(true)
                }}
                disabled={isSigningOut}
              >
                Close Shift First
              </Button>
              <Button
                type='button'
                variant='destructive'
                onClick={handleProceedSignOut}
                disabled={isSigningOut}
                className='gap-2'
              >
                <LogOut className='h-4 w-4' />
                Proceed Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={open}
          onOpenChange={onOpenChange}
          title={<Trans i18nKey='sidebar.signOut' />}
          desc={<Trans i18nKey='signOutDialog.desc' />}
          confirmText={<Trans i18nKey='signOutDialog.confirmText' />}
          destructive
          isLoading={isSigningOut}
          handleConfirm={handleSignOut}
          className='sm:max-w-sm'
        />
      )}

      <CloseShiftDialog
        open={closeShiftDialogOpen}
        onOpenChange={setCloseShiftDialogOpen}
        openingCash={activeShift?.opening_cash ?? 0}
        isPending={isClosing || isSigningOut}
        onSubmit={handleCloseShiftAndSignOut}
        expectedCash={expected ? Number(expected.expected) : null}
        cashSales={expected ? Number(expected.cashSales) : null}
        movementsIn={expected ? Number(expected.movementsIn) : null}
        movementsOut={expected ? Number(expected.movementsOut) : null}
        varianceThreshold={
          shiftSettings ? Number(shiftSettings.varianceThreshold) : undefined
        }
        requireCommentOverThreshold={
          shiftSettings?.requireCommentOverThreshold ?? false
        }
      />
    </>
  )
}
