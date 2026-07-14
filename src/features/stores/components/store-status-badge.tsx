import { Badge } from '@/components/ui/badge'

interface StoreStatusBadgeProps {
  status: boolean | null
}

export function StoreStatusBadge({ status }: StoreStatusBadgeProps) {
  if (status === true) {
    return (
      <Badge
        variant='outline'
        className='border-emerald-500 bg-emerald-500/10 text-emerald-500'
      >
        Active
      </Badge>
    )
  }

  return (
    <Badge
      variant='outline'
      className='border-rose-500 bg-rose-500/10 text-rose-500'
    >
      Inactive
    </Badge>
  )
}
