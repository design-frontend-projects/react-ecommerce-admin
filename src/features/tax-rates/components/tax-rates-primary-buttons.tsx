import { useTranslation } from 'react-i18next'
import { Plus, Calculator, Download, FileSpreadsheet, FileJson } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/components/rbac/Can'
import { useTaxRates } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

export function TaxPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen, filters } = useTaxContext()
  const { data: taxRates = [] } = useTaxRates(filters)

  const exportToCsv = () => {
    if (taxRates.length === 0) {
      toast.error(
        t('taxRates.buttons.noRatesToExport', {
          defaultValue: 'No tax rates to export',
        })
      )
      return
    }

    const headers = [
      'ID',
      'Tax Type',
      'Rate (%)',
      'Country',
      'Country Code',
      'Mode',
      'Effective From',
      'Effective To',
      'Active',
      'Description',
    ]

    const rows = taxRates.map((r) => [
      r.id,
      `"${r.tax_type.replace(/"/g, '""')}"`,
      r.rate,
      `"${r.countries?.name || ''}"`,
      r.countries?.code || '',
      r.is_inclusive ? 'Inclusive' : 'Exclusive',
      r.effective_from,
      r.effective_to || '',
      r.is_active ? 'Yes' : 'No',
      `"${(r.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tax_rates_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(
      t('taxRates.buttons.exportSuccess', {
        count: taxRates.length,
        format: 'CSV',
        defaultValue: `Exported ${taxRates.length} tax rates to CSV`,
      })
    )
  }

  const exportToJson = () => {
    if (taxRates.length === 0) {
      toast.error(
        t('taxRates.buttons.noRatesToExport', {
          defaultValue: 'No tax rates to export',
        })
      )
      return
    }

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(taxRates, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `tax_rates_${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(
      t('taxRates.buttons.exportSuccess', {
        count: taxRates.length,
        format: 'JSON',
        defaultValue: `Exported ${taxRates.length} tax rates to JSON`,
      })
    )
  }

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <Button
        variant='outline'
        className='gap-1.5'
        onClick={() => setOpen('calculator')}
      >
        <Calculator className='h-4 w-4 text-primary' />
        <span>
          {t('taxRates.buttons.simulator', { defaultValue: 'Tax Simulator' })}
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' className='gap-1.5'>
            <Download className='h-4 w-4' />
            <span>{t('taxRates.buttons.export', { defaultValue: 'Export' })}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={exportToCsv}>
            <FileSpreadsheet className='mr-2 h-4 w-4' />
            {t('taxRates.buttons.exportCsv', { defaultValue: 'Export CSV' })}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJson}>
            <FileJson className='mr-2 h-4 w-4' />
            {t('taxRates.buttons.exportJson', { defaultValue: 'Export JSON' })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Can permission='settings.manage'>
        <Button className='gap-1.5' onClick={() => setOpen('create')}>
          <Plus className='h-4 w-4' />
          <span>{t('taxRates.addTaxRate', { defaultValue: 'Add Tax Rate' })}</span>
        </Button>
      </Can>
    </div>
  )
}
