import React from 'react'
import { useNetworkContext } from '@/context/network-status-provider'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

export const OfflineBadge: React.FC = () => {
  const { isOnline } = useNetworkContext()

  if (isOnline) return null

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-9999 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border animate-in fade-in slide-in-from-bottom-4 duration-300",
      "bg-destructive text-destructive-foreground border-destructive/20"
    )}>
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Bạn đang Offline - Đơn hàng sẽ được lưu tạm</span>
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
    <div className={cn(
      "fixed bottom-4 right-4 z-9999 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border animate-in fade-in slide-in-from-bottom-4 duration-300",
      "bg-green-500 text-white border-green-600"
    )}>
      <Wifi className="w-4 h-4" />
      <span className="text-sm font-medium">Đã kết nối lại - Đang đồng bộ...</span>
    </div>
  )
}
