import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Can } from '@/components/rbac/Can'
import { useCategoriesContext } from './categories-provider'

export function CategoriesPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = useCategoriesContext()

  return (
    <div className='flex gap-2'>
      <Can permission='products.manage'>
        <Button onClick={() => setOpen('create')} className='space-x-1'>
          <span>{t('categories.createCategory')}</span> <Plus size={18} />
        </Button>
      </Can>
    </div>
  )
}
