import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useWarehousesContext } from './provider'

export function WarehousesPrimaryButtons() {
  const { t } = useTranslation()
  const { openCreate } = useWarehousesContext()

  return (
    <div className='flex items-center gap-2'>
      <Can permission='inventory.manage'>
        <Button onClick={openCreate} className='shadow-xs'>
          <Plus className='me-1.5 h-4 w-4' />
          {t('warehouses.addWarehouse', 'New Warehouse')}
        </Button>
      </Can>
    </div>
  )
}

