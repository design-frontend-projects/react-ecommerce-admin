import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useTransfersContext } from './provider'

export function TransfersPrimaryButtons() {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useTransfersContext()
  return (
    <Can permission={['inventory.stock.manage', 'inventory.manage']}>
      <Button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
        className="gap-1.5"
      >
        <Plus className='h-4 w-4' />
        {t('stockTransfers.createTransfer', { defaultValue: 'New Transfer' })}
      </Button>
    </Can>
  )
}

