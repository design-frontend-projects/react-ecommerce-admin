import { useEffect } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useProductWizardStore } from '../context/product-wizard-store'
import {
  baseProductSchema,
  type BaseProductFormData,
} from '../data/product-wizard-schema'

export function ProductBaseForm({
  onSubmitDirect,
}: {
  onSubmitDirect?: (data: BaseProductFormData) => void
}) {
  const { baseProductData, setBaseProductData, nextStep, setVariantsEnabled } =
    useProductWizardStore()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  const form = useForm<BaseProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(baseProductSchema) as any,
    defaultValues: baseProductData || {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category_id: null,
      supplier_id: null,
      store_id: null,
      is_active: true,
      has_variants: true,
      has_expiration: false,
      expiration_date: null,
    },
    mode: 'onTouched',
  })

  const hasVariants = form.watch('has_variants')
  const hasExpiration = form.watch('has_expiration')

  useEffect(() => {
    setVariantsEnabled(hasVariants ?? true)
  }, [hasVariants, setVariantsEnabled])

  const onSubmit = (data: BaseProductFormData) => {
    setBaseProductData(data)
    if (data.has_variants) {
      nextStep()
    } else if (onSubmitDirect) {
      onSubmitDirect(data)
    }
  }

  return (
    <Form {...form}>
      { }
      <form
        id='product-base-form'
        onSubmit={form.handleSubmit(onSubmit as any)}
        className='space-y-4 py-4'
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder='e.g. Mocha Frappuccino' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Enter product description'
                  className='resize-none'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField
            control={form.control}
            name='sku'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base SKU (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='e.g. MOCHA-FRAP'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='base_price'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='category_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value ? field.value.toString() : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a category' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem
                        key={cat.category_id}
                        value={cat.category_id.toString()}
                      >
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='mt-6 flex items-center gap-4'>
          <FormField
            control={form.control}
            name='is_active'
            render={({ field }) => (
              <FormItem className='flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                <div className='space-y-0.5'>
                  <FormLabel>Active Product</FormLabel>
                  <div className='text-sm text-muted-foreground'>
                    Product will be available for sale
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

          <FormField
            control={form.control}
            name='has_variants'
            render={({ field }) => (
              <FormItem className='flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                <div className='space-y-0.5'>
                  <FormLabel>Has Variants</FormLabel>
                  <div className='text-sm text-muted-foreground'>
                    Enable sizes, colors, etc.
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

          <FormField
            control={form.control}
            name='has_expiration'
            render={({ field }) => (
              <FormItem className='flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                <div className='space-y-0.5'>
                  <FormLabel>Has Expiration</FormLabel>
                  <div className='text-sm text-muted-foreground'>
                    Does this product expire?
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
        </div>

        {hasExpiration && (
          <FormField
            control={form.control}
            name='expiration_date'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Expiration Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                      mode='single'
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  )
}
