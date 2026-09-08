import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Loader2,
  RefreshCw,
  AlertCircle,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCities } from '@/features/cities/hooks/use-cities'
import { useCreateBranch, useUpdateBranch } from '../hooks/use-branches'
import { useBranchesContext } from './branches-provider'

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or fewer'),
  city_id: z.string().min(1, 'City is required'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .or(z.literal(''))
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, 'Phone must be 20 characters or fewer')
    .optional()
    .nullable(),
  address: z.string().optional().nullable(),
  is_active: z.boolean(),
})

type BranchFormValues = z.infer<typeof formSchema>

export function BranchActionDialog() {
  const { open, setOpen, currentRow } = useBranchesContext()
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()
  const {
    data: cities = [],
    isLoading: isCitiesLoading,
    isError: isCitiesError,
    refetch: refetchCities,
  } = useCities()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      city_id: '',
      email: '',
      address: '',
      phone: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (currentRow) {
        form.reset({
          name: currentRow.name || '',
          city_id: currentRow.city_id || '',
          email: currentRow.email || '',
          address: currentRow.address || '',
          phone: currentRow.phone || '',
          is_active: currentRow.is_active ?? true,
        })
      } else {
        form.reset({
          name: '',
          city_id: '',
          email: '',
          address: '',
          phone: '',
          is_active: true,
        })
      }
    }
  }, [isOpen, currentRow, form])

  const onSubmit = async (values: BranchFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        city_id: values.city_id,
        email: values.email?.trim() ? values.email.trim() : null,
        phone: values.phone?.trim() ? values.phone.trim() : null,
        address: values.address?.trim() ? values.address.trim() : null,
        is_active: values.is_active,
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.id,
          ...payload,
        })
        toast.success('Branch updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Branch created successfully')
      }
      setOpen(null)
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error('Error', {
        description: err.message || 'Something went wrong. Please try again.',
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Building2 className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle>
                {isEdit ? 'Edit Branch' : 'Create Branch'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the branch details and location settings below.'
                  : 'Add a new operational branch to your organization.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className='-mr-4 max-h-[65vh] pr-4'>
          <Form {...form}>
            <form
              id='branch-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 py-1'
            >
              {/* Branch Name */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-1.5'>
                      <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                      Branch Name <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., Downtown Flagship, North Hub'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City Selector */}
              <FormField
                control={form.control}
                name='city_id'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center justify-between'>
                      <FormLabel className='flex items-center gap-1.5'>
                        <MapPin className='h-3.5 w-3.5 text-muted-foreground' />
                        City <span className='text-destructive'>*</span>
                      </FormLabel>
                      {isCitiesError && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 px-2 text-xs text-destructive hover:bg-destructive/10'
                          onClick={() => refetchCities()}
                        >
                          <RefreshCw className='mr-1 h-3 w-3' />
                          Retry
                        </Button>
                      )}
                    </div>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isCitiesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          {isCitiesLoading ? (
                            <div className='flex items-center gap-2 text-muted-foreground'>
                              <Loader2 className='h-4 w-4 animate-spin' />
                              <span>Loading cities...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder='Select a city location' />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='max-h-[220px]'>
                        {isCitiesLoading ? (
                          <div className='flex items-center justify-center py-6 text-sm text-muted-foreground'>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Fetching city list...
                          </div>
                        ) : cities.length === 0 ? (
                          <div className='flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground'>
                            <AlertCircle className='mb-1 h-5 w-5 text-amber-500' />
                            <p className='font-medium'>No cities found</p>
                            <p className='text-xs text-muted-foreground'>
                              Please configure cities in Settings &gt; Cities.
                            </p>
                          </div>
                        ) : (
                          cities.map((city) => {
                            const countryName = city.countries?.name
                            return (
                              <SelectItem key={city.id} value={String(city.id)}>
                                <div className='flex items-center gap-2'>
                                  <span className='font-medium'>{city.name}</span>
                                  {countryName && (
                                    <span className='text-xs text-muted-foreground'>
                                      ({countryName})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Information Grid: Email & Phone */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {/* Email Field */}
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Mail className='h-3.5 w-3.5 text-muted-foreground' />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='branch@company.com'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-1.5'>
                        <Phone className='h-3.5 w-3.5 text-muted-foreground' />
                        Phone
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='tel'
                          placeholder='+1 (555) 010-9999'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Physical Address */}
              <FormField
                control={form.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Suite, street name, district, or landmarks (optional)'
                        className='resize-none'
                        rows={2}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name='is_active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5 shadow-sm'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-sm font-medium'>
                        Active Status
                      </FormLabel>
                      <div className='text-xs text-muted-foreground'>
                        Enable this branch for active POS transactions, stock transfers, and operations.
                      </div>
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
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className='gap-2 pt-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(null)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='branch-form'
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Branch'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
