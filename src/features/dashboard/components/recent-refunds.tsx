import { format } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { RecentRefund } from '../use-dashboard-data'

interface RecentRefundsProps {
  data: RecentRefund[]
}

export function RecentRefunds({ data }: RecentRefundsProps) {
  if (!data?.length) {
    return (
      <div className='text-sm text-muted-foreground'>
        No recent refunds found.
      </div>
    )
  }

  const statusVariant = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'default' as const
      case 'rejected':
        return 'destructive' as const
      case 'waiting_manager':
      case 'waiting_review':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <div className='space-y-8'>
      {data.map((refund) => (
        <div
          key={String(refund.refund_id)}
          className='flex items-center gap-4'
        >
          <Avatar className='h-9 w-9'>
            <AvatarFallback className='bg-red-100 text-red-600 text-xs dark:bg-red-900/30 dark:text-red-400'>
              RF
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>
                Refund #{String(refund.refund_id)}
              </p>
              <div className='flex items-center gap-2'>
                <p className='text-sm text-muted-foreground'>
                  {refund.refund_date
                    ? format(new Date(refund.refund_date), 'MMM dd, yyyy')
                    : 'N/A'}
                </p>
                {refund.refund_status && (
                  <Badge
                    variant={statusVariant(refund.refund_status)}
                    className='text-[10px] px-1.5 py-0'
                  >
                    {refund.refund_status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              {refund.reason && (
                <p className='text-xs text-muted-foreground truncate max-w-[200px]'>
                  {refund.reason}
                </p>
              )}
            </div>
            <div className='font-medium text-red-500'>
              -${Number(refund.refund_amount).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
