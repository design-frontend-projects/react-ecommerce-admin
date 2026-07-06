import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Scan as LucideScan, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
import { variantRowSchema } from '../data/product-wizard-schema'
import { useCreateProductWithVariants, useUpdateProductWithVariants } from '../hooks/use-products'
import { BarcodeDisplay } from './barcode-display'

interface Props {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductActionDialog({ currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProductWithVariants()
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProductWithVariants()
  const isPending = isCreating || isUpdating

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
    variants: z.array(variantRowSchema).optional(),
  })

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

  const getInitialBarcode = () => {
    if (!currentRow) return ''
    if (currentRow.barcode) return currentRow.barcode
    if (currentRow.product_variants && currentRow.product_variants.length > 0) {
      return currentRow.product_variants[0].barcode || ''
    }
    return ''
  }

  const getInitialWeight = () => {
    if (!currentRow) return null
    if (currentRow.weight) return Number(currentRow.weight)
    if (currentRow.product_variants && currentRow.product_variants.length > 0) {
      return currentRow.product_variants[0].weight ? Number(currentRow.product_variants[0].weight) : null
    }
    return null
  }

  const getInitialDimensions = () => {
    if (!currentRow) return ''
    if (currentRow.dimensions) return currentRow.dimensions
    if (currentRow.product_variants && currentRow.product_variants.length > 0) {
       const dims = currentRow.product_variants[0].dimensions
       if (typeof dims === 'string') return dims
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       if (dims && typeof dims === 'object' && 'label' in (dims as any)) return (dims as any).label as string
    }
    return ''
  }

  const getInitialVariants = () => {
    if (!currentRow || !currentRow.product_variants || currentRow.product_variants.length === 0) {
      return []
    }
    return currentRow.product_variants.map(v => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode || '',
      price: Number(v.price) || 0,
      cost_price: Number(v.cost_price) || 0,
      stock_quantity: v.stock_quantity || 0,
      min_stock: v.min_stock || 0,
      weight: v.weight ? Number(v.weight) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dimensions: v.dimensions ? (typeof v.dimensions === 'string' ? v.dimensions : (v.dimensions as any).label || '') : '',
      is_active: v.is_active ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributes_label: v.dimensions && typeof v.dimensions === 'object' && 'label' in (v.dimensions as any) ? (v.dimensions as any).label : '',
    }))
  }

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          base_price: getInitialPrice(),
          cost_price: getInitialCost(),
          barcode: getInitialBarcode(),
          weight: getInitialWeight(),
          dimensions: getInitialDimensions(),
          variants: getInitialVariants(),
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
          variants: [],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
       
      const { base_price, cost_price, variants, ...productData } = values
      
      const defaultVariant = {
        sku: values.sku,
        barcode: values.barcode,
        price: base_price,
        cost_price: cost_price,
        is_active: values.is_active,
        weight: values.weight,
        dimensions: values.dimensions,
        stock_quantity: 0,
        min_stock: 0,
        attributes_label: 'Default',
      }
      
      // Keep only variants UI fields if there are multiple, otherwise fall back to base fields for the single variant.
      // If editing and we already have a loaded variant array, use it. But if it's empty, use default variant.
      const finalVariants = (variants && variants.length > 0) ? variants : [defaultVariant]

      if (isEdit && currentRow) {
        await updateProduct({
          id: currentRow.product_id!,
          base: productData,
          variants: finalVariants,
        })
      } else {
        await createProduct({
          base: {
            ...productData,
            has_variants: finalVariants.length > 1,
          } as any,
          variants: finalVariants,
        })
      }

      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-4xl'>
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
                    <FormLabel>Base SKU</FormLabel>
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
                    <FormLabel>Base Barcode</FormLabel>
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
                    <FormLabel>Base Weight (kg)</FormLabel>
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
                    <FormLabel>Base Dimensions</FormLabel>
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

            {/* VARIANTS SECTION */}
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="text-lg font-medium">Product Variants</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    sku: form.getValues('sku') ? `${form.getValues('sku')}-V${fields.length + 1}` : '',
                    barcode: '',
                    price: form.getValues('base_price') || 0,
                    cost_price: form.getValues('cost_price') || 0,
                    stock_quantity: 0,
                    min_stock: 0,
                    weight: form.getValues('weight') || 0,
                    dimensions: form.getValues('dimensions') || '',
                    is_active: true,
                    attributes_label: `Variant ${fields.length + 1}`,
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              {form.formState.errors.variants && (
                <div className="text-sm font-medium text-destructive">
                  {form.formState.errors.variants.root?.message}
                </div>
              )}

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="pt-6 flex flex-col gap-4">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to remove this variant? This action will take effect when you save changes.')) {
                              remove(index)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      {/* --- Identity Row --- */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.attributes_label`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label / Size</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Large, Red" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.sku`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU *</FormLabel>
                              <FormControl>
                                <Input placeholder="Variant SKU" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.barcode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barcode</FormLabel>
                              <FormControl>
                                <Input placeholder="UPC/EAN" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.is_active`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:mt-[22px] h-[40px]">
                              <div className="space-y-0.5">
                                <FormLabel className="text-xs">Active</FormLabel>
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

                      {/* --- Finance & Stock Row --- */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price *</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" min="0" placeholder="0.00" {...field} value={(field.value as number) ?? ''} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.cost_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="any" 
                                  min="0" 
                                  placeholder="0.00" 
                                  {...field} 
                                  value={(field.value as number) ?? ''} 
                                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.stock_quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Initial Stock</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="0" {...field} value={(field.value as number) ?? ''} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.min_stock`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Stock Alert</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="0" {...field} value={(field.value as number) ?? ''} onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* --- Physical Row --- */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.weight`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="any" 
                                  min="0" 
                                  placeholder="0.00" 
                                  {...field} 
                                  value={(field.value as number) ?? ''} 
                                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.dimensions`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Dimensions (L x W x H)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 10x20x5 cm" {...field} value={field.value || ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {fields.length === 0 && (
                  <div className="text-center p-8 border rounded-lg border-dashed bg-muted/20">
                    <p className="text-muted-foreground text-sm">No variants configured. The base product details will be used.</p>
                  </div>
                )}
              </div>
            </div>

          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='product-form' disabled={isPending}>
            {isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Product')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
