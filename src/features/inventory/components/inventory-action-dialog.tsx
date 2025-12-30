'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { inventorySchema, type Inventory } from '../data/schema'

interface Props {
  currentRow?: Inventory
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryActionDialog({
  currentRow,
  open,
  onOpenChange,
}: Props) {
  const isEdit = !!currentRow
  const queryClient = useQueryClient()

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('product_id, name')
        .order('name')
      if (error) throw error
      return data
    },
  })

  // We need to cast the default values to match the schema
  // especially for numbers that might come as null from DB but schema expects optional number
  const form = useForm({
    resolver: zodResolver(inventorySchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          product_id: currentRow.product_id,
          reorder_level: currentRow.reorder_level ?? null,
          max_stock_level: currentRow.max_stock_level ?? null,
        }
      : {
          product_id: undefined,
          quantity: 0,
          reorder_level: null,
          max_stock_level: null,
          location: '',
          last_restocked: new Date().toISOString(),
        },
  })

  const onSubmit = async (values: Inventory) => {
    try {
      // Clean up values
      const cleanValues = {
        ...values,
        reorder_level:
          values.reorder_level === '' ? null : values.reorder_level,
        max_stock_level:
          values.max_stock_level === '' ? null : values.max_stock_level,
      } as any // casting to any for supabase insertion to avoid strict type checks on optional fields if needed, or better, cast to Partial<Inventory>

      if (isEdit) {
        const { error } = await supabase
          .from('inventory')
          .update(cleanValues)
          .eq('inventory_id', currentRow.inventory_id)

        if (error) throw error
        toast.success('Inventory updated successfully')
      } else {
        const { error } = await supabase.from('inventory').insert([cleanValues])

        if (error) throw error
        toast.success('Inventory created successfully')
      }

      queryClient.invalidateQueries({ queryKey: ['inventory'] })
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
            {isEdit ? 'Edit Inventory' : 'Add Inventory'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update inventory details below.'
              : 'Add new inventory record.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='inventory-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='product_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value?.toString() || ''}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a product' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem
                          key={product.product_id}
                          value={product.product_id.toString()}
                        >
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='reorder_level'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') field.onChange(null)
                          else field.onChange(Number(val))
                        }}
                        value={field.value ?? ''}
                        placeholder='Optional'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='max_stock_level'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Stock</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') field.onChange(null)
                          else field.onChange(Number(val))
                        }}
                        value={field.value ?? ''}
                        placeholder='Optional'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Warehouse A, Aisle 3'
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
              name='last_restocked'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Restocked</FormLabel>
                  <FormControl>
                    <Input
                      type='datetime-local'
                      {...field}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(new Date(e.target.value).toISOString())
                      }
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
          <Button type='submit' form='inventory-form'>
            {isEdit ? 'Save Changes' : 'Create Inventory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
