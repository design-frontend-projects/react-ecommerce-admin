import { usePWA } from '@/context/PWAContext';
import { WifiOff, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storageManager } from '@/lib/storage-manager';

export function NetworkStatus() {
  const { isOnline } = usePWA();
  const [isNearLimit, setIsNearLimit] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const quota = await storageManager.checkQuota();
      if (quota) {
        setIsNearLimit(quota.isNearLimit);
      }
    };

    // Check on mount and periodically
    checkStorage();
    const intervalId = setInterval(checkStorage, 5 * 60 * 1000); // Check every 5 mins
    return () => clearInterval(intervalId);
  }, []);

  if (isOnline && !isNearLimit) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-5">
          <WifiOff className="h-4 w-4" />
          <span>Ngoại tuyến (Offline Mode)</span>
        </div>
      )}
      {isNearLimit && (
        <div className="flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg animate-in slide-in-from-bottom-5">
          <Database className="h-4 w-4" />
          <span>Bộ nhớ thiết bị sắp đầy!</span>
        </div>
      )}
    </div>
  );
}
