'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { Plus, Trash2 } from 'lucide-react'
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
import { createTransaction } from '../data/api'
import {
  transactionFormSchema,
  type TransactionFormValues,
  type TransactionRow,
} from '../data/schema'

interface Props {
  currentRow?: TransactionRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionActionDialog({
  currentRow,
  open,
  onOpenChange,
}: Props) {
  const isEdit = !!currentRow
  const queryClient = useQueryClient()
  const { user } = useUser()

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, products(product_id, name, base_price)')
      if (error) throw error
      return data || []
    },
  })

  // We only support creating new transactions through the form. Read-only for edit right now.
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transaction_type: 'sale',
      currency: 'USD',
      notes: '',
      items: [
        {
          product_id: 0,
          quantity: 1,
          unit_price: 0,
          discount_amount: 0,
          tax_amount: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      if (isEdit) {
        toast.error('Editing existing transactions is not supported yet')
        return
      }

      if (!user?.id) {
        toast.error('User not authenticated')
        return
      }

      // Generate a dummy tenant ID for demonstration purposes (you should get this from actual user context in production)
      const dummyTenantId = '00000000-0000-0000-0000-000000000001'

      await createTransaction({
        tenant_id: dummyTenantId,
        clerk_user_id: user.id,
        transaction_number: `TRX-${Date.now()}`,
        transaction_type: values.transaction_type,
        currency: values.currency,
        notes: values.notes || '',
        items: values.items.map((i) => ({
          ...i,
          product_id: Number(i.product_id),
        })),
      })

      toast.success('Transaction created successfully')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'View Transaction' : 'New Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Transaction details are read-only.'
              : 'Create a new sale, purchase, return, or adjustment.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='transaction-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='transaction_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='sale'>Sale</SelectItem>
                        <SelectItem value='purchase'>Purchase</SelectItem>
                        <SelectItem value='return'>Return</SelectItem>
                        <SelectItem value='adjustment'>Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select currency' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='USD'>USD ($)</SelectItem>
                        <SelectItem value='EUR'>EUR (€)</SelectItem>
                        <SelectItem value='GBP'>GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional notes about this transaction...'
                      disabled={isEdit}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h4 className='text-sm font-medium'>Line Items</h4>
                {!isEdit && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8'
                    onClick={() =>
                      append({
                        product_id: 0,
                        quantity: 1,
                        unit_price: 0,
                        discount_amount: 0,
                        tax_amount: 0,
                      })
                    }
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add Item
                  </Button>
                )}
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className='grid grid-cols-12 items-end gap-3 rounded-md border p-3'
                >
                  <div className='col-span-12 sm:col-span-4'>
                    <FormField
                      control={form.control}
                      name={`items.${index}.product_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>Product</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(Number(val))
                              const selectedProduct = products?.find(
                                (p: any) =>
                                  p.products.product_id === Number(val)
                              )
                              if (selectedProduct) {
                                form.setValue(
                                  `items.${index}.unit_price`,
                                  selectedProduct.products.base_price
                                )
                              }
                            }}
                            value={field.value ? field.value.toString() : ''}
                            disabled={isEdit}
                          >
                            <FormControl>
                              <SelectTrigger className='h-8 text-xs'>
                                <SelectValue placeholder='Select product' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.map((p: any) => (
                                <SelectItem
                                  key={p.products.product_id}
                                  value={p.products.product_id.toString()}
                                >
                                  {p.products.name} (Stock: {p.quantity ?? 0})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className='col-span-4 sm:col-span-2'>
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>Qty</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min='1'
                              className='h-8 text-xs'
                              disabled={isEdit}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='col-span-4 sm:col-span-2'>
                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs'>Price</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='1'
                              min='1'
                              className='h-8 text-xs'
                              disabled={isEdit}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='col-span-2 pt-2 text-right sm:col-span-3'>
                    {(() => {
                      const qty = Number(
                        form.watch(`items.${index}.quantity`) || 0
                      )
                      const price = Number(
                        form.watch(`items.${index}.unit_price`) || 0
                      )
                      const discount = Number(
                        form.watch(`items.${index}.discount_amount`) || 0
                      )
                      const tax = Number(
                        form.watch(`items.${index}.tax_amount`) || 0
                      )
                      const subtotal = qty * price - discount + tax
                      return (
                        <span className='text-sm font-medium'>
                          ${subtotal.toFixed(2)}
                        </span>
                      )
                    })()}
                  </div>

                  {!isEdit && (
                    <div className='col-span-2 flex justify-end sm:col-span-1'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-destructive'
                        onClick={() => remove(index)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {fields.length === 0 && (
                <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                  No items added. Add an item to proceed.
                </div>
              )}
            </div>

            <div className='flex justify-end space-x-4 border-t pt-4'>
              <div className='text-right'>
                <p className='text-sm text-muted-foreground'>Total Amount</p>
                <p className='text-xl font-bold'>
                  $
                  {(() => {
                    const items = form.watch('items') || []
                    return items
                      .reduce((acc, curr) => {
                        const qty = Number(curr.quantity || 0)
                        const price = Number(curr.unit_price || 0)
                        const discount = Number(curr.discount_amount || 0)
                        const tax = Number(curr.tax_amount || 0)
                        return acc + (qty * price - discount + tax)
                      }, 0)
                      .toFixed(2)
                  })()}
                </p>
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isEdit && (
            <Button type='submit' form='transaction-form'>
              Confirm Transaction
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
