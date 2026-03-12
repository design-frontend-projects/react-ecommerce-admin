import { useAuth } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type ReadyOrderItem,
  useCaptainRealtime,
  useMarkItemsServed,
  useReadyOrderItems,
} from '../api/captain-queries'
import { ReadyTableCard } from '../components/captain/ready-table-card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { NotificationsDropdown } from '../components/notifications-dropdown'
import { Separator } from '@/components/ui/separator'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function CaptainDashboard() {
  const { has, isLoaded, isSignedIn } = useAuth()

  // Enable realtime updates
  const { isConnected } = useCaptainRealtime()

  const { data: readyItems, isRefetching, refetch } = useReadyOrderItems()
  const { mutate: markServed } = useMarkItemsServed()

  if (!isLoaded) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isLoaded && isSignedIn) {
    if (!has({ role: 'captain' }) && !has({ role: 'super_admin' })) {
      return (
        <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
          <ShieldAlert className='h-16 w-16 text-destructive' />
          <h2 className='text-2xl font-bold'>Access Denied</h2>
          <p className='text-muted-foreground'>
            You do not have permission to view this page.
          </p>
        </div>
      )
    }
  }

  // Group items by table
  const itemsByTable = (readyItems || []).reduce(
    (acc, item) => {
      const tableId = item.order.table_id || 'unknown'
      if (!acc[tableId]) {
        acc[tableId] = {
          tableNumber: item.order.table?.table_number || 'Unknown',
          items: [],
        }
      }
      acc[tableId].items.push(item)
      return acc
    },
    {} as Record<string, { tableNumber: string; items: ReadyOrderItem[] }>
  )

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <UtensilsCrossed className='h-5 w-5' />
          </div>
          <div className='flex flex-col'>
            <h1 className='text-sm font-semibold leading-none'>Captain Station</h1>
            <p className='text-[10px] text-muted-foreground uppercase tracking-wider font-medium'>Service Quality</p>
          </div>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <NotificationsDropdown />
          <Separator orientation='vertical' className='mx-1 h-6' />
          <div className='hidden items-center gap-2 sm:flex'>
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex flex-col gap-6'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='flex items-center justify-between'
          >
            <div>
              <div className='flex items-center gap-3'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  Table Service
                </h2>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md ${
                    isConnected
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-muted bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isConnected ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/50'
                    }`}
                  />
                  {isConnected ? 'Realtime Connected' : 'Disconnected'}
                </motion.span>
              </div>
              <p className='text-sm text-muted-foreground'>
                Monitor and serve ready dishes to tables.
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isRefetching}
              className='shadow-sm'
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Refetch
            </Button>
          </motion.div>

          <AnimatePresence mode='wait'>
            {Object.keys(itemsByTable).length === 0 ? (
              <motion.div
                key='empty'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className='flex h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-center backdrop-blur-sm'
              >
                <div className='mb-4 rounded-full bg-primary/10 p-4'>
                  <UtensilsCrossed className='h-8 w-8 text-primary' />
                </div>
                <h3 className='text-xl font-semibold'>No Orders Ready</h3>
                <p className='mt-1 text-muted-foreground'>
                  New ready items from the kitchen will appear here automatically.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key='grid'
                variants={container}
                initial='hidden'
                animate='show'
                className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              >
                {Object.entries(itemsByTable)
                  .sort(([, a], [, b]) => a.tableNumber.localeCompare(b.tableNumber))
                  .map(([tableId, { tableNumber, items: tableItems }]) => (
                    <motion.div key={tableId} variants={item}>
                      <ReadyTableCard
                        tableNumber={tableNumber}
                        items={tableItems}
                        onMarkServed={markServed}
                      />
                    </motion.div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Main>
    </>
  )
}
