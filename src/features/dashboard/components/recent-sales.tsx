import { format } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTranslation } from 'react-i18next'
import type { RecentSale } from '../use-dashboard-data'

interface RecentSalesProps {
  data: RecentSale[]
}

export function RecentSales({ data }: RecentSalesProps) {
  const { t } = useTranslation()

  if (!data?.length) {
    return (
      <div className='text-sm text-muted-foreground'>
        {t('dashboard.noRecentSales')}
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {data.map((sale) => {
        const itemCount = sale.transaction_details?.length || 0
        const firstItem = sale.transaction_details?.[0]
        const productName =
          firstItem?.products?.name || t('dashboard.unknownProduct')

        return (
          <div key={sale.id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback className='bg-primary/10 text-primary text-xs'>
                {sale.transaction_number?.slice(-2) || 'TX'}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm leading-none font-medium'>
                  {sale.transaction_number}
                </p>
                <p className='text-sm text-muted-foreground'>
                  {productName}
                  {itemCount > 1 && ` +${itemCount - 1} ${t('dashboard.more')}`}
                  {sale.created_at &&
                    ` · ${format(new Date(sale.created_at), 'MMM dd')}`}
                </p>
              </div>
              <div className='font-medium'>
                +${Number(sale.total_amount).toFixed(2)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
