import { usePWA } from '@/context/PWAContext';
import { X, Share } from 'lucide-react';
import { useState } from 'react';

export function InstallBanner() {
  const { isInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [initiallyShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = ('standalone' in window.navigator) && !!(window.navigator as any).standalone;
    return isIos && !isStandalone;
  });

  if (isInstalled || !initiallyShow || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 border-b p-4 sm:hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-primary">
          Cài đặt ứng dụng: Nhấn <Share className="mx-1 inline-block h-4 w-4" /> và chọn <strong>Add to Home Screen</strong>
        </div>
        <button className="p-2" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
