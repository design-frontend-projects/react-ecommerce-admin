import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calculator,
  Percent,
  DollarSign,
  ArrowRightLeft,
  Receipt,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calculateTax, formatTaxRate } from '../utils/tax-math'
import { TAX_PRESETS } from '../data/tax-presets'
import { useTaxContext } from './tax-rates-provider'

interface CalculatorModalProps {
  initialRate: number
  initialInclusive: boolean
  onClose: () => void
}

function TaxRatesCalculatorModal({
  initialRate,
  initialInclusive,
  onClose,
}: CalculatorModalProps) {
  const { t } = useTranslation()

  const [amount, setAmount] = useState<number>(100)
  const [rate, setRate] = useState<number>(initialRate)
  const [isInclusive, setIsInclusive] = useState<boolean>(initialInclusive)
  const [quantity, setQuantity] = useState<number>(1)
  const [discount, setDiscount] = useState<number>(0)

  const result = calculateTax({
    amount: Number(amount) || 0,
    rate: Number(rate) || 0,
    isInclusive,
    quantity: Number(quantity) || 1,
    discount: Number(discount) || 0,
  })

  const netPercent =
    result.grossAmount > 0
      ? Math.round((result.netAmount / result.grossAmount) * 100)
      : 100
  const taxPercent = 100 - netPercent

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='sm:max-w-[620px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2 text-primary'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
              <Calculator className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold'>
                {t('taxRates.calculator.title', {
                  defaultValue: 'Interactive Tax Simulator',
                })}
              </DialogTitle>
              <DialogDescription>
                {t('taxRates.calculator.desc', {
                  defaultValue:
                    'Simulate gross, net, and tax deductions with custom prices and discount rules.',
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets */}
        <div className='space-y-1.5 pt-2'>
          <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('taxRates.calculator.quickPresets', {
              defaultValue: 'Quick Presets',
            })}
          </Label>
          <div className='flex flex-wrap gap-1.5'>
            {TAX_PRESETS.slice(0, 6).map((preset) => (
              <Button
                key={preset.id}
                type='button'
                variant='outline'
                size='sm'
                className='h-7 text-xs px-2.5 font-medium'
                onClick={() => {
                  setRate(preset.rate)
                  setIsInclusive(preset.is_inclusive)
                }}
              >
                {preset.badgeText || preset.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Form Inputs */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='calc-price'>
              {t('taxRates.calculator.basePrice', {
                defaultValue: 'Unit Price ($)',
              })}
            </Label>
            <div className='relative'>
              <DollarSign className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                id='calc-price'
                type='number'
                step='0.01'
                min='0'
                className='pl-9'
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='calc-rate'>
              {t('taxRates.calculator.ratePercent', {
                defaultValue: 'Tax Rate (%)',
              })}
            </Label>
            <div className='relative'>
              <Percent className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                id='calc-rate'
                type='number'
                step='0.01'
                min='0'
                max='100'
                className='pl-9'
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='calc-qty'>
              {t('taxRates.calculator.qty', { defaultValue: 'Quantity' })}
            </Label>
            <Input
              id='calc-qty'
              type='number'
              min='1'
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='calc-discount'>
              {t('taxRates.calculator.discount', {
                defaultValue: 'Total Discount ($)',
              })}
            </Label>
            <Input
              id='calc-discount'
              type='number'
              step='0.01'
              min='0'
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Inclusivity Toggle */}
        <div className='flex items-center justify-between rounded-lg border p-3.5 bg-muted/40'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2 font-medium text-sm'>
              <ArrowRightLeft className='h-4 w-4 text-primary' />
              {t('taxRates.calculator.inclusiveToggle', {
                defaultValue: 'Tax Inclusive Pricing',
              })}
            </div>
            <p className='text-xs text-muted-foreground'>
              {isInclusive
                ? t('taxRates.calculator.inclusiveExpl', {
                    defaultValue:
                      'Price entered already includes the tax amount.',
                  })
                : t('taxRates.calculator.exclusiveExpl', {
                    defaultValue:
                      'Tax is added on top of the net subtotal.',
                  })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Badge
              variant={isInclusive ? 'default' : 'outline'}
              className='text-xs'
            >
              {isInclusive
                ? t('taxRates.columns.inclusive', { defaultValue: 'Inclusive' })
                : t('taxRates.columns.exclusive', { defaultValue: 'Exclusive' })}
            </Badge>
            <Switch
              checked={isInclusive}
              onCheckedChange={setIsInclusive}
            />
          </div>
        </div>

        {/* Results Overview */}
        <div className='rounded-xl border bg-card p-4 shadow-xs space-y-3'>
          <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            <span className='flex items-center gap-1.5'>
              <Receipt className='h-4 w-4 text-primary' />
              {t('taxRates.calculator.breakdown', {
                defaultValue: 'Calculation Breakdown',
              })}
            </span>
            <span>{formatTaxRate(rate, isInclusive)}</span>
          </div>

          <div className='grid grid-cols-3 gap-2 text-center'>
            <div className='rounded-lg bg-muted/50 p-2.5'>
              <span className='block text-xs text-muted-foreground'>
                {t('taxRates.calculator.netSubtotal', {
                  defaultValue: 'Net Subtotal',
                })}
              </span>
              <span className='text-lg font-bold font-mono text-foreground'>
                ${result.netAmount.toFixed(2)}
              </span>
            </div>

            <div className='rounded-lg bg-primary/10 p-2.5 text-primary'>
              <span className='block text-xs font-medium'>
                {t('taxRates.calculator.taxAmount', {
                  defaultValue: 'Tax Amount',
                })}
              </span>
              <span className='text-lg font-bold font-mono'>
                +${result.taxAmount.toFixed(2)}
              </span>
            </div>

            <div className='rounded-lg bg-emerald-500/10 p-2.5 text-emerald-700 dark:text-emerald-400'>
              <span className='block text-xs font-medium'>
                {t('taxRates.calculator.grossTotal', {
                  defaultValue: 'Gross Total',
                })}
              </span>
              <span className='text-lg font-bold font-mono'>
                ${result.grossAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          <div className='space-y-1 pt-1'>
            <div className='flex justify-between text-[11px] text-muted-foreground'>
              <span>
                {t('taxRates.calculator.netRatio', {
                  percent: netPercent,
                  defaultValue: `Net: ${netPercent}%`,
                })}
              </span>
              <span>
                {t('taxRates.calculator.taxRatio', {
                  percent: taxPercent,
                  defaultValue: `Tax: ${taxPercent}%`,
                })}
              </span>
            </div>
            <div className='h-2 w-full flex overflow-hidden rounded-full bg-muted'>
              <div
                style={{ width: `${netPercent}%` }}
                className='bg-foreground/70 transition-all duration-300'
              />
              <div
                style={{ width: `${taxPercent}%` }}
                className='bg-primary transition-all duration-300'
              />
            </div>
          </div>

          {/* Math Formula Card */}
          <div className='flex items-start gap-2 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground border border-border/40'>
            <Info className='h-4 w-4 text-primary shrink-0 mt-0.5' />
            <div className='font-mono break-all leading-relaxed'>
              {result.formula}
            </div>
          </div>
        </div>

        <div className='flex justify-end'>
          <Button variant='outline' onClick={onClose}>
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TaxRatesCalculatorDialog() {
  const { open, setOpen, currentRow } = useTaxContext()

  if (open !== 'calculator') return null

  return (
    <TaxRatesCalculatorModal
      key={currentRow?.id || 'standalone'}
      initialRate={currentRow?.rate ?? 15}
      initialInclusive={currentRow?.is_inclusive ?? false}
      onClose={() => setOpen(null)}
    />
  )
}
