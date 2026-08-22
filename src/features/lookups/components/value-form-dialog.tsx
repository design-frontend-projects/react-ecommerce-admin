import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GitBranch, Code2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  lookupValueFormSchema,
  type LookupValueFormValues,
  type LookupValueItem,
} from '../data/schema'
import {
  useCreateLookupValue,
  useLookupValues,
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

const ICON_PRESETS = [
  'Package',
  'Boxes',
  'Receipt',
  'Truck',
  'Warehouse',
  'Building2',
  'MapPin',
  'Scale',
  'Droplets',
  'Ruler',
  'Clock',
  'Tag',
  'ShoppingCart',
  'Users',
  'CheckCircle',
  'AlertTriangle',
]

export function ValueFormDialog() {
  const {
    selectedType,
    isCreateOpen,
    setIsCreateOpen,
    editingValue,
    setEditingValue,
    parentValueForCreate,
    setParentValueForCreate,
  } = useLookupsContext()

  const isOpen = isCreateOpen || !!editingValue
  const isEditing = !!editingValue

  const { data: currentValuesData } = useLookupValues(
    selectedType?.code || null,
    true
  )

  const potentialParents = React.useMemo(() => {
    const list = currentValuesData?.values || []
    if (isEditing && editingValue) {
      return list.filter((v: LookupValueItem) => v.id !== editingValue.id)
    }
    return list
  }, [currentValuesData, isEditing, editingValue])

  const createMutation = useCreateLookupValue(selectedType?.code || '')
  const updateMutation = useUpdateLookupValue(selectedType?.code || '')

  const form = useForm<LookupValueFormValues>({
    resolver: zodResolver(lookupValueFormSchema),
    defaultValues: {
      code: '',
      name: '',
      nameAr: '',
      description: '',
      color: '',
      icon: '',
      parentId: null,
      isDefault: false,
      isActive: true,
      sortOrder: 0,
      metadataJson: '',
    },
  })

  React.useEffect(() => {
    if (editingValue) {
      const meta =
        editingValue.metadata && typeof editingValue.metadata === 'object'
          ? (editingValue.metadata as Record<string, unknown>)
          : {}
      const parentIdFromMeta =
        ('parent_id' in editingValue ? (editingValue as { parent_id?: string | null }).parent_id : null) ||
        (typeof meta.parent_id === 'string' ? meta.parent_id : null)

      form.reset({
        code: editingValue.code,
        name: editingValue.name,
        nameAr: editingValue.name_ar || '',
        description: editingValue.description || '',
        color: editingValue.color || '',
        icon: editingValue.icon || '',
        parentId: parentIdFromMeta,
        isDefault: editingValue.is_default,
        isActive: editingValue.is_active,
        sortOrder: editingValue.sort_order,
        metadataJson:
          Object.keys(meta).length > 0
            ? JSON.stringify(meta, null, 2)
            : '',
      })
    } else if (isCreateOpen) {
      form.reset({
        code: '',
        name: '',
        nameAr: '',
        description: '',
        color: '',
        icon: '',
        parentId: parentValueForCreate || null,
        isDefault: false,
        isActive: true,
        sortOrder: 0,
        metadataJson: '',
      })
    }
  }, [editingValue, form, isOpen, isCreateOpen, parentValueForCreate])

  const handleClose = () => {
    setIsCreateOpen(false)
    setEditingValue(null)
    setParentValueForCreate(null)
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
      <DialogContent className='sm:max-w-[560px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            {isEditing ? 'Edit Lookup Option' : `Add Option to ${selectedType?.name || 'Catalog'}`}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {isEditing
              ? `Update configuration, parent hierarchy, and metadata for '${editingValue?.name}'.`
              : `Create a new option under catalog '${selectedType?.name}' (${selectedType?.code}).`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3.5 py-1 text-xs'>
            {/* Code and Sort Order */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Option Code <span className='text-rose-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., cold_storage, tier_vip'
                        disabled={isEditing && editingValue?.is_system}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
                          )
                        }
                        className='font-mono text-xs'
                      />
                    </FormControl>
                    <FormDescription className='text-[10px]'>
                      Unique code within this catalog.
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
                    <FormLabel className='text-xs font-semibold'>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='0'
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        className='text-xs font-mono'
                      />
                    </FormControl>
                    <FormDescription className='text-[10px]'>
                      Position index in lists.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Display Names (English & Arabic) */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Display Name (English) <span className='text-rose-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='e.g., Cold Storage Facility' {...field} className='text-xs' />
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
                    <FormLabel className='text-xs font-semibold'>Display Name (Arabic)</FormLabel>
                    <FormControl>
                      <Input
                        dir='rtl'
                        placeholder='الاسم باللغة العربية'
                        {...field}
                        value={field.value || ''}
                        className='text-xs font-arabic'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Parent Hierarchy Selector */}
            <FormField
              control={form.control}
              name='parentId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                    <GitBranch className='h-3.5 w-3.5 text-primary' />
                    <span>Parent Option (Hierarchy Link)</span>
                  </FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                  >
                    <FormControl>
                      <SelectTrigger className='text-xs bg-background'>
                        <SelectValue placeholder='None (Root level option in this catalog)' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>
                        None (Root level option in this catalog)
                      </SelectItem>
                      {potentialParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name} ({parent.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className='text-[10px]'>
                    Nests this option underneath a parent to build tree hierarchies.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional details or operational context for this option...'
                      rows={2}
                      {...field}
                      value={field.value || ''}
                      className='text-xs resize-none'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color selector & Icon */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='color'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Color Tag</FormLabel>
                    <div className='space-y-1.5'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.hex}
                            type='button'
                            onClick={() => field.onChange(preset.hex)}
                            className={`h-5 w-5 rounded-full border-2 transition-all ${
                              field.value === preset.hex
                                ? 'border-primary scale-110 shadow-xs ring-1 ring-primary'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                      <Input
                        placeholder='#3b82f6'
                        className='h-7 text-xs font-mono w-full'
                        {...field}
                        value={field.value || ''}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='icon'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>Icon Identifier</FormLabel>
                    <div className='space-y-1.5'>
                      <Select
                        value={field.value || ''}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <FormControl>
                          <SelectTrigger className='h-7 text-xs bg-background'>
                            <SelectValue placeholder='Select common icon' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICON_PRESETS.map((iconName) => (
                            <SelectItem key={iconName} value={iconName}>
                              {iconName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder='Custom Lucide Icon name'
                        className='h-7 text-xs font-mono'
                        {...field}
                        value={field.value || ''}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Metadata JSON */}
            <FormField
              control={form.control}
              name='metadataJson'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                    <Code2 className='h-3.5 w-3.5 text-primary' />
                    <span>Custom Metadata JSON (Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{\n  "priority": "high",\n  "department": "operations"\n}'
                      rows={2}
                      {...field}
                      value={field.value || ''}
                      className='text-xs font-mono resize-none'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Toggles */}
            <div className='grid grid-cols-2 gap-3 pt-1 border-t'>
              <FormField
                control={form.control}
                name='isDefault'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-2.5 shadow-2xs'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-xs font-semibold'>Default</FormLabel>
                      <FormDescription className='text-[10px]'>
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
                  <FormItem className='flex items-center justify-between rounded-lg border p-2.5 shadow-2xs'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-xs font-semibold'>Active</FormLabel>
                      <FormDescription className='text-[10px]'>
                        Available for selection.
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

            <DialogFooter className='pt-3 gap-2'>
              <Button type='button' variant='outline' size='sm' onClick={handleClose} disabled={isPending} className='text-xs'>
                Cancel
              </Button>
              <Button type='submit' size='sm' disabled={isPending} className='text-xs font-semibold'>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Option'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
