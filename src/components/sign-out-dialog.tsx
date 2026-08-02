import { useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Trans } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useResposStore } from '@/stores/respos-store'
import { useAuth, useSupabase } from '@/hooks/use-auth'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function clearResposSessionState() {
  const resposState = useResposStore.getState()
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
  const { isLoaded } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
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

  if (!isLoaded) return null

  return (
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
  )
}
