import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

export function PwaUpdatePrompt() {
  const { t } = useTranslation('common')
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line no-console
      console.log('SW Registered: ', r)
    },
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('SW registration error', error)
    },
  })

  useEffect(() => {
    if (offlineReady) {
      toast.success(t('pwa.offlineReady', 'Offline mode is ready to use.'), {
        duration: 5000,
      })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, t])

  useEffect(() => {
    if (needRefresh) {
      toast(t('pwa.newVersion', 'New version available'), {
        description: t(
          'pwa.newVersionDesc',
          'Update now to get the latest features.'
        ),
        duration: Infinity,
        action: (
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateServiceWorker(true)}
          >
            {t('pwa.reload', 'Reload')}
          </Button>
        ),
        cancel: {
          label: t('pwa.ignore', 'Ignore'),
          onClick: () => setNeedRefresh(false),
        },
      })
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker, t])

  return null
}
