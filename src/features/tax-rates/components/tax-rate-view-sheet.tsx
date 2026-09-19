import { useTranslation } from 'react-i18next'
import {
  Copy,
  Calendar,
  Globe2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calculator,
  Edit,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getTaxRateValidity, calculateTax, formatTaxRate } from '../utils/tax-math'
import { useTaxContext } from './tax-rates-provider'

export function TaxRateViewSheet() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useTaxContext()

  if (!currentRow) return null

  const validity = getTaxRateValidity(
    currentRow.effective_from,
    currentRow.effective_to
  )

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(
      t('taxRates.notifications.copied', {
        label,
        defaultValue: `${label} copied to clipboard`,
      })
    )
  }

  // Pre-calculated sample tiers
  const sampleAmounts = [50, 100, 250, 500]
  const sampleCalculations = sampleAmounts.map((amt) => ({
    base: amt,
    ...calculateTax({
      amount: amt,
      rate: currentRow.rate,
      isInclusive: currentRow.is_inclusive,
    }),
  }))

  return (
    <Sheet open={open === 'view'} onOpenChange={(v) => !v && setOpen(null)}>
      <SheetContent className='sm:max-w-md overflow-y-auto space-y-6'>
        <SheetHeader>
          <div className='flex items-center justify-between gap-2'>
            <Badge
              variant={currentRow.is_active ? 'default' : 'secondary'}
              className='text-xs font-semibold'
            >
              {currentRow.is_active
                ? t('taxRates.columns.active', { defaultValue: 'Active' })
                : t('taxRates.columns.inactive', { defaultValue: 'Inactive' })}
            </Badge>

            {validity === 'current' && (
              <Badge
                variant='outline'
                className='border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-xs'
              >
                <CheckCircle2 className='mr-1 h-3 w-3' />
                {t('taxRates.columns.effective', {
                  defaultValue: 'Currently Effective',
                })}
              </Badge>
            )}
            {validity === 'upcoming' && (
              <Badge
                variant='outline'
                className='border-blue-500/40 text-blue-600 bg-blue-500/10 text-xs'
              >
                <Clock className='mr-1 h-3 w-3' />
                {t('taxRates.columns.upcoming', { defaultValue: 'Upcoming' })}
              </Badge>
            )}
            {validity === 'expired' && (
              <Badge
                variant='outline'
                className='border-rose-500/40 text-rose-600 bg-rose-500/10 text-xs'
              >
                <AlertCircle className='mr-1 h-3 w-3' />
                {t('taxRates.columns.expired', { defaultValue: 'Expired' })}
              </Badge>
            )}
          </div>

          <SheetTitle className='text-xl font-bold flex items-center justify-between pt-1'>
            <span>{currentRow.tax_type}</span>
            <span className='text-primary font-mono text-lg font-bold'>
              {currentRow.rate}%
            </span>
          </SheetTitle>

          <SheetDescription className='text-sm'>
            {currentRow.description ||
              t('taxRates.details.noDescription', {
                defaultValue: 'No additional description provided.',
              })}
          </SheetDescription>
        </SheetHeader>

        {/* General Information */}
        <div className='space-y-3 rounded-lg border bg-muted/30 p-4'>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('taxRates.details.specs', { defaultValue: 'Specifications' })}
          </h4>

          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div>
              <span className='text-xs text-muted-foreground block'>
                {t('taxRates.details.calculationMode', {
                  defaultValue: 'Calculation Mode',
                })}
              </span>
              <span className='font-medium'>
                {currentRow.is_inclusive
                  ? t('taxRates.details.modeInclusive', {
                      defaultValue: 'Inclusive (In Price)',
                    })
                  : t('taxRates.details.modeExclusive', {
                      defaultValue: 'Exclusive (Added On)',
                    })}
              </span>
            </div>

            <div>
              <span className='text-xs text-muted-foreground block'>
                {t('taxRates.details.country', {
                  defaultValue: 'Country / Jurisdiction',
                })}
              </span>
              <span className='font-medium flex items-center gap-1.5'>
                <Globe2 className='h-3.5 w-3.5 text-muted-foreground' />
                {currentRow.countries
                  ? `${currentRow.countries.name} (${currentRow.countries.code})`
                  : t('taxRates.details.global', {
                      defaultValue: 'Global / None',
                    })}
              </span>
            </div>

            <div>
              <span className='text-xs text-muted-foreground block'>
                {t('taxRates.details.effectiveFrom', {
                  defaultValue: 'Effective From',
                })}
              </span>
              <span className='font-medium flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                {currentRow.effective_from}
              </span>
            </div>

            <div>
              <span className='text-xs text-muted-foreground block'>
                {t('taxRates.details.effectiveTo', {
                  defaultValue: 'Effective To',
                })}
              </span>
              <span className='font-medium flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                {currentRow.effective_to ||
                  t('taxRates.details.indefinite', {
                    defaultValue: 'Indefinite / None',
                  })}
              </span>
            </div>
          </div>

          <Separator className='my-2' />

          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <span>
              {t('taxRates.details.uuid', { defaultValue: 'UUID' })}:{' '}
              {currentRow.id}
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-1.5 text-xs'
              onClick={() =>
                copyToClipboard(
                  currentRow.id,
                  t('taxRates.details.uuid', { defaultValue: 'Tax Rate ID' })
                )
              }
            >
              <Copy className='h-3 w-3 mr-1' />
              {t('common.copy', { defaultValue: 'Copy' })}
            </Button>
          </div>
        </div>

        {/* Live Calculation Samples Table */}
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
              <Calculator className='h-3.5 w-3.5 text-primary' />
              {t('taxRates.details.sampleCalculations', {
                defaultValue: 'Sample Projections',
              })}
            </h4>
            <span className='text-xs text-muted-foreground font-mono'>
              {formatTaxRate(currentRow.rate, currentRow.is_inclusive)}
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden'>
            <table className='w-full text-xs'>
              <thead className='bg-muted/60 text-muted-foreground font-medium border-b'>
                <tr>
                  <th className='py-2 px-3 text-left'>
                    {t('taxRates.details.baseAmount', {
                      defaultValue: 'Base Amount',
                    })}
                  </th>
                  <th className='py-2 px-3 text-right'>
                    {t('taxRates.calculator.netSubtotal', {
                      defaultValue: 'Net Subtotal',
                    })}
                  </th>
                  <th className='py-2 px-3 text-right'>
                    {t('taxRates.details.tax', { defaultValue: 'Tax' })}
                  </th>
                  <th className='py-2 px-3 text-right'>
                    {t('taxRates.calculator.grossTotal', {
                      defaultValue: 'Gross Total',
                    })}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60 font-mono'>
                {sampleCalculations.map((c) => (
                  <tr key={c.base} className='hover:bg-muted/20'>
                    <td className='py-2 px-3 font-sans'>${c.base.toFixed(2)}</td>
                    <td className='py-2 px-3 text-right'>
                      ${c.netAmount.toFixed(2)}
                    </td>
                    <td className='py-2 px-3 text-right text-primary font-bold'>
                      +${c.taxAmount.toFixed(2)}
                    </td>
                    <td className='py-2 px-3 text-right font-bold'>
                      ${c.grossAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SheetFooter className='flex-row gap-2 pt-4'>
          <Button
            variant='outline'
            className='flex-1 gap-1.5'
            onClick={() => setOpen('calculator')}
          >
            <Calculator className='h-4 w-4' />
            {t('taxRates.actions.simulate', { defaultValue: 'Simulate' })}
          </Button>

          <Button
            variant='secondary'
            className='flex-1 gap-1.5'
            onClick={() => setOpen('edit')}
          >
            <Edit className='h-4 w-4' />
            {t('taxRates.actions.edit', { defaultValue: 'Edit' })}
          </Button>

          <Button
            variant='destructive'
            size='icon'
            onClick={() => setOpen('delete')}
            aria-label={t('taxRates.actions.delete', { defaultValue: 'Delete' })}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
