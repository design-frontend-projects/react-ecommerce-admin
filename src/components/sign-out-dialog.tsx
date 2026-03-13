import { useNavigate, useLocation } from '@tanstack/react-router'
import { useClerk } from '@clerk/clerk-react'
import { Trans } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()
  const clerk = useClerk()

  const handleSignOut = async () => {
    await clerk.signOut()
    auth.reset()
    // Preserve current location for redirect after sign-in
    const currentPath = location.href
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<Trans i18nKey='sidebar.signOut' />}
      desc={<Trans i18nKey='signOutDialog.desc' />}
      confirmText={<Trans i18nKey='signOutDialog.confirmText' />}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
