import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Scan as LucideScan } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
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
import { Textarea } from '@/components/ui/textarea'
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import { z } from 'zod'
import { type Product } from '../data/schema'
import { BarcodeDisplay } from './barcode-display'

interface Props {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductActionDialog({ currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow
  const queryClient = useQueryClient()
  const [isScannerOpen, setIsScannerOpen] = useState(false)

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

  const formSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional().nullable(),
    sku: z.string().min(1, 'SKU is required').max(100),
    barcode: z.string().optional().nullable(),
    category_id: z.coerce.number().optional().nullable(),
    weight: z.coerce.number().optional().nullable(),
    dimensions: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    base_price: z.coerce.number().min(0, 'Price must be 0 or greater'),
    cost_price: z.coerce.number().min(0, 'Cost must be 0 or greater'),
  })

  // get initial price from first variant if editing
  const getInitialPrice = () => {
    if (!currentRow) return 0
    if (currentRow.product_variants && currentRow.product_variants.length > 0) {
      return Number(currentRow.product_variants[0].price) || 0
    }
    return 0
  }

  const getInitialCost = () => {
    if (!currentRow) return 0
    if (currentRow.product_variants && currentRow.product_variants.length > 0) {
      return Number(currentRow.product_variants[0].cost_price) || 0
    }
    return 0
  }

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          base_price: getInitialPrice(),
          cost_price: getInitialCost(),
        }
      : {
          name: '',
          description: '',
          base_price: 0,
          cost_price: 0,
          sku: '',
          barcode: '',
          category_id: null,
          weight: null,
          dimensions: '',
          is_active: true,
        },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { base_price, cost_price, ...productData } = values
      
      let productId = currentRow?.product_id
      
      if (isEdit) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('product_id', productId)

        if (error) throw error
      } else {
        const { data, error } = await supabase.from('products').insert([productData]).select('product_id').single()

        if (error) throw error
        productId = data.product_id
      }
      
      // Upsert the main variant
      if (productId) {
        const variantData = {
          product_id: productId,
          sku: values.sku,
          barcode: values.barcode,
          price: base_price,
          cost_price: cost_price,
          is_active: values.is_active,
        }
        
        let existingVariantId = null
        if (isEdit && currentRow?.product_variants && currentRow.product_variants.length > 0) {
          existingVariantId = currentRow.product_variants[0].id
        }
        
        if (existingVariantId) {
          await supabase.from('product_variants').update(variantData).eq('id', existingVariantId)
        } else {
          await supabase.from('product_variants').insert([variantData])
        }
      }

      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) form.reset()
      }}
    >
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update product details below.'
              : 'Fill in the details to create a new product.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='product-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g. Wireless Mouse' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='sku'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder='SKU-123' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='barcode'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <div className='flex gap-2'>
                      <FormControl>
                        <Input
                          placeholder='Optional'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        title='Scan Barcode'
                        onClick={() => setIsScannerOpen(true)}
                      >
                        <LucideScan className='h-4 w-4' />
                      </Button>
                    </div>

                    <QRCodeScanner
                      open={isScannerOpen}
                      onOpenChange={setIsScannerOpen}
                      onScan={(data: string) => {
                        field.onChange(data)
                        setIsScannerOpen(false)
                      }}
                    />
                    {field.value && (
                      <div className='mt-2'>
                        <BarcodeDisplay
                          value={field.value}
                          type={field.value.length > 20 ? 'qrcode' : 'barcode'}
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Product details...'
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
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                    value={field.value?.toString() || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a category' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem
                          key={category.category_id}
                          value={category.category_id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='base_price'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                        onBlur={field.onBlur}
                        value={(field.value as number) ?? ''}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='cost_price'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                        onBlur={field.onBlur}
                        value={(field.value as number) ?? ''}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='weight'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.1'
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                        onBlur={field.onBlur}
                        value={(field.value as number) ?? ''}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='dimensions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimensions</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. 10x5x2'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='product-form'>
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
