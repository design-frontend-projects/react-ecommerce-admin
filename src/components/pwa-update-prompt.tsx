import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

export function PwaUpdatePrompt() {
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
      toast.success('App ready to work offline', {
        duration: 5000,
      })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (needRefresh) {
      toast('A new version is available', {
        description: 'Update now to get the latest features.',
        duration: Infinity,
        action: (
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
        ),
        cancel: {
          label: 'Dismiss',
          onClick: () => setNeedRefresh(false),
        },
      })
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
