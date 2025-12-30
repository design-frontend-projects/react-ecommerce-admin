import { format } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface RecentRefundsProps {
  data: any[]
}

export function RecentRefunds({ data }: RecentRefundsProps) {
  if (!data?.length) {
    return (
      <div className='text-sm text-muted-foreground'>
        No recent refunds found.
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {data.map((refund) => (
        <div key={refund.refund_id} className='flex items-center gap-4'>
          <Avatar className='h-9 w-9'>
            {/* You might want a specific icon for refunds, or just initials */}
            <AvatarFallback>-</AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>
                Refund #{refund.refund_id}
              </p>
              <p className='text-sm text-muted-foreground'>
                {format(new Date(refund.refund_date), 'MMM dd, yyyy')}
              </p>
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
