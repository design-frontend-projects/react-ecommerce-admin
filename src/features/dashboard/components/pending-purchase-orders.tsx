import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from 'react-i18next'
import type { PendingPurchaseOrder } from '../use-dashboard-data'

interface PendingPurchaseOrdersProps {
  data: PendingPurchaseOrder[]
}

export function PendingPurchaseOrders({ data }: PendingPurchaseOrdersProps) {
  const { t } = useTranslation()

  if (!data?.length) {
    return (
      <div className='text-sm text-muted-foreground'>
        {t('dashboard.noPendingPO')}
      </div>
    )
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('dashboard.poNumber')}</TableHead>
            <TableHead>{t('dashboard.supplier')}</TableHead>
            <TableHead>{t('dashboard.date')}</TableHead>
            <TableHead className='text-right'>{t('dashboard.amount')}</TableHead>
            <TableHead>{t('dashboard.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((po) => (
            <TableRow key={po.po_id}>
              <TableCell className='font-medium'>
                {po.po_number || po.po_id}
              </TableCell>
              <TableCell>{po.suppliers?.name || '—'}</TableCell>
              <TableCell>
                {po.order_date
                   ? format(new Date(po.order_date), 'MMM dd, yyyy')
                   : t('dashboard.na')}
              </TableCell>
              <TableCell className='text-right'>
                ${Number(po.total_amount).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant='outline' className='capitalize'>
                  {po.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
