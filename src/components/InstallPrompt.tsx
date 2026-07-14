import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePWA } from '@/context/PWAContext'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const { deferredPrompt, isInstalled, installApp } = usePWA()
  const { t } = useTranslation()

  if (isInstalled || !deferredPrompt) {
    return null
  }

  return (
    <div className='fixed right-0 bottom-0 left-0 z-50 border-t bg-background p-4 shadow-lg sm:right-auto sm:bottom-4 sm:left-4 sm:w-80 sm:rounded-lg sm:border'>
      <div className='flex items-start gap-4'>
        <div className='flex-1'>
          <h3 className='text-sm font-semibold'>{t('installPrompt.title')}</h3>
          <p className='mt-1 text-sm text-muted-foreground'>
            {t('installPrompt.description')}
          </p>
        </div>
        <Button onClick={installApp} type='button' size='sm'>
          <Download className='mr-2 h-4 w-4' />
          {t('installPrompt.button')}
        </Button>
      </div>
    </div>
  )
}
