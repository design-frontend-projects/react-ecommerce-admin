import { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useProducts } from '@/features/products/hooks/use-products'
import {
  adjustmentSchema,
  type AdjustmentFormData,
} from '../data/adjustment-schema'
import type { StockBalanceRow } from '../data/schema'
import {
  useAdjustStock,
  useStores,
  useProductVariants,
} from '../hooks/use-stock-balances'


interface Props {
  currentRow: StockBalanceRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdjustmentDialog({ currentRow, open, onOpenChange }: Props) {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  
  const adjustMutation = useAdjustStock()
  const { data: stores = [] } = useStores()
  const { data: products = [] } = useProducts()
  const { data: variants = [] } = useProductVariants(selectedProductId ?? undefined)

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema) as Resolver<AdjustmentFormData>,
    defaultValues: {
      store_id: '',
      product_variant_id: '',
      adjustment_type: 'set',
      quantity: 0,
      reason: '',
    },
  })

  // Pre-fill when row is selected
  useEffect(() => {
    if (currentRow && open) {
      const pid = currentRow.product_variants?.products?.product_id
      setSelectedProductId(pid || null)

      form.reset({

        store_id: currentRow.store_id,
        product_variant_id: currentRow.product_variant_id,
        adjustment_type: 'set',
        quantity: Number(currentRow.qty_on_hand),
        reason: '',
      })
    } else if (!currentRow && open) {

      setSelectedProductId(null)
      form.reset({
        store_id: '',
        product_variant_id: '',
        adjustment_type: 'set',
        quantity: 0,
        reason: '',
      })
    }
  }, [currentRow, open, form])


  const onSubmit = (values: AdjustmentFormData) => {
    adjustMutation.mutate(values, {
      onSuccess: () => {
        onOpenChange(false)
        form.reset()
      },
    })
  }

  const productName =
    currentRow?.product_variants?.products?.name || 'Unknown Product'
  const sku = currentRow?.product_variants?.sku || '—'
  const storeName = currentRow?.stores?.name || 'Unknown Store'

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
          <DialogTitle>Adjust Stock Balance</DialogTitle>
          <DialogDescription>
            {currentRow
              ? `${productName} (${sku}) at ${storeName}`
              : 'Select a product and store to manually adjust stock levels.'}
          </DialogDescription>
        </DialogHeader>

        {currentRow && (
          <div className='rounded-md border bg-muted/50 p-3 text-sm'>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div>
                <span className='text-xs text-muted-foreground uppercase font-bold'>On Hand</span>
                <p className='font-mono font-semibold text-lg'>
                  {Number(currentRow?.qty_on_hand ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <span className='text-xs text-muted-foreground uppercase font-bold'>Reserved</span>
                <p className='font-mono font-semibold text-lg'>
                  {Number(currentRow?.qty_reserved ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <span className='text-xs text-muted-foreground uppercase font-bold'>Available</span>
                <p className='font-mono font-semibold text-lg'>
                  {Number(currentRow?.qty_available ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}


        <Form {...form}>
          <form
            id='adjustment-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='store_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!currentRow}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select store' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s.store_id} value={s.store_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select
                  onValueChange={(val) => {
                    setSelectedProductId(Number(val))
                    form.setValue('product_variant_id', '')
                  }}
                  value={selectedProductId?.toString() || ''}
                  disabled={!!currentRow}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select product' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products?.map((p) => {
                      const pid = p.product_id?.toString()
                      if (!pid) return null
                      return (
                        <SelectItem key={pid} value={pid}>
                          {p.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>


                </Select>
                <FormMessage />
              </FormItem>

              <FormField
                control={form.control}
                name='product_variant_id'
                render={({ field }) => (
                  <FormItem className='sm:col-span-2'>
                    <FormLabel>Variant / SKU</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!currentRow || !selectedProductId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedProductId
                                ? 'Select product first'
                                : 'Select variant'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {variants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.sku} — ${Number(v.price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='adjustment_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='set'>
                        Set absolute quantity
                      </SelectItem>
                      <SelectItem value='offset'>
                        Add / subtract offset
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => {
                const adjType = form.watch('adjustment_type')
                return (
                  <FormItem>
                    <FormLabel>
                      {adjType === 'set'
                        ? 'New Quantity'
                        : 'Offset (+ or -)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='any'
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />


            <FormField
              control={form.control}
              name='reason'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='e.g. Physical count audit, damaged goods write-off...'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type='submit'
            form='adjustment-form'
            disabled={adjustMutation.isPending}
          >
            {adjustMutation.isPending ? 'Saving...' : 'Apply Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
