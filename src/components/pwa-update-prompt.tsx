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
      toast.success('Ứng dụng sẵn sàng hoạt động ngoại tuyến', {
        duration: 5000,
      })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (needRefresh) {
      toast('Có phiên bản mới', {
        description: 'Cập nhật ngay để nhận các tính năng mới nhất.',
        duration: Infinity,
        action: (
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateServiceWorker(true)}
          >
            Tải lại
          </Button>
        ),
        cancel: {
          label: 'Bỏ qua',
          onClick: () => setNeedRefresh(false),
        },
      })
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
