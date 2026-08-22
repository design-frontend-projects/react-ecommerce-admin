// ResPOS Dashboard Page
// Main dashboard for restaurant staff with role-based widgets
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  ChefHat,
  ClipboardList,
  DollarSign,
  Grid3X3,
  Loader2,
  Receipt,
  Shield,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDashboardStats, useOrders } from '../api/queries'
import { NotificationsDropdown } from '../components'
import { ReservationWidget } from '../components/reservation-widget'
import { formatCurrency } from '../lib/formatters'
import type { Permission } from '../types'

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

function getOrderStatusVariant(status?: string | null) {
  switch (status) {
    case 'paid':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
    case 'ready':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-500'
    case 'in_progress':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-500'
    case 'void':
    case 'void_pending':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-500'
    default:
      return 'border-primary/20 bg-primary/10 text-primary'
  }
}

export function ResposDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentOrders = [], isLoading: ordersLoading } = useOrders()
  const { has, isLoaded, isSignedIn } = useAuth()

  const isLoading = statsLoading || !isLoaded

  const quickActions: Array<{
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    href: string
    color: string
    permission: Permission
  }> = [
    {
      title: 'New Order',
      description: 'Start a new table order',
      icon: Receipt,
      href: '/respos/pos',
      color: 'from-blue-500 to-cyan-500',
      permission: 'pos',
    },
    {
      title: 'Kitchen Display',
      description: 'View order queue',
      icon: ChefHat,
      href: '/respos/kitchen',
      color: 'from-orange-500 to-red-500',
      permission: 'kitchen',
    },
    {
      title: 'Reservations',
      description: 'Manage bookings',
      icon: CalendarClock,
      href: '/respos/reservations',
      color: 'from-purple-500 to-pink-500',
      permission: 'reservations',
    },
    {
      title: 'Manage Tables',
      description: 'Floor plan & tables',
      icon: Grid3X3,
      href: '/respos/floors',
      color: 'from-green-500 to-emerald-500',
      permission: 'floors',
    },
  ]

  if (!isSignedIn) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Shield className='mx-auto h-12 w-12 text-red-500' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header fixed>
        <div className='flex items-center gap-3'>
          <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <UtensilsCrossed className='h-5 w-5' />
          </div>
          <div className='flex flex-col'>
            <h1 className='text-sm leading-none font-semibold'>Dashboard</h1>
            <p className='text-[10px] font-medium tracking-wider text-muted-foreground uppercase'>
              Control Center
            </p>
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
        <motion.div
          variants={container}
          initial='hidden'
          animate='show'
          className='space-y-6'
        >
          {/* Welcome Section */}
          <motion.div
            variants={item}
            className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'
          >
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                Welcome back! 👋
              </h2>
              <p className='text-muted-foreground'>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </motion.div>

          {/* Stats Grid */}
          {isLoading ? (
            <div className='flex justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <motion.div
              variants={item}
              className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'
            >
              <StatsCard
                title='Active Tables'
                value={stats?.activeTables ?? 0}
                total={stats?.totalTables ?? 0}
                icon={Grid3X3}
                color='text-blue-500'
              />
              <StatsCard
                title='Open Orders'
                value={stats?.openOrders ?? 0}
                icon={ClipboardList}
                color='text-orange-500'
              />
              <StatsCard
                title="Today's Sales"
                value={formatCurrency(stats?.todaySales ?? 0)}
                icon={DollarSign}
                color='text-green-500'
              />
              <StatsCard
                title='Pending Notifications'
                value={stats?.pendingNotifications ?? 0}
                icon={Users}
                color='text-purple-500'
              />
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={item}>
            <h3 className='mb-4 text-lg font-semibold'>Quick Actions</h3>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {quickActions
                .filter((action) => has({ role: action.permission }))
                .map((action) => (
                  <QuickActionCard key={action.href} {...action} />
                ))}
            </div>
          </motion.div>

          {/* Dashboard Widgets */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
            <motion.div variants={item} className='col-span-4'>
              <Card className='flex h-full flex-col'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
                  <div>
                    <CardTitle className='text-base font-semibold'>
                      Recent Orders
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      Latest orders from today's shift
                    </CardDescription>
                  </div>
                  <Button asChild variant='ghost' size='sm' className='gap-1 text-xs'>
                    <Link to='/respos/pos'>
                      POS Screen
                      <ArrowRight className='h-3.5 w-3.5' />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className='flex-1'>
                  {ordersLoading ? (
                    <div className='flex h-[180px] items-center justify-center'>
                      <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                    </div>
                  ) : recentOrders.length > 0 ? (
                    <div className='divide-y divide-border/40'>
                      {recentOrders.slice(0, 5).map((order) => (
                        <div
                          key={order.id}
                          className='flex items-center justify-between py-3 first:pt-0 last:pb-0'
                        >
                          <div className='space-y-1'>
                            <div className='flex items-center gap-2'>
                              <span className='font-mono text-sm font-medium'>
                                #{order.order_number}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${getOrderStatusVariant(order.status)}`}
                              >
                                {order.status?.replace('_', ' ') || 'open'}
                              </span>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                              {order.table?.table_number
                                ? `Table ${order.table.table_number}`
                                : order.customer_name || 'Takeaway'}
                              {' • '}
                              {order.order_items?.length || 0} items
                            </p>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-semibold'>
                              {formatCurrency(Number(order.total_amount) || 0)}
                            </p>
                            <p className='text-[11px] text-muted-foreground'>
                              {order.created_at
                                ? format(new Date(order.created_at), 'hh:mm a')
                                : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='flex h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground'>
                      <Receipt className='h-8 w-8 text-muted-foreground/50' />
                      <p className='text-sm font-medium'>No orders yet</p>
                      <p className='text-xs'>
                        Start taking orders from the POS screen.
                      </p>
                      <Button asChild size='sm' variant='outline' className='mt-2'>
                        <Link to='/respos/pos'>Create Order</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={item} className='col-span-3'>
              <ReservationWidget />
            </motion.div>
          </div>
        </motion.div>
      </Main>
    </>
  )
}

// Stats Card Component
interface StatsCardProps {
  title: string
  value: string | number
  total?: number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  color: string
}

function StatsCard({
  title,
  value,
  total,
  icon: Icon,
  trend,
  color,
}: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className='overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm transition-colors hover:border-primary/50'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-xs font-medium tracking-wider text-muted-foreground uppercase'>
            {title}
          </CardTitle>
          <div className={`rounded-md ${color.replace('text-', 'bg-')}/10 p-2`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-2xl font-bold tracking-tight'>{value}</div>
            {total !== undefined && (
              <span className='text-xs font-medium text-muted-foreground'>
                / {total}
              </span>
            )}
          </div>
          {trend !== undefined && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mt-2 flex items-center text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              <TrendingUp
                className={`mr-1 h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`}
              />
              {trend >= 0 ? '+' : ''}
              {trend}%
              <span className='ml-1 font-normal text-muted-foreground'>
                from last shift
              </span>
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Quick Action Card Component
interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: QuickActionCardProps) {
  return (
    <Link to={href as any}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Card className='group cursor-pointer border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'>
          <CardContent className='flex items-center gap-4 p-4'>
            <div
              className={`rounded-xl bg-linear-to-br ${color} p-3 text-white shadow-lg shadow-black/5 transition-transform group-hover:scale-110 group-hover:rotate-6`}
            >
              <Icon className='h-5 w-5' />
            </div>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-semibold'>{title}</p>
              <p className='text-[11px] text-muted-foreground transition-colors group-hover:text-primary/80'>
                {description}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
