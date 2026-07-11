import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMenuCategoryRefs, useMenuItemRefs } from '../hooks/use-menu-refs'
import {
  useCreatePromotion,
  useUpdatePromotion,
  type PromotionActivity,
  type PromotionScope,
  type PromotionScopeRole,
} from '../hooks/use-promotions'
import { usePromotionsContext } from './promotions-provider'

const ACTIVITY_OPTIONS: Array<{ value: PromotionActivity; label: string }> = [
  { value: 'dine_in', label: 'Dine-in' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
]

const activityEnum = z.enum(['dine_in', 'takeaway', 'delivery'])

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    description: z.string().optional(),
    promo_type: z.enum(['order_discount', 'item_discount', 'buy_x_get_y']),
    discount_type: z.string().min(1, 'Discount type is required'),
    discount_value: z.coerce.number().min(0, 'Discount value must be positive'),
    minimum_purchase: z.coerce
      .number()
      .min(0, 'Minimum purchase must be positive'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    is_active: z.boolean().default(true),
    usage_limit: z.coerce
      .number()
      .min(0, 'Usage limit must be positive')
      .optional(),
    usage_per_customer: z.coerce
      .number()
      .min(0, 'Per-customer limit must be positive')
      .optional(),
    activities: z.array(activityEnum).min(1, 'Select at least one activity'),
    buy_quantity: z.coerce.number().optional(),
    get_quantity: z.coerce.number().optional(),
    get_discount_value: z.coerce
      .number()
      .min(0)
      .max(100, 'Must be between 0 and 100')
      .optional(),
    target_item_ids: z.array(z.string()).default([]),
    target_category_ids: z.array(z.string()).default([]),
    buy_item_ids: z.array(z.string()).default([]),
    buy_category_ids: z.array(z.string()).default([]),
    get_item_ids: z.array(z.string()).default([]),
    get_category_ids: z.array(z.string()).default([]),
  })
  .refine(
    (data) =>
      !data.start_date ||
      !data.end_date ||
      new Date(data.end_date) >= new Date(data.start_date),
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  )
  .refine(
    (data) =>
      data.promo_type !== 'buy_x_get_y' ||
      ((data.buy_quantity ?? 0) >= 1 && (data.get_quantity ?? 0) >= 1),
    {
      message: 'Buy and get quantities must be at least 1',
      path: ['buy_quantity'],
    }
  )
  .refine(
    (data) =>
      data.promo_type !== 'item_discount' ||
      data.target_item_ids.length > 0 ||
      data.target_category_ids.length > 0,
    {
      message: 'Select at least one item or category',
      path: ['target_item_ids'],
    }
  )

type PromotionFormValues = z.infer<typeof formSchema>

const emptyValues: PromotionFormValues = {
  name: '',
  code: '',
  description: '',
  promo_type: 'order_discount',
  discount_type: 'percentage',
  discount_value: 0,
  minimum_purchase: 0,
  start_date: '',
  end_date: '',
  is_active: true,
  usage_limit: undefined,
  usage_per_customer: 1,
  activities: ['dine_in', 'takeaway', 'delivery'],
  buy_quantity: undefined,
  get_quantity: undefined,
  get_discount_value: 100,
  target_item_ids: [],
  target_category_ids: [],
  buy_item_ids: [],
  buy_category_ids: [],
  get_item_ids: [],
  get_category_ids: [],
}

function scopeIds(
  scopes: PromotionScope[] | undefined,
  role: PromotionScopeRole,
  kind: 'item' | 'category'
): string[] {
  return (scopes ?? [])
    .filter((s) => s.scope_role === role)
    .map((s) => (kind === 'item' ? s.menu_item_id : s.menu_category_id))
    .filter((id): id is string => !!id)
}

