import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePromotionsContext } from './promotions-provider'

export function PromotionsPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = usePromotionsContext()

  return (
    <div className='flex gap-2'>
      <Can permission='sales.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>{t('promotions.create', { defaultValue: 'Create Promotion' })}</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
