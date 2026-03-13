import React from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNetworkContext } from '@/context/network-status-provider'

export const OfflineBadge: React.FC = () => {
  const { isOnline } = useNetworkContext()

  if (isOnline) return null

  return (
    <div
      className={cn(
        'fixed right-4 bottom-4 z-9999 flex animate-in items-center gap-2 rounded-full border px-4 py-2 shadow-lg duration-300 fade-in slide-in-from-bottom-4',
        'text-destructive-foreground border-destructive/20 bg-destructive'
      )}
    >
      <WifiOff className='h-4 w-4' />
      <span className='text-sm font-medium'>
        Bạn đang Offline - Đơn hàng sẽ được lưu tạm
      </span>
    </div>
  )
}

export const OnlineBadge: React.FC = () => {
  const { isOnline } = useNetworkContext()
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    if (isOnline) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!show || !isOnline) return null

  return (
    <div
      className={cn(
        'fixed right-4 bottom-4 z-9999 flex animate-in items-center gap-2 rounded-full border px-4 py-2 shadow-lg duration-300 fade-in slide-in-from-bottom-4',
        'border-green-600 bg-green-500 text-white'
      )}
    >
      <Wifi className='h-4 w-4' />
      <span className='text-sm font-medium'>Reconnected - Syncing...</span>
    </div>
  )
}
