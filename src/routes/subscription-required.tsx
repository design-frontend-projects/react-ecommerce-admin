import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LogOut, Sparkles, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Button } from '@/components/ui/button'
import { SubscriptionFlow } from '@/features/subscriptions/components/subscription-flow'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStatus } from '@/features/subscriptions/queries'
import { isSubscriptionActive } from '@/lib/subscription_utils'

export const Route = createFileRoute('/subscription-required')({
  component: SubscriptionRequired,
})

function SubscriptionRequired() {
  const navigate = useNavigate()
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const user = useAuthStore((state) => state.auth.user)
  const userId = user?.id
  const userMetadata = user?.user_metadata
  const roleNames = userMetadata?.roles || userMetadata?.role || []
  const isRestaurantRole = Array.isArray(roleNames) 
    ? roleNames.some((r: string) => ['cashier', 'captain', 'kitchen'].includes(r.toLowerCase())) 
    : ['cashier', 'captain', 'kitchen'].includes(String(roleNames).toLowerCase())

  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus(
    userId ?? undefined
  )

  useEffect(() => {
    if (!subLoading && subscription) {
      const active = isSubscriptionActive(
        subscription.status ?? '',
        subscription.end_date ? new Date(subscription.end_date) : null
      )
      if (active) {
        navigate({ to: isRestaurantRole ? '/respos' : '/products' })
      }
    }
  }, [subLoading, subscription, isRestaurantRole, navigate])

  const handleSuccess = () => {
    navigate({ to: isRestaurantRole ? '/respos' : '/inventory' })
  }

  if (subLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-slate-950'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <div className='relative flex min-h-screen flex-col items-center overflow-x-hidden bg-slate-950 selection:bg-primary/30 pb-20'>
      {/* Animated Mesh / Glowing Orbs Background */}
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute -left-[10%] top-[10%] h-[40vw] w-[40vw] rounded-full bg-primary/20 blur-[120px]' 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -70, 0],
            y: [0, 70, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className='absolute right-[0%] top-[30%] h-[35vw] w-[35vw] rounded-full bg-violet-600/20 blur-[100px]' 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.15, 0.05],
            x: [0, 40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className='absolute left-[40%] bottom-[-10%] h-[45vw] w-[45vw] rounded-full bg-sky-500/20 blur-[130px]' 
        />
      </div>

      <header className='sticky top-0 right-0 left-0 z-50 flex w-full items-center justify-between border-b border-white/5 bg-slate-950/40 px-6 py-4 backdrop-blur-xl'>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className='flex items-center gap-3 text-white'
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/20'>
            <Sparkles className='h-5 w-5 text-white' />
          </div>
          <span className='text-lg font-semibold tracking-tight'>Restaurant OS</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            variant='ghost'
            className='h-10 rounded-full border border-white/5 bg-white/5 px-6 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white'
            onClick={() => setSignOutDialogOpen(true)}
          >
            <LogOut className='mr-2 h-4 w-4' />
            Sign Out
          </Button>
        </motion.div>
      </header>

      <div className='relative z-10 mt-12 w-full px-4 text-center sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-12"
        >
          <div className='mx-auto mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm'>
            <span className='mr-2 flex h-2 w-2 rounded-full bg-primary animate-pulse'></span>
            Premium Experience
          </div>
          
          <h1 className='mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl'>
            Welcome to the <br className="hidden sm:block" />
            <span className='bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent'>
              Management Platform
            </span>
          </h1>
          
          <p className='mx-auto max-w-xl text-lg text-slate-400 sm:text-xl'>
            Choose a suitable plan to unlock all restaurant management
            capabilities and scale your business effortlessly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto w-full max-w-4xl"
        >
          <SubscriptionFlow onSuccess={handleSuccess} />
        </motion.div>
      </div>

      <SignOutDialog
        open={signOutDialogOpen}
        onOpenChange={setSignOutDialogOpen}
      />
    </div>
  )
}
