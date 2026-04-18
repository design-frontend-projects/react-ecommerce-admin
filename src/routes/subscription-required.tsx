import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut, Sparkles } from 'lucide-react'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Button } from '@/components/ui/button'
import { SubscriptionModal } from '@/features/subscriptions/components/subscription-modal'

export const Route = createFileRoute('/subscription-required')({
  component: SubscriptionRequired,
})

function SubscriptionRequired() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(true)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)

  const handleSuccess = () => {
    navigate({ to: '/' })
  }

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl' />
        <div className='absolute -right-32 -bottom-32 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-3xl delay-1000' />
        <div className='absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-sky-500/5 blur-3xl delay-500' />
      </div>

      <header className='absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-4 sm:p-6'>
        <div className='flex items-center gap-2 text-white/80'>
          <Sparkles className='h-5 w-5 text-primary' />
          <span className='text-sm font-medium'>Restaurant Management</span>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='text-white/60 hover:bg-white/10 hover:text-white'
          onClick={() => setSignOutDialogOpen(true)}
        >
          <LogOut className='mr-2 h-4 w-4' />
          Sign Out
        </Button>
      </header>

      <div className='relative z-0 px-4 text-center'>
        <h1 className='mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl'>
          Welcome to the Management Platform
        </h1>
        <p className='mx-auto max-w-md text-base text-white/50'>
          Choose a suitable plan to unlock all restaurant management
          capabilities.
        </p>
      </div>

      <SubscriptionModal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setModalOpen(true)
          }
        }}
        onSuccess={handleSuccess}
      />

      <SignOutDialog
        open={signOutDialogOpen}
        onOpenChange={setSignOutDialogOpen}
      />
    </div>
  )
}
