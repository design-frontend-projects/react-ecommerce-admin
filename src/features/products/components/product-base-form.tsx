import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { baseProductSchema, type BaseProductFormData } from '../data/product-wizard-schema'
import { useProductWizardStore } from '../context/product-wizard-store'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export function ProductBaseForm({ 
  onSubmitDirect 
}: { 
  onSubmitDirect?: (data: BaseProductFormData) => void 
}) {
  const { baseProductData, setBaseProductData, nextStep, setVariantsEnabled } = useProductWizardStore()
  
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
    },
    mode: 'onTouched',
  })

  const hasVariants = form.watch('has_variants')

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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form id="product-base-form" onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mocha Frappuccino" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter product description"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base SKU (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. MOCHA-FRAP" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="base_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value ? field.value.toString() : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_id.toString()}>
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

        <div className="flex items-center gap-4 mt-6">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                <div className="space-y-0.5">
                  <FormLabel>Active Product</FormLabel>
                  <div className="text-sm text-muted-foreground">
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
            name="has_variants"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1">
                <div className="space-y-0.5">
                  <FormLabel>Has Variants</FormLabel>
                  <div className="text-sm text-muted-foreground">
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
        </div>
      </form>
    </Form>
  )
}
