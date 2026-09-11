import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TransferListItem } from '../data/schema'
import { useTransfersContext } from './provider'

export function TransferRowActions({ row }: { row: TransferListItem }) {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useTransfersContext()
  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={() => {
        setCurrentRow(row)
        setOpen('view')
      }}
    >
      <Eye className='me-1 h-4 w-4' />
      {t('common.view', 'View')}
    </Button>
  )
}
