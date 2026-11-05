import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CreditCard, FileText, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/custom-ui/phone-input'
import { useCreateSupplier, useUpdateSupplier } from '../hooks/use-suppliers'
import { useSuppliersContext } from './suppliers-provider'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  contact_person: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  tax_number: z.string().optional().or(z.literal('')),
  payment_terms_days: z.coerce.number().int().min(0).optional().nullable(),
  address: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  is_preferred: z.boolean().default(false).optional(),
  is_active: z.boolean().default(true).optional(),
})

type SupplierFormValues = z.infer<typeof formSchema>

export function SupplierActionDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useSuppliersContext()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      tax_number: '',
      payment_terms_days: undefined,
      address: '',
      website: '',
      notes: '',
      is_preferred: false,
      is_active: true,
    },
  })

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        code: currentRow.code || '',
        contact_person: currentRow.contact_person || '',
        email: currentRow.email || '',
        phone: currentRow.phone || '',
        tax_number: currentRow.tax_number || '',
        payment_terms_days: currentRow.payment_terms_days ?? null,
        address: currentRow.address || '',
        website: currentRow.website || '',
        notes: currentRow.notes || '',
        is_preferred: currentRow.is_preferred || false,
        is_active: currentRow.is_active !== false,
      })
    } else {
      form.reset({
        name: '',
        code: '',
        contact_person: '',
        email: '',
        phone: '',
        tax_number: '',
        payment_terms_days: null,
        address: '',
        website: '',
        notes: '',
        is_preferred: false,
        is_active: true,
      })
    }
  }, [currentRow, form])

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      const payload = {
        name: values.name,
        code: values.code || null,
        contactPerson: values.contact_person || null,
        email: values.email || null,
        phone: values.phone || null,
        taxNumber: values.tax_number || null,
        paymentTermsDays:
          values.payment_terms_days !== null &&
          values.payment_terms_days !== undefined
            ? Number(values.payment_terms_days)
            : undefined,
        address: values.address || null,
        website: values.website || null,
        notes: values.notes || null,
        isPreferred: values.is_preferred ?? false,
        isActive: values.is_active ?? true,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          input: payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setOpen(null)
    } catch {
      // error toast is handled in mutation hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit
              ? t('suppliers.form.editTitle', { defaultValue: 'Edit Supplier' })
              : t('suppliers.form.createTitle', {
                  defaultValue: 'Create Supplier',
                })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('suppliers.form.editDesc', {
                  defaultValue:
                    'Modify supplier details, contacts, and commercial terms.',
                })
              : t('suppliers.form.createDesc', {
                  defaultValue:
                    'Add a new vendor to your inventory purchasing network.',
                })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-6 py-2'
          >
            {/* General Info */}
            <div className='space-y-4'>
              <div className='flex items-center gap-2 border-b pb-1.5 text-sm font-semibold text-foreground'>
                <Building2 className='h-4 w-4 text-primary' />
                <span>
                  {t('suppliers.form.sectionGeneral', {
                    defaultValue: 'General Information',
                  })}
                </span>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.name', {
                          defaultValue: 'Company / Supplier Name',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('suppliers.form.namePlaceholder', {
                            defaultValue: 'e.g. Acme Supplies Ltd.',
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
                  name='code'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.code', {
                          defaultValue: 'Supplier Code',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('suppliers.form.codePlaceholder', {
                            defaultValue: 'e.g. SUP-001',
                          })}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact & Location */}
            <div className='space-y-4'>
              <div className='flex items-center gap-2 border-b pb-1.5 text-sm font-semibold text-foreground'>
                <MapPin className='h-4 w-4 text-primary' />
                <span>
                  {t('suppliers.form.sectionContact', {
                    defaultValue: 'Contact & Location',
                  })}
                </span>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='contact_person'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.contactPerson', {
                          defaultValue: 'Contact Person',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'suppliers.form.contactPersonPlaceholder',
                            {
                              defaultValue: 'e.g. John Doe',
                            }
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.email', {
                          defaultValue: 'Email Address',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder={t('suppliers.form.emailPlaceholder', {
                            defaultValue: 'supplier@example.com',
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
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.phone', {
                          defaultValue: 'Phone Number',
                        })}
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='website'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.website', {
                          defaultValue: 'Website URL',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('suppliers.form.websitePlaceholder', {
                            defaultValue: 'https://example.com',
                          })}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('suppliers.form.address', {
                        defaultValue: 'Address',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('suppliers.form.addressPlaceholder', {
                          defaultValue: 'Enter billing or warehouse address',
                        })}
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Commercial Terms */}
            <div className='space-y-4'>
              <div className='flex items-center gap-2 border-b pb-1.5 text-sm font-semibold text-foreground'>
                <CreditCard className='h-4 w-4 text-primary' />
                <span>
                  {t('suppliers.form.sectionFinancial', {
                    defaultValue: 'Commercial Terms',
                  })}
                </span>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='tax_number'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.taxNumber', {
                          defaultValue: 'Tax Registration Number',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'suppliers.form.taxNumberPlaceholder',
                            {
                              defaultValue: 'e.g. TR-99887766',
                            }
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='payment_terms_days'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('suppliers.form.paymentTermsDays', {
                          defaultValue: 'Payment Terms (Days)',
                        })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder={t(
                            'suppliers.form.paymentTermsDaysPlaceholder',
                            {
                              defaultValue: 'e.g. 30',
                            }
                          )}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes & Status */}
            <div className='space-y-4'>
              <div className='flex items-center gap-2 border-b pb-1.5 text-sm font-semibold text-foreground'>
                <FileText className='h-4 w-4 text-primary' />
                <span>
                  {t('suppliers.form.sectionNotes', {
                    defaultValue: 'Notes & Preferences',
                  })}
                </span>
              </div>

              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('suppliers.form.notes', {
                        defaultValue: 'Internal Notes',
                      })}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('suppliers.form.notesPlaceholder', {
                          defaultValue:
                            'Add delivery instructions or payment terms notes...',
                        })}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='is_preferred'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border bg-card p-3.5'>
                      <div className='space-y-0.5 pe-2 text-start'>
                        <FormLabel className='text-sm font-medium'>
                          {t('suppliers.form.isPreferred', {
                            defaultValue: 'Preferred Supplier',
                          })}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t('suppliers.form.isPreferredDesc', {
                            defaultValue:
                              'Prioritize this supplier for automatic stock reordering.',
                          })}
                        </FormDescription>
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
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border bg-card p-3.5'>
                      <div className='space-y-0.5 pe-2 text-start'>
                        <FormLabel className='text-sm font-medium'>
                          {t('suppliers.form.isActive', {
                            defaultValue: 'Active Supplier',
                          })}
                        </FormLabel>
                        <FormDescription className='text-xs'>
                          {t('suppliers.form.isActiveDesc', {
                            defaultValue:
                              'Enable this supplier for purchase orders and goods receipts.',
                          })}
                        </FormDescription>
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
            </div>

            <DialogFooter className='gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(null)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('suppliers.form.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('suppliers.form.saving', { defaultValue: 'Saving...' })
                  : t('suppliers.form.save', { defaultValue: 'Save Supplier' })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
