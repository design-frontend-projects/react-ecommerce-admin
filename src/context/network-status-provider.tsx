import React, { createContext, useContext, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { runSyncThenWipe } from '@/lib/sync/reconnect'
import { rehydratePendingOrders } from '@/lib/sync/outbox'

interface NetworkContextType {
  isOnline: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkStatusProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isOnline } = useNetworkStatus()
  const previousStatus = useRef(isOnline)

  // On mount: rebuild the reactive pending-orders view from the durable outbox,
  // and if we're already online, attempt a sync-and-wipe for anything queued
  // from a previous offline session.
  useEffect(() => {
    void rehydratePendingOrders()
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void runSyncThenWipe()
    }

    // The service worker fires a background-sync 'sync' event and posts
    // SYNC_ORDERS; funnel that into the SAME single reconnect entrypoint.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SYNC_ORDERS') {
          void runSyncThenWipe()
        }
      }
      navigator.serviceWorker.addEventListener('message', onMessage)
      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage)
      }
    }
  }, [])

  useEffect(() => {
    if (previousStatus.current !== isOnline) {
      if (!isOnline) {
        toast.error('Bạn đang offline', {
          description: 'Ứng dụng đang hoạt động ở chế độ ngoại tuyến.',
          duration: 5000,
        })
      } else {
        toast.success('Đã có internet', {
          description: 'Đang bắt đầu đồng bộ dữ liệu...',
          duration: 3000,
        })
        // Single reconnect entrypoint: drain the outbox, then (if clean) wipe
        // local data and refresh server state.
        void runSyncThenWipe()
      }
      previousStatus.current = isOnline
    }
  }, [isOnline])

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetworkContext() {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error(
      'useNetworkContext must be used within a NetworkStatusProvider'
    )
  }
  return context
}
