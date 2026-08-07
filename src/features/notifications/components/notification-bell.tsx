import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Send,
  Loader2,
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
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { has } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    isMarkingRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useUserNotifications()

  // Check if user is admin or super_admin
  const isAdmin =
    has({ role: UserRole.Admin }) ||
    has({ role: UserRole.SuperAdmin }) ||
    has({ permission: 'general.notifications.manage' })

  const renderSeverityBadge = (severity?: string) => {
    switch (severity) {
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
          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-md animate-pulse'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        className='w-80 sm:w-96 p-0 shadow-xl border-border/60 backdrop-blur-md'
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-border/40 bg-muted/20'>
          <div className='flex items-center gap-2'>
            <h4 className='font-semibold text-sm'>Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant='secondary' className='h-5 px-2 text-xs font-semibold'>
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button
            variant='ghost'
            size='sm'
            disabled={unreadCount === 0 || isMarkingAllRead}
            onClick={() => markAllAsRead()}
            className='h-8 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1'
          >
            {isMarkingAllRead ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <CheckCheck className='h-3.5 w-3.5' />
            )}
            Mark all read
          </Button>
        </div>

        {/* Notifications List */}
        <ScrollArea className='h-[360px] p-2'>
          {isLoading ? (
            <div className='flex h-40 items-center justify-center text-muted-foreground text-sm gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col h-40 items-center justify-center text-center p-4 text-muted-foreground'>
              <Bell className='h-8 w-8 mb-2 stroke-[1.5] text-muted-foreground/40' />
              <p className='text-sm font-medium'>No notifications yet</p>
              <p className='text-xs text-muted-foreground/70'>You are all caught up!</p>
            </div>
          ) : (
            <div className='space-y-1.5'>
              {notifications.map((item) => {
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
                          <span className='h-2 w-2 rounded-full bg-primary shrink-0' />
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
                        {notif?.content || ''}
                      </p>
                    </div>

                    {!item.is_read && (
                      <div className='flex justify-end mt-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={isMarkingRead}
                          onClick={() => markAsRead(item.id)}
                          className='h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/10 flex items-center gap-1'
                        >
                          <Check className='h-3 w-3' />
                          Mark read
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Admin Link Footer */}
        {isAdmin && (
          <>
            <Separator />
            <div className='p-2 bg-muted/10'>
              <Link
                to='/notifications'
                onClick={() => setIsOpen(false)}
                className='w-full'
              >
                <Button
                  variant='default'
                  size='sm'
                  className='w-full text-xs font-semibold flex items-center justify-center gap-2 h-9 shadow-sm'
                >
                  <Send className='h-3.5 w-3.5' />
                  Notification Management & Sender
                </Button>
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
