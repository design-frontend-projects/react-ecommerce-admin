// Notifications Dropdown Component
// Bell icon with unread badge and dropdown notification list
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChefHat,
  Loader2,
  Receipt,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../api/mutations'
import { useNotifications, useUnreadNotificationCount } from '../api/queries'
import { useResposAuth } from '../hooks'
import type { NotificationType, ResNotification } from '../types'

const notificationConfig: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  void_request: { icon: AlertTriangle, color: 'text-orange-500' },
  order_ready: { icon: ChefHat, color: 'text-green-500' },
  new_order: { icon: Receipt, color: 'text-blue-500' },
  void_approved: { icon: CheckCircle, color: 'text-green-500' },
  void_rejected: { icon: XCircle, color: 'text-red-500' },
}

interface NotificationItemProps {
  notification: ResNotification
  onMarkRead: (id: string) => void
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const config = notificationConfig[notification.type]
  const Icon = config?.icon || Bell

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      type='button'
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      className={`flex w-full items-start gap-4 p-4 text-left transition-all hover:bg-muted/50 ${
        !notification.is_read ? 'bg-muted/30' : ''
      }`}
    >
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config?.color || 'text-muted-foreground'} bg-background shadow-sm ring-1 ring-border/50`}
      >
        <Icon className='h-4.5 w-4.5' />
      </div>
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex items-center justify-between gap-2'>
          <p className='truncate text-sm font-semibold tracking-tight'>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className='h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse' />
          )}
        </div>
        {notification.message && (
          <p className='line-clamp-2 text-xs text-muted-foreground leading-relaxed'>
            {notification.message}
          </p>
        )}
        <p className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60'>
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </motion.button>
  )
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const { employee, isLoading: authLoading } = useResposAuth()
  const employeeId = employee?.id || ''

  const { data: notifications, isLoading: notificationsLoading } =
    useNotifications(employeeId)
  const { data: unreadCount } = useUnreadNotificationCount(employeeId)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const isLoading = authLoading || notificationsLoading
  const displayNotifications = notifications?.slice(0, 5) || []

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  const handleMarkAllRead = () => {
    if (employeeId) {
      markAllRead.mutate(employeeId)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative'
          aria-label='Notifications'
        >
          <Bell className='h-5 w-5' />
          {unreadCount && unreadCount > 0 ? (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-5 min-w-5 animate-pulse px-1 text-xs'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='end'>
        <div className='flex items-center justify-between border-b p-3'>
          <h4 className='font-semibold'>Notifications</h4>
          {unreadCount && unreadCount > 0 ? (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className='max-h-80'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <Bell className='mb-2 h-8 w-8 text-muted-foreground/50' />
              <p className='text-sm text-muted-foreground'>
                No notifications yet
              </p>
            </div>
          ) : (
            <div className='divide-y divide-border/50'>
              <AnimatePresence mode='popLayout'>
                {displayNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className='p-2'>
          <Button
            variant='ghost'
            size='sm'
            className='w-full text-xs'
            asChild
            onClick={() => setOpen(false)}
          >
            <Link to='/respos/notifications'>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
