import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { toast } from 'sonner';
import { syncManager } from '@/lib/sync-manager';

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const previousStatus = useRef(isOnline);

  useEffect(() => {
    if (previousStatus.current !== isOnline) {
      if (!isOnline) {
        toast.error('Bạn đang offline', {
          description: 'Ứng dụng đang hoạt động ở chế độ ngoại tuyến.',
          duration: 5000,
        });
      } else {
        toast.success('Đã có internet', {
          description: 'Đang bắt đầu đồng bộ dữ liệu...',
          duration: 3000,
        });
        // Trigger SyncManager here in Phase 5
        syncManager.sync();
      }
      previousStatus.current = isOnline;
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetworkContext must be used within a NetworkStatusProvider');
  }
  return context;
}
