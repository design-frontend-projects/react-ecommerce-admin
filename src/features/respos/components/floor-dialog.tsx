// Floor Dialog Component
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCreateFloor, useUpdateFloor } from '../api/mutations'
import { floorFormSchema, type FloorForm } from '../schemas/floors.schema'
import type { ResFloor } from '../types'

interface FloorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor?: ResFloor | null
}

export function FloorDialog({ open, onOpenChange, floor }: FloorDialogProps) {
  const isEditing = !!floor

  const form = useForm<FloorForm>({
    resolver: zodResolver(floorFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
      is_active: true,
    },
  })

  const createFloor = useCreateFloor()
  const updateFloorMutation = useUpdateFloor()

  const isLoading = createFloor.isPending || updateFloorMutation.isPending

  useEffect(() => {
    if (floor) {
      form.reset({
        name: floor.name,
        description: floor.description || '',
        sort_order: floor.sort_order,
        is_active: floor.is_active,
      })
    } else {
      form.reset({
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
      })
    }
  }, [floor, form])

  async function onSubmit(values: FloorForm) {
    try {
      if (isEditing && floor) {
        await updateFloorMutation.mutateAsync({
          floorId: floor.id,
          name: values.name,
          description: values.description || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success('Floor updated', {
          description: 'Floor has been updated successfully.',
        })
      } else {
        await createFloor.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          sortOrder: values.sort_order,
          isActive: values.is_active,
        })
        toast.success('Floor created', {
          description: 'Floor has been created successfully.',
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
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Floor' : 'Add Floor'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update floor details.'
              : 'Add a new floor for table management.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., Ground Floor' {...field} />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Description of this floor...'
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
              name='sort_order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
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
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>Active</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      Enable this floor for table selection
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
