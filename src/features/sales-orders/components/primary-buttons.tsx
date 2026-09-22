import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useOrdersContext } from './provider'

export function OrdersPrimaryButtons() {
  const { t } = useTranslation()
  const { setCurrentRow, setOpen } = useOrdersContext()
  return (
    <div className='flex items-center gap-2'>
      <Button variant='outline' size='sm' asChild className='h-9 text-xs'>
        <Link to='/sales-orders/reports'>
          <FileText className='mr-1.5 h-4 w-4 text-primary' />
          {t('salesOrders.actions.reports', 'Reports')}
        </Link>
      </Button>

      <Can permission='sales.manage'>
        <Button
          size='sm'
          className='h-9 text-xs'
          onClick={() => {
            setCurrentRow(null)
            setOpen('create')
          }}
        >
          <Plus className='me-1 h-4 w-4' />
          {t('salesOrders.actions.newOrder', 'New sales order')}
        </Button>
      </Can>
    </div>
  )
}
