import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useReorderAlerts } from '../hooks/use-reorder-alerts'

export function POReorderAlerts() {
  const { t } = useTranslation()
  const { data: alerts, isLoading } = useReorderAlerts()

  if (isLoading || !alerts || alerts.length === 0) return null

  return (
    <Alert
      variant='destructive'
      className='border-amber-500/40 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200 [&>svg]:text-amber-600'
    >
      <AlertTriangle className='h-4 w-4' />
      <AlertTitle>{t('purchaseOrders.reorderAlerts.title', 'Reorder Alert')}</AlertTitle>
      <AlertDescription>
        <span className='font-medium'>{alerts.length}</span>{' '}
        {t('purchaseOrders.reorderAlerts.itemsBelowReorder', 'item(s) below reorder level:')}
        <ul className='mt-1 list-inside list-disc space-y-0.5 text-sm'>
          {alerts.slice(0, 5).map((a, idx) => (
            <li key={a.id || a.inventory_id || idx}>
              <ShoppingCart className='mr-1 inline-block h-3.5 w-3.5' />
              <strong>{a.products?.name || 'Unknown'}</strong> — {t('purchaseOrders.reorderAlerts.qty', 'Qty:')}
              {' '}{a.quantity} / {t('purchaseOrders.reorderAlerts.reorderLevel', 'Reorder Level:')} {a.reorder_level}
              {a.products?.suppliers?.name && (
                <span className='text-muted-foreground'>
                  {' '}
                  ({t('purchaseOrders.reorderAlerts.supplier', 'Supplier:')} {a.products.suppliers.name})
                </span>
              )}
            </li>
          ))}
          {alerts.length > 5 && (
            <li className='text-muted-foreground'>
              {t('purchaseOrders.reorderAlerts.andMore', '...and {{count}} more', { count: alerts.length - 5 })}
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
