import { usePWA } from '@/context/PWAContext';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstallPrompt() {
  const { deferredPrompt, isInstalled, installApp } = usePWA();

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:w-80 sm:rounded-lg sm:border">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Tải ứng dụng</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cài đặt ứng dụng để có trải nghiệm tốt nhất và sử dụng khi không có mạng.
          </p>
        </div>
        <Button onClick={installApp} type="button" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Cài đặt
        </Button>
      </div>
    </div>
  );
}
