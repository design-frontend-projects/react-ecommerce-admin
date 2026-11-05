import { useState, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Monitor,
  LayoutGrid,
  Receipt,
  UtensilsCrossed,
  SlidersHorizontal,
  Contrast,
  Compass,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Loader2,
  Store,
  Layers,
  ShoppingBag,
  Package,
  CalendarDays,
  Users,
  Truck,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useUpsertSetting } from '../data/queries'

// ─── Zod Schema Factory for Restaurant / ERP Display Settings ────────
// eslint-disable-next-line react-refresh/only-export-components
export const getDisplayFormSchema = (t: (key: string, defaultValue?: string) => string) =>
  z.object({
    pos_density: z.enum(['compact', 'standard', 'comfortable']).default('standard'),
    kitchen_ticket_view: z.enum(['grid', 'columns', 'cards']).default('grid'),
    table_grid_layout: z.enum(['grid-2', 'grid-3', 'grid-4', 'adaptive']).default('grid-3'),
    high_contrast_mode: z.boolean().default(false),
    default_page_size: z.coerce.number().int().positive().default(25),
    landing_page: z.string().default('/pos'),
    pos_tax_display: z.boolean().default(true),
    pos_kiosk_mode: z.boolean().default(false),
    items: z.array(z.string()).refine((value) => value.length > 0, {
      message: t('settings.display.selectAtLeastOne', 'You have to select at least one item.'),
    }),
  })

// eslint-disable-next-line react-refresh/only-export-components
export const displayFormSchema = getDisplayFormSchema((_, def) => def || 'You have to select at least one item.')

export type DisplayFormValues = z.infer<typeof displayFormSchema>

const DISPLAY_STORAGE_KEY = 'restaurant_display_preferences'

const defaultDisplayValues: DisplayFormValues = {
  pos_density: 'standard',
  kitchen_ticket_view: 'grid',
  table_grid_layout: 'grid-3',
  high_contrast_mode: false,
  default_page_size: 25,
  landing_page: '/pos',
  pos_tax_display: true,
  pos_kiosk_mode: false,
  items: ['posRegister', 'orders', 'inventory', 'reports'],
}

// ─── Real ERP / Restaurant Navigation Modules ────────────────────────
const sidebarModuleItems = [
  {
    id: 'posRegister',
    labelKey: 'settings.display.items.posRegister',
    defaultLabel: 'POS Register',
    icon: Store,
  },
  {
    id: 'orders',
    labelKey: 'settings.display.items.orders',
    defaultLabel: 'Orders',
    icon: ShoppingBag,
  },
  {
    id: 'inventory',
    labelKey: 'settings.display.items.inventory',
    defaultLabel: 'Inventory',
    icon: Package,
  },
  {
    id: 'reports',
    labelKey: 'settings.display.items.reports',
    defaultLabel: 'Reports',
    icon: FileSpreadsheet,
  },
  {
    id: 'kitchenDisplay',
    labelKey: 'sidebar.kitchenDisplay',
    defaultLabel: 'Kitchen Display',
    icon: UtensilsCrossed,
  },
  {
    id: 'reservations',
    labelKey: 'sidebar.reservations',
    defaultLabel: 'Reservations',
    icon: CalendarDays,
  },
  {
    id: 'customers',
    labelKey: 'sidebar.customers',
    defaultLabel: 'Customers',
    icon: Users,
  },
  {
    id: 'suppliers',
    labelKey: 'sidebar.suppliers',
    defaultLabel: 'Suppliers',
    icon: Truck,
  },
] as const