function buildScopes(values: PromotionFormValues): PromotionScope[] {
  const make = (
    ids: string[],
    role: PromotionScopeRole,
    kind: 'item' | 'category'
  ): PromotionScope[] =>
    ids.map((id) => ({
      scope_role: role,
      menu_item_id: kind === 'item' ? id : null,
      menu_category_id: kind === 'category' ? id : null,
    }))

  if (values.promo_type === 'item_discount') {
    return [
      ...make(values.target_item_ids, 'target', 'item'),
      ...make(values.target_category_ids, 'target', 'category'),
    ]
  }
  if (values.promo_type === 'buy_x_get_y') {
    return [
      ...make(values.buy_item_ids, 'buy', 'item'),
      ...make(values.buy_category_ids, 'buy', 'category'),
      ...make(values.get_item_ids, 'get', 'item'),
      ...make(values.get_category_ids, 'get', 'category'),
    ]
  }
  return []
}

interface RefMultiSelectProps {
  label: string
  options: Array<{ id: string; name: string }>
  value: string[]
  onChange: (value: string[]) => void
}

function RefMultiSelect({
  label,
  options,
  value,
  onChange,
}: RefMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='w-full justify-between font-normal'
        >
          <span className='truncate'>
            {value.length > 0 ? `${label} (${value.length})` : label}
          </span>
          <ChevronDown className='h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[280px] p-0' align='start'>
        <Command>
          <CommandInput placeholder='Search...' />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => toggle(option.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(option.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function PromotionActionDialog() {
  const { open, setOpen, currentRow } = usePromotionsContext()
  const createMutation = useCreatePromotion()
  const updateMutation = useUpdatePromotion()
  const { data: menuItems } = useMenuItemRefs()
  const { data: menuCategories } = useMenuCategoryRefs()

  const isEdit = open === 'edit'
  const isOpen = open === 'create' || open === 'edit'

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema) as Resolver<PromotionFormValues>,
    defaultValues: emptyValues,
  })

  const promoType = form.watch('promo_type')

  useEffect(() => {
    if (currentRow) {
      form.reset({
        name: currentRow.name,
        code: currentRow.code,
        description: currentRow.description || '',
        promo_type: currentRow.promo_type ?? 'order_discount',
        discount_type: currentRow.discount_type,
        discount_value: currentRow.discount_value,
        minimum_purchase: currentRow.minimum_purchase,
        start_date: currentRow.start_date
          ? new Date(currentRow.start_date).toISOString().split('T')[0]
          : '',
        end_date: currentRow.end_date
          ? new Date(currentRow.end_date).toISOString().split('T')[0]
          : '',
        is_active: currentRow.is_active,
        usage_limit: currentRow.usage_limit || undefined,
        usage_per_customer: currentRow.usage_per_customer || undefined,
        activities:
          currentRow.activities?.length > 0
            ? currentRow.activities
            : ['dine_in', 'takeaway', 'delivery'],
        buy_quantity: currentRow.buy_quantity || undefined,
        get_quantity: currentRow.get_quantity || undefined,
        get_discount_value: currentRow.get_discount_value ?? 100,
        target_item_ids: scopeIds(currentRow.scopes, 'target', 'item'),
        target_category_ids: scopeIds(currentRow.scopes, 'target', 'category'),
        buy_item_ids: scopeIds(currentRow.scopes, 'buy', 'item'),
        buy_category_ids: scopeIds(currentRow.scopes, 'buy', 'category'),
        get_item_ids: scopeIds(currentRow.scopes, 'get', 'item'),
        get_category_ids: scopeIds(currentRow.scopes, 'get', 'category'),
      })
    } else {
      form.reset(emptyValues)
    }
  }, [currentRow, form])

  const onSubmit = async (values: PromotionFormValues) => {
    try {
      const payload = {
        name: values.name,
        code: values.code,
        description: values.description,
        promo_type: values.promo_type,
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        minimum_purchase: values.minimum_purchase,
        start_date: new Date(values.start_date).toISOString(),
        end_date: new Date(values.end_date).toISOString(),
        is_active: values.is_active,
        // 0 / empty means unlimited
        usage_limit: values.usage_limit || null,
        usage_per_customer: values.usage_per_customer || null,
        activities: values.activities,
        buy_quantity:
          values.promo_type === 'buy_x_get_y'
            ? (values.buy_quantity ?? null)
            : null,
        get_quantity:
          values.promo_type === 'buy_x_get_y'
            ? (values.get_quantity ?? null)
            : null,
        get_discount_value:
          values.promo_type === 'buy_x_get_y'
            ? (values.get_discount_value ?? 100)
            : null,
        scopes: buildScopes(values),
      }

      if (isEdit && currentRow) {
        await updateMutation.mutateAsync({
          id: currentRow.promotion_id,
          ...payload,
        })
        toast.success('Promotion updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Promotion created successfully')
      }
      setOpen(null)
    } catch (error: unknown) {
      toast.error('Error', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Promotion' : 'Create Promotion'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edit the promotion details below.'
              : 'Add a new promotion to your database.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 py-4'
          >
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Holiday Sale' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code</FormLabel>
                    <FormControl>
                      <Input placeholder='SAVE20' {...field} />
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
                      placeholder='Promotion description...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity scoping */}
            <FormField
              control={form.control}
              name='activities'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activities</FormLabel>
                  <div className='flex gap-4 rounded-lg border p-3'>
                    {ACTIVITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className='flex items-center gap-2 text-sm'
                      >
                        <Checkbox
                          checked={field.value.includes(option.value)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, option.value]
                                : field.value.filter(
                                    (v: string) => v !== option.value
                                  )
                            )
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Promo type */}
            <FormField
              control={form.control}
              name='promo_type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='order_discount'>
                        Order Discount
                      </SelectItem>
                      <SelectItem value='item_discount'>
                        Item / Category Discount
                      </SelectItem>
                      <SelectItem value='buy_x_get_y'>Buy X Get Y</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {promoType !== 'buy_x_get_y' && (
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='discount_type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
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
                          <SelectItem value='percentage'>Percentage</SelectItem>
                          <SelectItem value='fixed'>Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='discount_value'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input type='number' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {promoType === 'item_discount' && (
              <div className='space-y-2 rounded-lg border p-3'>
                <p className='text-sm font-medium'>Applies to</p>
                <FormField
                  control={form.control}
                  name='target_item_ids'
                  render={({ field }) => (
                    <FormItem>
                      <RefMultiSelect
                        label='Menu items'
                        options={menuItems ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='target_category_ids'
                  render={({ field }) => (
                    <FormItem>
                      <RefMultiSelect
                        label='Categories'
                        options={menuCategories ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {promoType === 'buy_x_get_y' && (
              <div className='space-y-3 rounded-lg border p-3'>
                <div className='grid grid-cols-3 gap-4'>
                  <FormField
                    control={form.control}
                    name='buy_quantity'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buy Qty</FormLabel>
                        <FormControl>
                          <Input type='number' min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='get_quantity'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Get Qty</FormLabel>
                        <FormControl>
                          <Input type='number' min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='get_discount_value'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Off "Get"</FormLabel>
                        <FormControl>
                          <Input type='number' min={0} max={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className='text-xs text-muted-foreground'>
                  100% = free. Leave "customer gets" empty to discount the same
                  items the customer buys.
                </p>
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Customer buys</p>
                  <FormField
                    control={form.control}
                    name='buy_item_ids'
                    render={({ field }) => (
                      <RefMultiSelect
                        label='Menu items'
                        options={menuItems ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='buy_category_ids'
                    render={({ field }) => (
                      <RefMultiSelect
                        label='Categories'
                        options={menuCategories ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <p className='text-sm font-medium'>Customer gets</p>
                  <FormField
                    control={form.control}
                    name='get_item_ids'
                    render={({ field }) => (
                      <RefMultiSelect
                        label='Menu items'
                        options={menuItems ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='get_category_ids'
                    render={({ field }) => (
                      <RefMultiSelect
                        label='Categories'
                        options={menuCategories ?? []}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='minimum_purchase'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Purchase</FormLabel>
                    <FormControl>
                      <Input type='number' min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
              <FormField
                control={form.control}
                name='start_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='end_date'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Usage limits */}
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='usage_limit'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Usage Limit</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='Unlimited'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='usage_per_customer'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uses Per Customer</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={0}
                        placeholder='Unlimited'
                        {...field}
                        value={field.value ?? ''}
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
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                  <div className='space-y-0.5'>
                    <FormLabel>Active Status</FormLabel>
                    <div className='text-[0.8rem] text-muted-foreground'>
                      Enable or disable this promotion.
                    </div>
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
                onClick={() => setOpen(null)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
