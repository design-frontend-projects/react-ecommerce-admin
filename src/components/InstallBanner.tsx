import { useState } from 'react'
import { X, Share } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePWA } from '@/context/PWAContext'

export function InstallBanner() {
  const { t } = useTranslation()
  const { isInstalled } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [initiallyShow] = useState(() => {
    if (typeof window === 'undefined') return false
    const isIos = /iphone|ipad|ipod/.test(
      window.navigator.userAgent.toLowerCase()
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone =
      'standalone' in window.navigator && !!(window.navigator as any).standalone
    return isIos && !isStandalone
  })

  if (isInstalled || !initiallyShow || dismissed) {
    return null
  }

  return (
    <div className='fixed top-0 right-0 left-0 z-50 border-b bg-primary/10 p-4 sm:hidden'>
      <div className='flex items-center justify-between'>
        <div className='flex-1 text-sm text-primary'>
          {t('installBanner.title')}{' '}
          <Share className='mx-1 inline-block h-4 w-4' /> {t('installBanner.andSelect')}{' '}
          <strong>{t('installBanner.addToHomeScreen')}</strong>
        </div>
        <button className='p-2' onClick={() => setDismissed(true)}>
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

