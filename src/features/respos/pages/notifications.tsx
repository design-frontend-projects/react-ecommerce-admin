// Notifications Center Page
// Full notifications list with filtering and management
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChefHat,
  Filter,
  Loader2,
  Receipt,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../api/mutations'
import { useNotifications, useUnreadNotificationCount } from '../api/queries'
import { NotificationsDropdown } from '../components'
import { useResposAuth } from '../hooks'
import type { NotificationType, ResNotification } from '../types'

type FilterTab = 'all' | 'unread' | 'void_request' | 'orders'

const notificationConfig: Record<
  NotificationType,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    bgColor: string
  }
> = {
  void_request: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  order_ready: {
    icon: ChefHat,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  new_order: {
    icon: Receipt,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  void_approved: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  void_rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
}

interface NotificationCardProps {
  notification: ResNotification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  isDeleting,
}: NotificationCardProps) {
  const config = notificationConfig[notification.type]
  const Icon = config?.icon || Bell

  return (
    <motion.div variants={item} layout>
      <Card
        className={`transition-all ${
          !notification.is_read ? 'border-l-4 border-l-blue-500' : ''
        }`}
      >
        <CardContent className='p-4'>
          <div className='flex items-start gap-4'>
            <div
              className={`rounded-full p-2.5 ${config?.bgColor || 'bg-muted'}`}
            >
              <Icon
                className={`h-5 w-5 ${config?.color || 'text-muted-foreground'}`}
              />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='flex items-center gap-2'>
                    <h4 className='font-medium'>{notification.title}</h4>
                    {!notification.is_read && (
                      <Badge variant='secondary' className='text-xs'>
                        New
                      </Badge>
                    )}
                  </div>
                  {notification.message && (
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {notification.message}
                    </p>
                  )}
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}{' '}
                    •{' '}
                    {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>

                <div className='flex shrink-0 items-center gap-1'>
                  {!notification.is_read && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onMarkRead(notification.id)}
                      className='h-8 text-xs'
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-destructive'
                    onClick={() => onDelete(notification.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function NotificationSkeleton() {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex items-start gap-4'>
          <Skeleton className='h-10 w-10 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-1/3' />
            <Skeleton className='h-3 w-2/3' />
            <Skeleton className='h-3 w-1/4' />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationsCenter() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { employee, isLoading: authLoading } = useResposAuth()
  const employeeId = employee?.id || ''

  const { data: notifications, isLoading: notificationsLoading } =
    useNotifications(employeeId)
  const { data: unreadCount } = useUnreadNotificationCount(employeeId)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotification = useDeleteNotification()

  const isLoading = authLoading || notificationsLoading

  // Filter notifications based on active tab
  const filteredNotifications =
    notifications?.filter((n) => {
      switch (activeTab) {
        case 'unread':
          return !n.is_read
        case 'void_request':
          return ['void_request', 'void_approved', 'void_rejected'].includes(
            n.type
          )
        case 'orders':
          return ['new_order', 'order_ready'].includes(n.type)
        default:
          return true
      }
    }) || []

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  const handleMarkAllRead = () => {
    if (employeeId) {
      markAllRead.mutate(employeeId)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteNotification.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <Bell className='h-5 w-5 text-blue-500' />
          <h1 className='text-lg font-semibold'>Notifications</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <NotificationsDropdown />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                Notification Center
              </h2>
              <p className='text-muted-foreground'>
                {unreadCount && unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up!'}
              </p>
            </div>
            {unreadCount && unreadCount > 0 ? (
              <Button
                variant='outline'
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <CheckCircle className='mr-2 h-4 w-4' />
                )}
                Mark all as read
              </Button>
            ) : null}
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as FilterTab)}
          >
            <TabsList>
              <TabsTrigger value='all' className='gap-2'>
                <Filter className='h-4 w-4' />
                All
                {notifications && (
                  <Badge variant='secondary' className='ml-1'>
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='unread' className='gap-2'>
                Unread
                {unreadCount && unreadCount > 0 ? (
                  <Badge variant='destructive' className='ml-1'>
                    {unreadCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value='void_request'>
                <AlertTriangle className='mr-2 h-4 w-4' />
                Void Requests
              </TabsTrigger>
              <TabsTrigger value='orders'>
                <Receipt className='mr-2 h-4 w-4' />
                Orders
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Notifications List */}
          {isLoading ? (
            <div className='space-y-3'>
              {Array.from({ length: 5 }).map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <Bell className='mb-4 h-12 w-12 text-muted-foreground/30' />
                <CardTitle className='mb-1 text-lg'>No notifications</CardTitle>
                <CardDescription>
                  {activeTab === 'all'
                    ? "You don't have any notifications yet"
                    : `No ${activeTab.replace('_', ' ')} notifications`}
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={container}
              initial='hidden'
              animate='show'
              className='space-y-3'
            >
              <AnimatePresence mode='popLayout'>
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    isDeleting={deletingId === notification.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </Main>
    </>
  )
}
