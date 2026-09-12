import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePOContext } from './po-provider'

export function POPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = usePOContext()

  return (
    <Can permission='purchasing.manage'>
      <Button onClick={() => setOpen('create')} className='space-x-1'>
        <Plus className='h-4 w-4' />
        <span>{t('purchaseOrders.createOrder', 'Create Purchase Order')}</span>
      </Button>
    </Can>
  )
}