export function DisplayForm() {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const upsertSetting = useUpsertSetting()

  const getInitialValues = (): DisplayFormValues => {
    if (typeof window === 'undefined') return defaultDisplayValues
    try {
      const stored = localStorage.getItem(DISPLAY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...defaultDisplayValues, ...parsed }
      }
    } catch {
      // Fallback to defaults if parsing fails
    }
    return defaultDisplayValues
  }

  const localizedSchema = useMemo(() => getDisplayFormSchema(t), [t])

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(localizedSchema),
    defaultValues: getInitialValues(),
  })

  async function onSubmit(data: DisplayFormValues) {
    setIsSaving(true)
    try {
      // 1. Immediately persist client-side in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(data))
        if (data.high_contrast_mode) {
          document.documentElement.classList.add('high-contrast')
        } else {
          document.documentElement.classList.remove('high-contrast')
        }
      }

      // 2. Persist to tenant database via useUpsertSetting
      try {
        await upsertSetting.mutateAsync({
          key: 'display.preferences',
          value: data,
          group: 'display',
          is_public: true,
        })
      } catch {
        // Backend upsert deferred, saved locally
      }

      toast.success(
        t('settings.display.savedSuccess', 'Display preferences updated successfully')
      )
    } catch {
      toast.error(
        t('settings.common.savedError', 'Failed to save settings')
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    form.reset(defaultDisplayValues)
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(defaultDisplayValues))
      document.documentElement.classList.remove('high-contrast')
    }
    toast.info(t('settings.common.reset', 'Reset to default display preferences'))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* ─── Card 1: POS & Cashier Station Display ─────────────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Monitor className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.display.title', 'POS Register Display')}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                'settings.display.posDesc',
                'Configure POS layout density, fullscreen kiosk mode, and on-screen receipt tax breakdown.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* POS Density Radio Group */}
            <FormField
              control={form.control}
              name='pos_density'
              render={({ field }) => (
                <FormItem className='space-y-2'>
                  <FormLabel className='text-sm font-medium'>
                    {t('settings.appearance.density', 'POS Register Density')}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='grid grid-cols-1 gap-3 sm:grid-cols-3'
                    >
                      {/* Compact */}
                      <FormItem>
                        <FormLabel className='flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer'>
                          <FormControl>
                            <RadioGroupItem value='compact' className='sr-only' />
                          </FormControl>
                          <SlidersHorizontal className='mb-2 h-6 w-6 text-muted-foreground' />
                          <div className='text-center'>
                            <span className='font-semibold'>
                              {t('settings.appearance.densityCompact', 'Compact')}
                            </span>
                            <p className='text-xs text-muted-foreground mt-1'>
                              {t('settings.display.compactDesc', 'Dense layout for small screens')}
                            </p>
                          </div>
                        </FormLabel>
                      </FormItem>

                      {/* Standard */}
                      <FormItem>
                        <FormLabel className='flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer'>
                          <FormControl>
                            <RadioGroupItem value='standard' className='sr-only' />
                          </FormControl>
                          <LayoutGrid className='mb-2 h-6 w-6 text-muted-foreground' />
                          <div className='text-center'>
                            <span className='font-semibold'>
                              {t('settings.display.standardDensity', 'Standard')}
                            </span>
                            <p className='text-xs text-muted-foreground mt-1'>
                              {t('settings.display.standardDesc', 'Balanced touch targets')}
                            </p>
                          </div>
                        </FormLabel>
                      </FormItem>

                      {/* Comfortable */}
                      <FormItem>
                        <FormLabel className='flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer'>
                          <FormControl>
                            <RadioGroupItem value='comfortable' className='sr-only' />
                          </FormControl>
                          <Maximize2 className='mb-2 h-6 w-6 text-muted-foreground' />
                          <div className='text-center'>
                            <span className='font-semibold'>
                              {t('settings.appearance.densityComfortable', 'Comfortable')}
                            </span>
                            <p className='text-xs text-muted-foreground mt-1'>
                              {t('settings.display.comfortableDesc', 'Large buttons for tablet POS')}
                            </p>
                          </div>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* POS Kiosk Fullscreen Switch */}
            <FormField
              control={form.control}
              name='pos_kiosk_mode'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.display.posKiosk', 'POS Fullscreen Mode')}
                    </FormLabel>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.display.posKioskDesc',
                        'Maximize screen real estate by auto-collapsing sidebars during cashier shifts.'
                      )}
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

            {/* POS Tax Breakdown Switch */}
            <FormField
              control={form.control}
              name='pos_tax_display'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <div className='flex items-center gap-1.5'>
                      <Receipt className='h-4 w-4 text-muted-foreground' />
                      <FormLabel className='text-sm font-medium'>
                        {t('settings.display.posTaxDisplay', 'Show Tax Breakdown on Register')}
                      </FormLabel>
                    </div>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.display.posTaxDisplayDesc',
                        'Display itemized VAT and sales tax details directly on register screen and printed receipts.'
                      )}
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
          </CardContent>
        </Card>

        {/* ─── Card 2: Kitchen Station & Floor Table Layout ──────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <UtensilsCrossed className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.display.kitchenAndFloorTitle', 'Kitchen & Table Layout')}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                'settings.display.kitchenAndFloorDesc',
                'Configure order ticket routing views for KDS stations and restaurant table layouts.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {/* Kitchen Ticket View */}
            <FormField
              control={form.control}
              name='kitchen_ticket_view'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-medium'>
                    {t('settings.display.kitchenTicketView', 'Kitchen Ticket View')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className='h-10'>
                        <SelectValue placeholder='Select ticket layout' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='grid'>
                        {t('settings.display.ticketGrid', 'Grid View (Order Tiles)')}
                      </SelectItem>
                      <SelectItem value='columns'>
                        {t('settings.display.ticketColumns', 'Status Columns (Kanban Workflow)')}
                      </SelectItem>
                      <SelectItem value='cards'>
                        {t('settings.display.ticketCards', 'Detailed Tickets (Modifiers & Timers)')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className='text-xs'>
                    {t('settings.display.ticketDesc', 'Format of orders on Kitchen Display Systems.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Table Grid Layout */}
            <FormField
              control={form.control}
              name='table_grid_layout'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm font-medium'>
                    {t('settings.display.tableGridLayout', 'Table Grid Layout')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className='h-10'>
                        <SelectValue placeholder='Select table layout' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='grid-2'>
                        {t('settings.display.tableGrid2', '2 Columns (Spacious Cards)')}
                      </SelectItem>
                      <SelectItem value='grid-3'>
                        {t('settings.display.tableGrid3', '3 Columns (Standard Floor Layout)')}
                      </SelectItem>
                      <SelectItem value='grid-4'>
                        {t('settings.display.tableGrid4', '4 Columns (Compact Overview)')}
                      </SelectItem>
                      <SelectItem value='adaptive'>
                        {t('settings.display.tableAdaptive', 'Adaptive Auto-Fit (Responsive)')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className='text-xs'>
                    {t('settings.display.tableGridDesc', 'Floor plan density for dine-in tables.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Card 3: System Navigation & Pagination ────────────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Compass className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.display.navigationAndSystemTitle', 'System Navigation & Accessibility')}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                'settings.display.description',
                'Customize dashboard landing view, table sizes, and register display.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {/* Default Landing Page */}
              <FormField
                control={form.control}
                name='landing_page'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.display.landingPage', 'Default Landing View')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className='h-10'>
                          <SelectValue placeholder='Select landing view' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='/pos'>
                          {t('sidebar.posRegister', 'POS Register (Direct to Cashier)')}
                        </SelectItem>
                        <SelectItem value='/'>
                          {t('sidebar.dashboard', 'Dashboard Overview')}
                        </SelectItem>
                        <SelectItem value='/orders'>
                          {t('sidebar.orders', 'Live Orders Management')}
                        </SelectItem>
                        <SelectItem value='/inventory'>
                          {t('sidebar.inventory', 'Inventory & Stock Control')}
                        </SelectItem>
                        <SelectItem value='/kitchen'>
                          {t('sidebar.kitchenDisplay', 'Kitchen Display Station')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className='text-xs'>
                      {t('settings.display.landingDesc', 'Initial screen loaded after sign-in.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default Page Size */}
              <FormField
                control={form.control}
                name='default_page_size'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium'>
                      {t('settings.display.pageSize', 'Default Table Rows')}
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className='h-10'>
                          <SelectValue placeholder='Select page size' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='10'>10 {t('settings.display.rows', 'rows per page')}</SelectItem>
                        <SelectItem value='25'>25 {t('settings.display.rows', 'rows per page (Recommended)')}</SelectItem>
                        <SelectItem value='50'>50 {t('settings.display.rows', 'rows per page')}</SelectItem>
                        <SelectItem value='100'>100 {t('settings.display.rows', 'rows per page')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className='text-xs'>
                      {t('settings.display.pageSizeDesc', 'Pagination limit for data tables and list views.')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* High Contrast Mode Switch */}
            <FormField
              control={form.control}
              name='high_contrast_mode'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3.5'>
                  <div className='space-y-0.5 pe-4'>
                    <div className='flex items-center gap-1.5'>
                      <Contrast className='h-4 w-4 text-muted-foreground' />
                      <FormLabel className='text-sm font-medium'>
                        {t('settings.display.highContrast', 'High Contrast Mode')}
                      </FormLabel>
                    </div>
                    <FormDescription className='text-xs'>
                      {t(
                        'settings.display.highContrastDesc',
                        'Enhance borders and element contrast for bright outdoor patios or dimly-lit kitchen stations.'
                      )}
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
          </CardContent>
        </Card>

        {/* ─── Card 4: Quick-Access Sidebar Modules ──────────────────── */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Layers className='h-5 w-5 text-primary' />
              <CardTitle className='text-base font-semibold'>
                {t('settings.display.sidebar', 'Sidebar')}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                'settings.display.sidebarDesc',
                'Select the items you want to display in the sidebar.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name='items'
              render={() => (
                <FormItem>
                  <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
                    {sidebarModuleItems.map((moduleItem) => {
                      const IconComp = moduleItem.icon
                      return (
                        <FormField
                          key={moduleItem.id}
                          control={form.control}
                          name='items'
                          render={({ field }) => {
                            const isChecked = field.value?.includes(moduleItem.id)
                            return (
                              <FormItem
                                key={moduleItem.id}
                                className={cn(
                                  'flex flex-row items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                                  isChecked
                                    ? 'border-primary/50 bg-primary/5'
                                    : 'border-muted hover:bg-muted/50'
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), moduleItem.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== moduleItem.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <IconComp className={cn('h-4 w-4 shrink-0', isChecked ? 'text-primary' : 'text-muted-foreground')} />
                                <FormLabel className='text-sm font-normal cursor-pointer flex-1'>
                                  {t(moduleItem.labelKey, moduleItem.defaultLabel)}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                  <FormMessage className='mt-2' />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Form Action Buttons ───────────────────────────────────── */}
        <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={handleReset}
            className='flex items-center gap-2'
          >
            <RefreshCw className='h-4 w-4' />
            {t('settings.common.reset', 'Reset Defaults')}
          </Button>

          <Button
            type='submit'
            disabled={isSaving}
            className='flex items-center gap-2 ms-auto'
          >
            {isSaving ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('settings.display.updating', 'Updating display...')}
              </>
            ) : (
              <>
                <Check className='h-4 w-4' />
                {t('settings.display.submit', 'Update display')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
