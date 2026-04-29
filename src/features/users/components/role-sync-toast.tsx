import { useEffect, useRef } from 'react'
import { ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useRBACStore } from '../data/store'

export function RoleSyncToast() {
  const notificationVersion = useRBACStore((state) => state.notificationVersion)
  const lastSyncSource = useRBACStore((state) => state.lastSyncSource)
  const firstVersion = useRef(notificationVersion)

  useEffect(() => {
    if (notificationVersion === firstVersion.current) {
      return
    }

    if (lastSyncSource !== 'realtime') {
      return
    }

    toast('Access updated', {
      description:
        'Your roles or permissions changed and were applied to this session.',
      icon: <ShieldCheckIcon className='size-4 text-emerald-500' />,
    })
  }, [lastSyncSource, notificationVersion])

  return null
}
