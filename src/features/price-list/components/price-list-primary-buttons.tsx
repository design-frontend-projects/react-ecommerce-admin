import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { usePriceListContext } from './price-list-provider'

export function PriceListPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = usePriceListContext()

  return (
    <div className='flex gap-2'>
      <Can permission='sales.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>{t('priceList.addPriceList', { defaultValue: 'Add Price List' })}</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
