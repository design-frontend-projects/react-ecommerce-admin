import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Radio,
  Loader2,
  Inbox,
} from 'lucide-react'
import { useUserNotifications } from '../hooks/use-notifications'
import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/types/user-role.enum'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const { has } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    isMarkingRead,
    markAllAsRead,
    isMarkingAllRead,
    isConnected,
    transport,
  } = useUserNotifications()

  const isAdmin =
    has({ role: UserRole.Admin }) ||
    has({ role: UserRole.SuperAdmin }) ||
    has({ permission: 'general.notifications.manage' })

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') return !item.is_read
    return true
  })

  const renderSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <Badge className='flex items-center gap-1 border-red-500 bg-red-600 text-white dark:bg-red-700 text-[10px] uppercase animate-pulse shadow-sm'>
            <AlertOctagon className='h-3 w-3' />
            Critical
          </Badge>
        )
      case 'ERROR':
        return (
          <Badge variant='destructive' className='flex items-center gap-1 text-[10px] uppercase'>
            <AlertOctagon className='h-3 w-3' />
            Error
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge variant='outline' className='flex items-center gap-1 border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] uppercase'>
            <AlertTriangle className='h-3 w-3' />
            Warning
          </Badge>
        )
      case 'SUCCESS':
        return (
          <Badge variant='outline' className='flex items-center gap-1 border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] uppercase'>
            <CheckCircle2 className='h-3 w-3' />
            Success
          </Badge>
        )
      case 'INFO':
      default:
        return (
          <Badge variant='secondary' className='flex items-center gap-1 text-[10px] uppercase'>
            <Info className='h-3 w-3' />
            Info
          </Badge>
        )
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-full transition-colors hover:bg-accent'
          aria-label='Notifications'
        >
          <Bell className='h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground' />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key='badge'
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-md'
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        className='w-80 sm:w-96 p-0 shadow-2xl border-border/80 backdrop-blur-xl bg-background/95'
      >
        {/* Header */}
        <div className='flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/30'>
          <div className='flex items-center gap-2'>
            <h4 className='font-semibold text-sm'>Notifications</h4>
            {/* Live WebSocket connection indicator */}
            <div
              className='flex items-center gap-1 text-[10px] font-medium text-muted-foreground'
              title={isConnected ? `Real-time WebSocket connected (${transport})` : 'Polling fallback active'}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                )}
              />
              <span className='hidden sm:inline'>{isConnected ? 'Live' : 'Syncing'}</span>
            </div>
          </div>
          <Button
            variant='ghost'
            size='sm'
            disabled={unreadCount === 0 || isMarkingAllRead}
            onClick={() => markAllAsRead()}
            className='h-7 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-2'
          >
            {isMarkingAllRead ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <CheckCheck className='h-3.5 w-3.5' />
            )}
            Mark all read
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className='px-3 pt-2 pb-1 bg-muted/10 border-b border-border/40'>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
            <TabsList className='grid w-full grid-cols-2 h-7'>
              <TabsTrigger value='all' className='text-xs'>
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value='unread' className='text-xs'>
                Unread ({unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <ScrollArea className='h-[360px] p-2'>
          {isLoading ? (
            <div className='flex h-40 items-center justify-center text-muted-foreground text-sm gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className='flex flex-col h-40 items-center justify-center text-center p-4 text-muted-foreground'>
              <Inbox className='h-8 w-8 mb-2 stroke-[1.5] text-muted-foreground/40' />
              <p className='text-sm font-medium'>
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className='text-xs text-muted-foreground/70'>You are all caught up!</p>
            </div>
          ) : (
            <div className='space-y-1.5'>
              {filteredNotifications.map((item) => {
                const notif = item.notifications
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative flex flex-col gap-1.5 rounded-lg p-3 transition-all duration-150 border',
                      item.is_read
                        ? 'bg-background/50 border-transparent hover:bg-accent/40'
                        : 'bg-accent/30 border-primary/20 shadow-sm hover:bg-accent/60'
                    )}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='flex items-center gap-2 overflow-hidden'>
                        {!item.is_read && (
                          <span className='h-2 w-2 rounded-full bg-primary shrink-0 animate-ping' />
                        )}
                        {renderSeverityBadge(notif?.severity)}
                      </div>
                      <span className='text-[10px] text-muted-foreground shrink-0'>
                        {notif?.created_at
                          ? new Date(notif.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    <div>
                      <h5
                        className={cn(
                          'text-xs font-semibold leading-tight line-clamp-1',
                          !item.is_read && 'text-foreground font-bold'
                        )}
                      >
                        {notif?.title || 'Notification'}
                      </h5>
                      <p className='text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed'>
                        {notif?.message || notif?.content || ''}
                      </p>
                    </div>

                    {/* Action button if notification has action URL */}
                    <div className='flex items-center justify-between mt-1 pt-1 border-t border-border/30'>
                      {notif?.action_url ? (
                        <Link
                          to={notif.action_url}
                          onClick={() => {
                            if (!item.is_read) markAsRead(item.id)
                            setIsOpen(false)
                          }}
                          className='text-[11px] font-medium text-primary hover:underline flex items-center gap-1'
                        >
                          <ExternalLink className='h-3 w-3' />
                          {notif.action_label || 'View'}
                        </Link>
                      ) : (
                        <span />
                      )}

                      {!item.is_read && (
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={isMarkingRead}
                          onClick={() => markAsRead(item.id)}
                          className='h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10 flex items-center gap-1 ml-auto'
                        >
                          <Check className='h-3 w-3' />
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer Navigation */}
        <Separator />
        <div className='p-2 bg-muted/15 flex items-center justify-between gap-2'>
          <Link
            to='/notifications'
            onClick={() => setIsOpen(false)}
            className='w-full'
          >
            <Button
              variant='outline'
              size='sm'
              className='w-full text-xs font-semibold flex items-center justify-center gap-2 h-8 shadow-sm hover:bg-accent'
            >
              {isAdmin ? (
                <>
                  <Radio className='h-3.5 w-3.5 text-primary' />
                  Notification Center & Admin Console
                </>
              ) : (
                <>
                  <Bell className='h-3.5 w-3.5' />
                  View All Notifications
                </>
              )}
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
