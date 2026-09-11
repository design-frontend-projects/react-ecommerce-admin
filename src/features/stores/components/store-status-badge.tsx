import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

interface StoreStatusBadgeProps {
  status: boolean | null
}

export function StoreStatusBadge({ status }: StoreStatusBadgeProps) {
  const { t } = useTranslation()

  if (status === true) {
    return (
      <Badge
        variant='outline'
        className='border-emerald-500 bg-emerald-500/10 text-emerald-500'
      >
        {t('stores.status.active', 'Active')}
      </Badge>
    )
  }

  return (
    <Badge
      variant='outline'
      className='border-rose-500 bg-rose-500/10 text-rose-500'
    >
      {t('stores.status.inactive', 'Inactive')}
    </Badge>
  )
}
