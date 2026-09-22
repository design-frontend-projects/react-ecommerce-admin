import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { UserRole } from '@/types/user-role.enum'
import { Bell, Loader2 } from 'lucide-react'
import { useAuth, useUser } from '@/hooks/use-auth'
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
  useAdminPendingReorderCount,
  useAdminPendingReorderRequests,
  useMarkPosReorderRequestRead,
  usePosReorderRealtime,
} from '../hooks/use-pos-reorder-requests'
import { parseDimensionsLabel } from '../utils'

function getVariantLabel(
  variant: { sku: string; dimensions?: string | null } | null | undefined,
  t: (key: string, defaultValue?: string) => string
) {
  if (!variant) return t('pos.notifications.baseProduct', 'Base product')
  return parseDimensionsLabel(variant.dimensions) || variant.sku
}

export function ReorderNotificationsBell() {
  const { t } = useTranslation()
  const { isSignedIn, isLoaded, has } = useAuth()
  const { user } = useUser()

  const canViewReorderInbox =
    isLoaded &&
    isSignedIn &&
    (has({ role: UserRole.Admin }) || has({ role: UserRole.SuperAdmin }))

  usePosReorderRealtime({ enabled: canViewReorderInbox })

  const { data: pendingRequests = [], isLoading } =
    useAdminPendingReorderRequests(canViewReorderInbox)
  const { data: pendingCount = 0 } =
    useAdminPendingReorderCount(canViewReorderInbox)
  const markReadMutation = useMarkPosReorderRequestRead()

  if (!canViewReorderInbox) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative'
          aria-label={t('pos.notifications.ariaLabel', 'Reorder notifications')}
        >
          <Bell className='h-5 w-5' />
          {pendingCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs'
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <div className='flex items-center justify-between border-b p-3'>
          <h4 className='font-semibold'>{t('pos.notifications.reorderRequests', 'Reorder Requests')}</h4>
          <Badge variant='secondary'>{pendingCount}</Badge>
        </div>

        <ScrollArea className='max-h-96'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              {t('pos.notifications.noPendingRequests', 'No pending reorder requests')}
            </div>
          ) : (
            <div className='divide-y divide-border/50'>
              {pendingRequests.map((request: any) => (
                <div key={request.id} className='space-y-2 p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='line-clamp-1 text-sm font-semibold'>
                      {request.products?.name || t('pos.notifications.unknownProduct', 'Unknown Product')}
                    </p>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={markReadMutation.isPending}
                      onClick={() => {
                        if (!user?.id) return
                        markReadMutation.mutate({
                          requestId: request.id,
                          readByAuthUserId: user.id,
                        })
                      }}
                    >
                      {t('pos.notifications.markAsRead', 'Mark read')}
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {t('pos.notifications.variant', 'Variant')}: {getVariantLabel(request.product_variants, t)}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('pos.notifications.qty', 'Qty')}: {request.requested_quantity ?? 0} | {t('pos.notifications.min', 'Min')}:{' '}
                    {request.requested_min_stock ?? 0}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('pos.notifications.requestedBy', 'Requested by {{name}}', { name: request.requested_by_name })}
                    {request.requested_by_role
                      ? ` (${request.requested_by_role})`
                      : ''}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {formatDistanceToNow(new Date(request.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
      </PopoverContent>
    </Popover>
  )
}
