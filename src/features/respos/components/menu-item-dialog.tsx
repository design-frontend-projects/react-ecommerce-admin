// Menu Item Dialog Component with Variants and Properties
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateMenuItem,
  useUpdateMenuItem,
  useCreateItemVariant,
  useDeleteItemVariant,
  useCreateItemProperty,
  useDeleteItemProperty,
} from '../api/mutations'
import { useMenuCategories } from '../api/queries'
import { menuItemFormSchema, type MenuItemForm } from '../schemas/menu.schema'
import type { ResMenuItemWithDetails } from '../types'

interface MenuItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ResMenuItemWithDetails | null
}

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
}: MenuItemDialogProps) {
  const isEditing = !!item
  const [allergenInput, setAllergenInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  const { data: categories } = useMenuCategories()

  const form = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      category_id: null,
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      base_price: 0,
      image_url: '',
      is_available: true,
      preparation_time: 15,
      allergens: [],
      tags: [],
      variants: [],
      properties: [],
    },
  })

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const {
    fields: propertyFields,
    append: appendProperty,
    remove: removeProperty,
  } = useFieldArray({
    control: form.control,
    name: 'properties',
  })

  const createMenuItem = useCreateMenuItem()
  const updateMenuItem = useUpdateMenuItem()
  const createVariant = useCreateItemVariant()
  const deleteVariant = useDeleteItemVariant()
  const createProperty = useCreateItemProperty()
  const deleteProperty = useDeleteItemProperty()

  const isLoading =
    createMenuItem.isPending ||
    updateMenuItem.isPending ||
    createVariant.isPending ||
    deleteVariant.isPending

  useEffect(() => {
    if (item) {
      form.reset({
        category_id: item.category_id || null,
        name: item.name,
        name_ar: item.name_ar || '',
        description: item.description || '',
        description_ar: item.description_ar || '',
        base_price: item.base_price,
        image_url: item.image_url || '',
        is_available: item.is_available,
        preparation_time: item.preparation_time,
        allergens: item.allergens || [],
        tags: item.tags || [],
        variants:
          item.variants?.map((v) => ({
            id: v.id,
            name: v.name,
            price_adjustment: v.price_adjustment,
            is_default: v.is_default,
          })) || [],
        properties:
          item.properties?.map((p) => ({
            id: p.id,
            name: p.name,
            options: p.options,
            is_required: p.is_required,
            max_selections: p.max_selections,
          })) || [],
      })
    } else {
      form.reset({
        category_id: null,
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        base_price: 0,
        image_url: '',
        is_available: true,
        preparation_time: 15,
        allergens: [],
        tags: [],
        variants: [],
        properties: [],
      })
    }
  }, [item, form])

  const handleAddAllergen = () => {
    if (allergenInput.trim()) {
      const current = form.getValues('allergens')
      if (!current.includes(allergenInput.trim())) {
        form.setValue('allergens', [...current, allergenInput.trim()])
      }
      setAllergenInput('')
    }
  }

  const handleRemoveAllergen = (allergen: string) => {
    const current = form.getValues('allergens')
    form.setValue(
      'allergens',
      current.filter((a) => a !== allergen)
    )
  }

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const current = form.getValues('tags')
      if (!current.includes(tagInput.trim())) {
        form.setValue('tags', [...current, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    const current = form.getValues('tags')
    form.setValue(
      'tags',
      current.filter((t) => t !== tag)
    )
  }

  async function onSubmit(values: MenuItemForm) {
    try {
      let itemId: string

      if (isEditing && item) {
        await updateMenuItem.mutateAsync({
          itemId: item.id,
          categoryId: values.category_id || undefined,
          name: values.name,
          nameAr: values.name_ar || undefined,
          description: values.description || undefined,
          descriptionAr: values.description_ar || undefined,
          basePrice: values.base_price,
          imageUrl: values.image_url || undefined,
          isAvailable: values.is_available,
          preparationTime: values.preparation_time,
          allergens: values.allergens,
          tags: values.tags,
        })
        itemId = item.id

        // Handle variant changes
        const existingVariantIds = item.variants?.map((v) => v.id) || []
        const newVariantIds = values.variants
          .filter((v) => v.id)
          .map((v) => v.id as string)

        // Delete removed variants
        for (const vid of existingVariantIds) {
          if (!newVariantIds.includes(vid)) {
            await deleteVariant.mutateAsync(vid)
          }
        }

        // Create new variants
        for (const variant of values.variants) {
          if (!variant.id) {
            await createVariant.mutateAsync({
              itemId,
              name: variant.name,
              priceAdjustment: variant.price_adjustment,
              isDefault: variant.is_default,
            })
          }
        }

        // Handle property changes
        const existingPropertyIds = item.properties?.map((p) => p.id) || []
        const newPropertyIds = values.properties
          .filter((p) => p.id)
          .map((p) => p.id as string)

        // Delete removed properties
        for (const pid of existingPropertyIds) {
          if (!newPropertyIds.includes(pid)) {
            await deleteProperty.mutateAsync(pid)
          }
        }

        // Create new properties
        for (const property of values.properties) {
          if (!property.id) {
            await createProperty.mutateAsync({
              itemId,
              name: property.name,
              options: property.options,
              isRequired: property.is_required,
              maxSelections: property.max_selections,
            })
          }
        }

        toast.success('Menu item updated', {
          description: 'Menu item has been updated successfully.',
        })
      } else {
        const result = await createMenuItem.mutateAsync({
          categoryId: values.category_id || undefined,
          name: values.name,
          nameAr: values.name_ar || undefined,
          description: values.description || undefined,
          descriptionAr: values.description_ar || undefined,
          basePrice: values.base_price,
          imageUrl: values.image_url || undefined,
          preparationTime: values.preparation_time,
          allergens: values.allergens,
          tags: values.tags,
        })
        itemId = result.id

        // Create variants
        for (const variant of values.variants) {
          await createVariant.mutateAsync({
            itemId,
            name: variant.name,
            priceAdjustment: variant.price_adjustment,
            isDefault: variant.is_default,
          })
        }

        // Create properties
        for (const property of values.properties) {
          await createProperty.mutateAsync({
            itemId,
            name: property.name,
            options: property.options,
            isRequired: property.is_required,
            maxSelections: property.max_selections,
          })
        }

        toast.success('Menu item created', {
          description: 'Menu item has been created successfully.',
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
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the menu item details, variants, and properties.'
              : 'Add a new menu item with optional variants and customization properties.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <Tabs defaultValue='basic' className='w-full'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='basic'>Basic Info</TabsTrigger>
                <TabsTrigger value='variants'>Variants</TabsTrigger>
                <TabsTrigger value='properties'>Properties</TabsTrigger>
              </TabsList>

              <TabsContent value='basic' className='space-y-4 pt-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='e.g., Margherita Pizza'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='name_ar'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='بيتزا مارغريتا'
                            dir='rtl'
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
                  name='category_id'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a category' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
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
                        <FormLabel>Base Price</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            min={0}
                            placeholder='0.00'
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='preparation_time'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep Time (min)</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={1}
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
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
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Describe the item...'
                          className='resize-none'
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
                  name='image_url'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://example.com/image.jpg'
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allergens */}
                <div className='space-y-2'>
                  <FormLabel>Allergens</FormLabel>
                  <div className='flex gap-2'>
                    <Input
                      placeholder='e.g., Gluten, Dairy'
                      value={allergenInput}
                      onChange={(e) => setAllergenInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddAllergen()
                        }
                      }}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleAddAllergen}
                    >
                      Add
                    </Button>
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {form.watch('allergens').map((allergen) => (
                      <Badge key={allergen} variant='secondary'>
                        {allergen}
                        <button
                          type='button'
                          onClick={() => handleRemoveAllergen(allergen)}
                          className='ml-1'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className='space-y-2'>
                  <FormLabel>Tags</FormLabel>
                  <div className='flex gap-2'>
                    <Input
                      placeholder='e.g., Spicy, Vegan'
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleAddTag}
                    >
                      Add
                    </Button>
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {form.watch('tags').map((tag) => (
                      <Badge key={tag} variant='outline'>
                        {tag}
                        <button
                          type='button'
                          onClick={() => handleRemoveTag(tag)}
                          className='ml-1'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name='is_available'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                      <div className='space-y-0.5'>
                        <FormLabel>Available</FormLabel>
                        <p className='text-sm text-muted-foreground'>
                          Show this item on the menu
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
              </TabsContent>

              <TabsContent value='variants' className='space-y-4 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-muted-foreground'>
                    Add size or type variations (e.g., Small, Medium, Large)
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      appendVariant({
                        name: '',
                        price_adjustment: 0,
                        is_default: false,
                      })
                    }
                  >
                    <Plus className='mr-1 h-4 w-4' />
                    Add Variant
                  </Button>
                </div>

                {variantFields.length === 0 && (
                  <p className='py-4 text-center text-sm text-muted-foreground'>
                    No variants added. Click "Add Variant" to create one.
                  </p>
                )}

                {variantFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader className='pb-2'>
                      <div className='flex items-center justify-between'>
                        <CardTitle className='text-sm'>
                          Variant {index + 1}
                        </CardTitle>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className='h-4 w-4 text-destructive' />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className='grid gap-3'>
                      <FormField
                        control={form.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder='e.g., Large' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='grid grid-cols-2 gap-3'>
                        <FormField
                          control={form.control}
                          name={`variants.${index}.price_adjustment`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Adjustment</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  step='0.01'
                                  placeholder='+0.00'
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`variants.${index}.is_default`}
                          render={({ field }) => (
                            <FormItem className='flex items-center gap-2 pt-6'>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className='!mt-0'>Default</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value='properties' className='space-y-4 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-muted-foreground'>
                    Add customization options (e.g., Toppings, Sauce)
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      appendProperty({
                        name: '',
                        options: [{ name: '', price: 0 }],
                        is_required: false,
                        max_selections: 1,
                      })
                    }
                  >
                    <Plus className='mr-1 h-4 w-4' />
                    Add Property
                  </Button>
                </div>

                {propertyFields.length === 0 && (
                  <p className='py-4 text-center text-sm text-muted-foreground'>
                    No properties added. Click "Add Property" to create one.
                  </p>
                )}

                {propertyFields.map((field, propIndex) => (
                  <PropertyFieldCard
                    key={field.id}
                    index={propIndex}
                    form={form}
                    onRemove={() => removeProperty(propIndex)}
                  />
                ))}
              </TabsContent>
            </Tabs>

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

// Separate component for property field to handle nested options
function PropertyFieldCard({
  index,
  form,
  onRemove,
}: {
  index: number
  form: ReturnType<typeof useForm<MenuItemForm>>
  onRemove: () => void
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: `properties.${index}.options`,
  })

  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm'>Property {index + 1}</CardTitle>
          <Button type='button' variant='ghost' size='sm' onClick={onRemove}>
            <Trash2 className='h-4 w-4 text-destructive' />
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <FormField
          control={form.control}
          name={`properties.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Name</FormLabel>
              <FormControl>
                <Input placeholder='e.g., Toppings' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-3'>
          <FormField
            control={form.control}
            name={`properties.${index}.max_selections`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Selections</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={1}
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
            name={`properties.${index}.is_required`}
            render={({ field }) => (
              <FormItem className='flex items-center gap-2 pt-6'>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='!mt-0'>Required</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <FormLabel>Options</FormLabel>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => appendOption({ name: '', price: 0 })}
            >
              <Plus className='mr-1 h-3 w-3' />
              Add
            </Button>
          </div>

          {optionFields.map((opt, optIndex) => (
            <div key={opt.id} className='flex items-center gap-2'>
              <FormField
                control={form.control}
                name={`properties.${index}.options.${optIndex}.name`}
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormControl>
                      <Input placeholder='Option name' {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`properties.${index}.options.${optIndex}.price`}
                render={({ field }) => (
                  <FormItem className='w-24'>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='+0'
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => removeOption(optIndex)}
                disabled={optionFields.length <= 1}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
