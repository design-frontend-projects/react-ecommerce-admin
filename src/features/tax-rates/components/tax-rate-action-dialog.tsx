import { useEffect } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Sparkles,
  Percent,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useCountries } from '@/features/countries/hooks/use-countries'
import {
  taxRateFormSchema,
  type TaxRateFormValues,
} from '../schemas/tax-rate-schema'
import { TAX_PRESETS } from '../data/tax-presets'
import { calculateTax } from '../utils/tax-math'
import { useCreateTaxRate, useUpdateTaxRate } from '../hooks/use-tax-rates'
import { useTaxContext } from './tax-rates-provider'

export function TaxActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useTaxContext()
  const createMutation = useCreateTaxRate()
  const updateMutation = useUpdateTaxRate()

  const { data: countries, isLoading: isCountriesLoading } = useCountries()

  const form = useForm<TaxRateFormValues>({
    resolver: zodResolver(taxRateFormSchema) as Resolver<TaxRateFormValues>,
    defaultValues: {
      tax_type: '',
      rate: 0,
      country_id: '',
      description: '',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true,
      is_inclusive: false,
    },
  })

  // Watch rate & inclusivity for live calculation preview via useWatch
  const watchedRate = useWatch({ control: form.control, name: 'rate' }) ?? 0
  const watchedInclusive =
    useWatch({ control: form.control, name: 'is_inclusive' }) ?? false

  const livePreview = calculateTax({
    amount: 100,
    rate: Number(watchedRate) || 0,
    isInclusive: Boolean(watchedInclusive),
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        tax_type: currentRow.tax_type,
        rate: currentRow.rate,
        country_id: currentRow.country_id || '',
        description: currentRow.description || '',
        effective_from: currentRow.effective_from,
        effective_to: currentRow.effective_to || '',
        is_active: currentRow.is_active,
        is_inclusive: currentRow.is_inclusive,
      })
    } else {
      form.reset({
        tax_type: '',
        rate: 0,
        country_id: '',
        description: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        is_active: true,
        is_inclusive: false,
      })
    }
  }, [currentRow, form, open])

  const applyPreset = (presetId: string) => {
    const preset = TAX_PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    form.setValue('tax_type', preset.tax_type, { shouldValidate: true })
    form.setValue('rate', preset.rate, { shouldValidate: true })
    form.setValue('is_inclusive', preset.is_inclusive, { shouldValidate: true })
    if (preset.description) {
      form.setValue('description', preset.description, { shouldValidate: true })
    }

    if (preset.country_code && countries) {
      const match = countries.find(
        (c) => c.code.toUpperCase() === preset.country_code?.toUpperCase()
      )
      if (match) {
        form.setValue('country_id', match.id, { shouldValidate: true })
      }
    }

    toast.info(
      t('taxRates.dialog.appliedPreset', {
        preset: preset.label,
        defaultValue: `Applied preset: ${preset.label}`,
      })
    )
  }

  const onSubmit = async (values: TaxRateFormValues) => {
    try {
      if (currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...values,
          country_id: values.country_id || null,
          description: values.description || null,
          effective_to: values.effective_to || null,
        })
        toast.success(
          t('taxRates.dialog.updateSuccess', {
            defaultValue: 'Tax rate updated successfully',
          })
        )
      } else {
        await createMutation.mutateAsync({
          ...values,
          country_id: values.country_id || null,
          description: values.description || null,
          effective_to: values.effective_to || null,
        })
        toast.success(
          t('taxRates.dialog.createSuccess', {
            defaultValue: 'Tax rate created successfully',
          })
        )
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error(
        t('common.error', { defaultValue: 'Error' }),
        {
          description:
            error instanceof Error
              ? error.message
              : t('common.somethingWentWrong', {
                  defaultValue: 'Something went wrong. Please try again.',
                }),
        }
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      open={open === 'create' || open === 'edit'}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <DialogContent className='sm:max-w-[560px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            {currentRow
              ? t('taxRates.dialog.editTitle', {
                  defaultValue: 'Edit Tax Rate',
                })
              : t('taxRates.dialog.createTitle', {
                  defaultValue: 'Create Tax Rate',
                })}
          </DialogTitle>
          <DialogDescription>
            {currentRow
              ? t('taxRates.dialog.editSubtitle', {
                  defaultValue:
                    'Update configuration and validity for this tax rate.',
                })
              : t('taxRates.dialog.createSubtitle', {
                  defaultValue:
                    'Add a new standard, reduced, or regional tax rate.',
                })}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets Bar (on create only) */}
        {!currentRow && (
          <div className='space-y-1.5 rounded-lg border bg-muted/30 p-2.5'>
            <div className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
              <Sparkles className='h-3.5 w-3.5 text-primary' />
              <span>
                {t('taxRates.dialog.presets', {
                  defaultValue: 'Quick Presets',
                })}
              </span>
            </div>
            <div className='flex flex-wrap gap-1'>
              {TAX_PRESETS.slice(0, 6).map((preset) => (
                <Button
                  key={preset.id}
                  type='button'
                  variant='secondary'
                  size='sm'
                  className='h-6 text-[11px] px-2 font-medium'
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.badgeText || preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {/* Tax Type & Rate */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='tax_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('taxRates.form.taxType', {
                        defaultValue: 'Tax Type / Name',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('taxRates.form.taxTypePlaceholder', {
                          defaultValue: 'e.g. VAT 15%, Sales Tax',
                        })}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='rate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('taxRates.form.rate', { defaultValue: 'Rate (%)' })}
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Percent className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input
                          type='number'
                          step='0.01'
                          min='0'
                          max='100'
                          placeholder='0.00'
                          className='pl-9'
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Jurisdiction Country */}
            <FormField
              control={form.control}
              name='country_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('taxRates.form.country', {
                      defaultValue: 'Country / Jurisdiction',
                    })}
                  </FormLabel>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === 'none' ? '' : val)
                    }
                    value={field.value || 'none'}
                    disabled={isCountriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isCountriesLoading
                              ? t('common.loading', {
                                  defaultValue: 'Loading...',
                                })
                              : t('taxRates.form.selectJurisdiction', {
                                  defaultValue:
                                    'Select jurisdiction (Optional)',
                                })
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>
                        {t('taxRates.form.globalNoCountry', {
                          defaultValue: 'Global (No specific country)',
                        })}
                      </SelectItem>
                      {countries?.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name} ({country.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inclusivity & Active Switches */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='is_inclusive'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-sm font-medium'>
                        {t('taxRates.form.isInclusive', {
                          defaultValue: 'Tax Inclusive',
                        })}
                      </FormLabel>
                      <p className='text-[11px] text-muted-foreground'>
                        {field.value
                          ? t('taxRates.form.taxIncludedInPrice', {
                              defaultValue: 'Tax included in price',
                            })
                          : t('taxRates.form.taxAddedOnTop', {
                              defaultValue: 'Tax added on top',
                            })}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/20'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-sm font-medium'>
                        {t('taxRates.form.isActive', {
                          defaultValue: 'Is Active',
                        })}
                      </FormLabel>
                      <p className='text-[11px] text-muted-foreground'>
                        {field.value
                          ? t('taxRates.form.availableForUse', {
                              defaultValue: 'Available for use',
                            })
                          : t('taxRates.form.disabledHidden', {
                              defaultValue: 'Disabled / Hidden',
                            })}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Live Calculation Preview Banner */}
            <div className='rounded-lg border bg-card p-3 shadow-2xs space-y-1.5'>
              <div className='flex items-center justify-between text-xs text-muted-foreground font-medium'>
                <span className='flex items-center gap-1 text-primary'>
                  <Info className='h-3.5 w-3.5' />
                  {t('taxRates.dialog.previewTitle', {
                    defaultValue: 'Live Impact Preview on $100.00 Base',
                  })}
                </span>
                <Badge variant='outline' className='text-[10px] font-mono'>
                  {watchedInclusive
                    ? t('taxRates.columns.inclusive', {
                        defaultValue: 'Inclusive',
                      })
                    : t('taxRates.columns.exclusive', {
                        defaultValue: 'Exclusive',
                      })}
                </Badge>
              </div>

              <div className='flex justify-between items-center text-xs font-mono bg-muted/40 p-2 rounded'>
                <div>
                  <span className='text-muted-foreground block text-[10px]'>
                    {t('taxRates.calculator.netSubtotal', {
                      defaultValue: 'Net Subtotal',
                    })}
                  </span>
                  <span className='font-bold'>
                    ${livePreview.netAmount.toFixed(2)}
                  </span>
                </div>
                <div className='text-center text-primary'>
                  <span className='text-muted-foreground block text-[10px]'>
                    {t('taxRates.calculator.taxAmount', {
                      defaultValue: 'Tax Portion',
                    })}
                  </span>
                  <span className='font-bold'>
                    +${livePreview.taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className='text-right'>
                  <span className='text-muted-foreground block text-[10px]'>
                    {t('taxRates.calculator.grossTotal', {
                      defaultValue: 'Gross Total',
                    })}
                  </span>
                  <span className='font-bold text-foreground'>
                    ${livePreview.grossAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Effective Dates */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='effective_from'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('taxRates.form.effectiveFrom', {
                        defaultValue: 'Effective From',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='effective_to'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('taxRates.form.effectiveTo', {
                        defaultValue: 'Effective To (Optional)',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Input type='date' {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('taxRates.form.description', {
                      defaultValue: 'Description (Optional)',
                    })}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'taxRates.form.descriptionPlaceholder',
                        {
                          defaultValue:
                            'Add notes, statutory references, or applicability rules',
                        }
                      )}
                      className='resize-none h-16'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : currentRow
                  ? t('common.saveChanges', { defaultValue: 'Save Changes' })
                  : t('taxRates.dialog.createButton', {
                      defaultValue: 'Create Tax Rate',
                    })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
