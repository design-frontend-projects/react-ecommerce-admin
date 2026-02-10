// Table Dialog Component
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Circle, Loader2, Square } from 'lucide-react'
import { toast } from 'sonner'
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
import { Switch } from '@/components/ui/switch'
import { useCreateTable, useUpdateTable } from '../api/mutations'
import { useFloors } from '../api/queries'
import { tableFormSchema, type TableForm } from '../schemas/floors.schema'
import type { ResTable } from '../types'

interface TableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table?: ResTable | null
  defaultFloorId?: string
}

export function TableDialog({
  open,
  onOpenChange,
  table,
  defaultFloorId,
}: TableDialogProps) {
  const isEditing = !!table

  const { data: floors } = useFloors()

  const form = useForm<TableForm>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      floor_id: defaultFloorId || '',
      table_number: '',
      seats: 4,
      position_x: 0,
      position_y: 0,
      shape: 'square',
      is_active: true,
    },
  })

  const createTable = useCreateTable()
  const updateTableMutation = useUpdateTable()

  const isLoading = createTable.isPending || updateTableMutation.isPending

  useEffect(() => {
    if (table) {
      form.reset({
        floor_id: table.floor_id,
        table_number: table.table_number,
        seats: table.seats,
        position_x: table.position_x,
        position_y: table.position_y,
        shape: table.shape as 'square' | 'round' | 'rectangle',
        is_active: table.is_active,
      })
    } else {
      form.reset({
        floor_id: defaultFloorId || '',
        table_number: '',
        seats: 4,
        position_x: 0,
        position_y: 0,
        shape: 'square',
        is_active: true,
      })
    }
  }, [table, defaultFloorId, form])

  async function onSubmit(values: TableForm) {
    try {
      if (isEditing && table) {
        await updateTableMutation.mutateAsync({
          tableId: table.id,
          floorId: values.floor_id,
          tableNumber: values.table_number,
          seats: values.seats,
          positionX: values.position_x,
          positionY: values.position_y,
          shape: values.shape,
          isActive: values.is_active,
        })
        toast.success('Table updated', {
          description: 'Table has been updated successfully.',
        })
      } else {
        await createTable.mutateAsync({
          floorId: values.floor_id,
          tableNumber: values.table_number,
          seats: values.seats,
          positionX: values.position_x,
          positionY: values.position_y,
          shape: values.shape,
          isActive: values.is_active,
        })
        toast.success('Table created', {
          description: 'Table has been created successfully.',
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Table' : 'Add Table'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update table details.' : 'Add a new table.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='floor_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select floor' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {floors?.map((floor) => (
                        <SelectItem key={floor.id} value={floor.id}>
                          {floor.name}
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
              name='table_number'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Number</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., T-01' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='seats'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Seats</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='shape'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Shape</FormLabel>
                  <div className='flex gap-2'>
                    {[
                      { value: 'square', icon: Square, label: 'Square' },
                      { value: 'round', icon: Circle, label: 'Round' },
                      {
                        value: 'rectangle',
                        icon: Square,
                        label: 'Rectangle',
                      },
                    ].map((shape) => (
                      <Button
                        key={shape.value}
                        type='button'
                        variant={
                          field.value === shape.value ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => field.onChange(shape.value)}
                        className='flex items-center gap-1'
                      >
                        <shape.icon className='h-4 w-4' />
                        {shape.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='position_x'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position X</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='position_y'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Y</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>Active</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      Enable this table for orders
                    </p>
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

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
