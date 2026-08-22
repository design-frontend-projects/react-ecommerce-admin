import { useTranslation } from 'react-i18next'
import { PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useProductWizardStore } from '../context/product-wizard-store'

export function ProductsPrimaryButtons() {
  const { t } = useTranslation()
  const { setIsOpen } = useProductWizardStore()
  return (
    <div className='flex gap-2'>
      <Can permission='products.manage'>
        <Button className='space-x-1' onClick={() => setIsOpen(true)}>
          <span>{t('products.addProduct')}</span> <PackagePlus size={18} />
        </Button>
      </Can>
    </div>
  )
}

