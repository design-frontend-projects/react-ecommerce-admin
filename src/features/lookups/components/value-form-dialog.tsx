import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  lookupValueFormSchema,
  type LookupValueFormValues,
} from '../data/schema'
import {
  useCreateLookupValue,
  useUpdateLookupValue,
} from '../hooks/use-lookups'
import { useLookupsContext } from './provider'

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Slate', hex: '#64748b' },
]

export function ValueFormDialog() {
  const {
    selectedType,
    isCreateOpen,
    setIsCreateOpen,
    editingValue,
    setEditingValue,
  } = useLookupsContext()

  const isOpen = isCreateOpen || !!editingValue
  const isEditing = !!editingValue

  const createMutation = useCreateLookupValue(selectedType?.code || '')
  const updateMutation = useUpdateLookupValue(selectedType?.code || '')

  const form = useForm<LookupValueFormValues>({
    resolver: zodResolver(lookupValueFormSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      nameAr: '',
      description: '',
      color: '',
      icon: '',
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    },
  })

  React.useEffect(() => {
    if (editingValue) {
      form.reset({
        code: editingValue.code,
        name: editingValue.name,
        nameAr: editingValue.name_ar || '',
        description: editingValue.description || '',
        color: editingValue.color || '',
        icon: editingValue.icon || '',
        isDefault: editingValue.is_default,
        isActive: editingValue.is_active,
        sortOrder: editingValue.sort_order,
      })
    } else {
      form.reset({
        code: '',
        name: '',
        nameAr: '',
        description: '',
        color: '',
        icon: '',
        isDefault: false,
        isActive: true,
        sortOrder: 0,
      })
    }
  }, [editingValue, form, isOpen])

  const handleClose = () => {
    setIsCreateOpen(false)
    setEditingValue(null)
    form.reset()
  }

  const onSubmit = async (values: LookupValueFormValues) => {
    if (!selectedType) return

    if (isEditing && editingValue) {
      await updateMutation.mutateAsync({
        id: editingValue.id,
        input: values,
      })
    } else {
      await createMutation.mutateAsync(values)
    }
    handleClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-[540px]'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Lookup Value' : `Add ${selectedType?.name || 'Lookup'} Value`}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update configuration and metadata for '${editingValue?.name}'.`
              : `Create a new custom value for '${selectedType?.name}'.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 py-2'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unique Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., custom_damage'
                        disabled={isEditing && editingValue?.is_system}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Identifier used in API and database.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='sortOrder'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='0'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      Display position in dropdown lists.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (EN)</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g., Patient Return' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='nameAr'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (AR)</FormLabel>
                    <FormControl>
                      <Input
                        dir='rtl'
                        placeholder='الاسم باللغة العربية'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
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
                      placeholder='Optional details or operational context for this option...'
                      rows={2}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color selector */}
            <FormField
              control={form.control}
              name='color'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge / Status Color</FormLabel>
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type='button'
                          onClick={() => field.onChange(preset.hex)}
                          className={`h-6 w-6 rounded-full border-2 transition-all ${
                            field.value === preset.hex
                              ? 'border-primary scale-110 shadow-sm'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <Input
                      placeholder='#3b82f6'
                      className='w-28 h-8 text-xs font-mono'
                      {...field}
                      value={field.value || ''}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4 pt-2 border-t'>
              <FormField
                control={form.control}
                name='isDefault'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3 shadow-xs'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-sm'>Default Option</FormLabel>
                      <FormDescription className='text-xs'>
                        Auto-select in forms.
                      </FormDescription>
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
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3 shadow-xs'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-sm'>Active Status</FormLabel>
                      <FormDescription className='text-xs'>
                        Visible for selection.
                      </FormDescription>
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

            <DialogFooter className='pt-4'>
              <Button type='button' variant='outline' onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Value'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
