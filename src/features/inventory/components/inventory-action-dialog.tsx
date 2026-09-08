'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Package, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventorySchema, type Inventory, type InventoryFormValues } from '../data/schema'
import {
  useCreateInventory,
  useUpdateInventory,
  useInventoryProducts,
  useProductVariants,
} from '../hooks/use-inventory'

interface Props {
  currentRow?: Inventory | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryActionDialog({
  currentRow,
  open,
  onOpenChange,
}: Props) {
  const isEdit = !!currentRow
  const createMutation = useCreateInventory()
  const updateMutation = useUpdateInventory()

  const { data: products, isLoading: isLoadingProducts } = useInventoryProducts()

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema) as Resolver<InventoryFormValues>,
    defaultValues: {
      product_id: '',
      product_variant_id: null,
      quantity: 0,
      reorder_point: 10,
      min_quantity: 10,
      max_quantity: 100,
      last_count_date: new Date().toISOString(),
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedProduct = products?.find((p) => p.id === selectedProductId)

  const {
    data: variants,
    isLoading: isLoadingVariants,
  } = useProductVariants(selectedProductId)

  // When dialog opens or currentRow changes, update form values
  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          inventory_id: currentRow.inventory_id,
          product_id: currentRow.product_id,
          product_variant_id: currentRow.product_variant_id || null,
          quantity: currentRow.quantity ?? 0,
          reorder_point: currentRow.reorder_point ?? currentRow.reorder_level ?? 0,
          min_quantity: currentRow.min_quantity ?? currentRow.reorder_level ?? 0,
          max_quantity: currentRow.max_quantity ?? currentRow.max_stock_level ?? null,
          last_count_date:
            currentRow.last_count_date ||
            currentRow.last_restocked ||
            new Date().toISOString(),
          store_id: currentRow.store_id || null,
        })
      } else {
        form.reset({
          product_id: '',
          product_variant_id: null,
          quantity: 0,
          reorder_point: 10,
          min_quantity: 10,
          max_quantity: 100,
          last_count_date: new Date().toISOString(),
          store_id: null,
        })
      }
    }
  }, [open, currentRow, form])

  const onSubmit = async (values: InventoryFormValues) => {
    try {
      const payload = {
        ...values,
        product_variant_id:
          values.product_variant_id === 'none' || !values.product_variant_id
            ? null
            : values.product_variant_id,
      }

      if (isEdit && currentRow?.inventory_id) {
        await updateMutation.mutateAsync({
          ...payload,
          inventory_id: currentRow.inventory_id,
        })
        toast.success('Inventory updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Inventory record created successfully')
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save inventory record')
      }
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const hasVariants = Boolean(
    selectedProduct?.has_variants || (variants && variants.length > 0)
  )

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
          <DialogTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5 text-primary' />
            {isEdit ? 'Edit Inventory Record' : 'Add Inventory Record'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update stock counts, reorder thresholds, and product variant assignments.'
              : 'Track on-hand stock and safety thresholds for catalog products and variants.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='inventory-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            {/* Product Selection */}
            <FormField
              control={form.control}
              name='product_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center justify-between'>
                    <span>Product *</span>
                    {selectedProduct?.has_variants && (
                      <Badge variant='outline' className='text-xs font-normal'>
                        Has Variants
                      </Badge>
                    )}
                  </FormLabel>
                  <Select
                    disabled={isEdit || isLoadingProducts}
                    value={field.value || ''}
                    onValueChange={(val) => {
                      field.onChange(val)
                      // Reset variant when product changes
                      form.setValue('product_variant_id', null)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingProducts
                              ? 'Loading products...'
                              : 'Select a product'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='font-medium'>{product.name}</span>
                            {product.sku && (
                              <span className='text-xs text-muted-foreground'>
                                ({product.sku})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Variant Selection */}
            <FormField
              control={form.control}
              name='product_variant_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-1.5'>
                    <Layers className='h-4 w-4 text-muted-foreground' />
                    <span>Product Variant</span>
                    {hasVariants && (
                      <span className='text-xs text-muted-foreground font-normal'>
                        (Recommended)
                      </span>
                    )}
                  </FormLabel>
                  <Select
                    disabled={
                      !selectedProductId ||
                      isLoadingVariants ||
                      (!hasVariants && !isEdit)
                    }
                    value={field.value || 'none'}
                    onValueChange={(val) =>
                      field.onChange(val === 'none' ? null : val)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedProductId
                              ? 'Select a product first'
                              : isLoadingVariants
                              ? 'Loading variants...'
                              : hasVariants
                              ? 'Select a variant'
                              : 'No variants (Standard product)'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>
                        <span className='text-muted-foreground'>
                          -- Standard / Product Level (No Variant) --
                        </span>
                      </SelectItem>
                      {variants?.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>
                              {variant.name || 'Default'}
                            </span>
                            <span className='text-xs text-muted-foreground font-mono'>
                              [{variant.sku}]
                            </span>
                            {variant.price != null && (
                              <span className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold ms-auto'>
                                ${Number(variant.price).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasVariants ? (
                    <FormDescription className='text-xs'>
                      Select the specific SKU variant to track stock at the variant level.
                    </FormDescription>
                  ) : selectedProductId ? (
                    <FormDescription className='text-xs text-muted-foreground'>
                      This is a simple product with no variants defined.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>On-Hand Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      placeholder='0'
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? 0 : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thresholds: Reorder Point & Max Quantity */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='reorder_point'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Point (Min)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='e.g. 10'
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          const num = val === '' ? null : Number(val)
                          field.onChange(num)
                          form.setValue('min_quantity', num)
                        }}
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Triggers low stock alert.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='max_quantity'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Stock Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='e.g. 100'
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription className='text-[11px]'>
                      Optional maximum ceiling.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Last Count / Restock Date */}
            <FormField
              control={form.control}
              name='last_count_date'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Count / Verification Date</FormLabel>
                  <FormControl>
                    <Input
                      type='datetime-local'
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='inventory-form'
            disabled={isSubmitting || !selectedProductId}
          >
            {isSubmitting && <Loader2 className='me-2 h-4 w-4 animate-spin' />}
            {isEdit ? 'Save Changes' : 'Create Inventory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
