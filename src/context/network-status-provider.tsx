import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useNetworkStatus } from '@/hooks/use-network-status'

interface NetworkContextType {
  isOnline: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkStatusProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation('common')
  const { isOnline } = useNetworkStatus()
  const previousStatus = useRef(isOnline)

  useEffect(() => {
    if (previousStatus.current !== isOnline) {
      if (!isOnline) {
        toast.error(t('network.offlineStatus', 'Bạn đang offline'), {
          description: t(
            'network.offlineStatusDesc',
            'The app is running in offline mode.'
          ),
          duration: 5000,
        })
      } else {
        toast.success(t('network.onlineStatus', 'Internet restored'), {
          description: t('network.onlineStatusDesc', 'Kế nối internet đã được khôi phục'),
          duration: 3000,
        })
      }
      previousStatus.current = isOnline
    }
  }, [isOnline, t])

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
