import { useTranslation } from 'react-i18next'
import { Eye, Printer, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OrderListItem } from '../data/schema'
import { useOrdersContext } from './provider'

export function OrderRowActions({ row }: { row: OrderListItem }) {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useOrdersContext()

  return (
    <div className='flex items-center gap-1 justify-end'>
      {/* Edit Draft Order Button */}
      {row.status === 'draft' && (
        <Button
          variant='ghost'
          size='sm'
          className='h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground'
          title={t('salesOrders.actions.edit', 'Edit Draft')}
          onClick={() => {
            setCurrentRow(row)
            setOpen('edit')
          }}
        >
          <Edit className='mr-1 h-3.5 w-3.5' />
          {t('salesOrders.actions.edit', 'Edit')}
        </Button>
      )}

      {/* Quick Review & Print Button */}
      <Button
        variant='outline'
        size='sm'
        className='h-8 text-xs px-2.5'
        title={t('salesOrders.actions.reviewAndPrint', 'Review Order & Print')}
        onClick={() => {
          setCurrentRow(row)
          setOpen('review')
        }}
      >
        <Printer className='mr-1 h-3.5 w-3.5 text-primary' />
        {t('salesOrders.actions.print', 'Print')}
      </Button>

      {/* View Workflow & Actions */}
      <Button
        variant='ghost'
        size='sm'
        className='h-8 text-xs px-2.5'
        title={t('salesOrders.actions.viewWorkflow', 'View Status Workflow')}
        onClick={() => {
          setCurrentRow(row)
          setOpen('view')
        }}
      >
        <Eye className='mr-1 h-3.5 w-3.5 text-muted-foreground' />
        {t('salesOrders.actions.workflow', 'Workflow')}
      </Button>
    </div>
  )
}
