import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Download, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/rbac/Can'
import { useExpireBatches } from '../hooks/use-batches'
import type { BatchListItem } from '../data/schema'

interface BatchesPrimaryButtonsProps {
  onAddBatch?: () => void
  batches?: BatchListItem[]
}

export function BatchesPrimaryButtons({
  onAddBatch,
  batches = [],
}: BatchesPrimaryButtonsProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const expireBatches = useExpireBatches()

  const handleExportCsv = () => {
    if (!batches.length) return

    const headers = [
      'Batch Number',
      'SKU',
      'Product Name',
      'Supplier',
      'Manufacture Date',
      'Expiry Date',
      'Unit Cost',
      'On Hand',
      'Reserved',
      'Available',
      'Total Value',
      'Status',
      'Reference Type',
      'Reference ID',
    ]

    const rows = batches.map((b) => [
      `"${b.batch_number}"`,
      `"${b.product_variants?.sku || ''}"`,
      `"${(b.product_variants?.products?.name || b.product_variants?.name || '').replace(/"/g, '""')}"`,
      `"${(b.suppliers?.name || '').replace(/"/g, '""')}"`,
      `"${b.manufacture_date || ''}"`,
      `"${b.expiry_date || ''}"`,
      b.unit_cost,
      b.qty_on_hand,
      b.qty_reserved,
      b.qty_available,
      b.total_value,
      `"${b.status}"`,
      `"${b.received_reference_type || ''}"`,
      `"${b.received_reference_id || ''}"`,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `inventory_batches_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        variant='outline'
        size='sm'
        onClick={handleExportCsv}
        disabled={!batches.length}
        className='gap-1.5'
      >
        <Download className='h-4 w-4' />
        {t('batches.exportCsv', 'Export CSV')}
      </Button>

      <Can permission='inventory.manage'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setConfirmOpen(true)}
          disabled={expireBatches.isPending}
          className='gap-1.5'
        >
          <CalendarClock className='h-4 w-4 text-amber-600 dark:text-amber-400' />
          {t('batches.sweep.button', 'Run Expiry Sweep')}
        </Button>

        {onAddBatch ? (
          <Button size='sm' onClick={onAddBatch} className='gap-1.5'>
            <Plus className='h-4 w-4' />
            {t('batches.addBatch', 'Add Batch')}
          </Button>
        ) : null}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('batches.sweep.dialogTitle', 'Run Expiry Sweep?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  'batches.sweep.dialogDescription',
                  'Every active batch whose expiry date has passed will be marked as expired. This update is logged in audit records and does not change on-hand quantities.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('batches.sweep.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  expireBatches.mutate()
                  setConfirmOpen(false)
                }}
              >
                {t('batches.sweep.confirm', 'Run Sweep')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Can>
    </div>
  )
}
