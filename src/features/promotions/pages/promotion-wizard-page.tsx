import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
  Percent,
  Layers,
  Sparkles,
  Sliders,
  ShoppingBag,
  Building,
  Users,
  FileCheck2,
  Loader2,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
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
import {
  VirtualSearchableMultiSelect,
  type SearchableOption,
} from '@/components/custom-ui/virtual-searchable-multi-select'
import { useCurrencies } from '@/features/currencies/hooks/use-currencies'
import { useCategoryOptions, useBrandOptions } from '@/features/products/hooks/use-product-options'
import { useCustomerGroups } from '@/features/customer-groups/hooks/use-customer-groups'
import { useChannels } from '@/features/channels/hooks/use-channels'
import {
  promotionFormSchema,
  type PromotionFormValues,
} from '../schemas/promotion-form.schema'
import {
  useInvPromotion,
  useCreatePromotion,
  useUpdatePromotion,
  usePromotionLookupData,
} from '../hooks/use-inv-promotions'
import type {
  PromotionStatus,
  PromotionType,
  RuleActionType,
  ConditionField,
  ConditionOperator,
} from '../types'

interface RuleItem {
  id?: string
  action_type?: RuleActionType
  discount_value: number | string
  apply_to?: string
  buy_quantity?: number | null
  get_quantity?: number | null
  get_discount_percent?: number | string | null
  get_product_variant_id?: string | null
  tier_min_quantity?: number | string | null
  tier_min_amount?: number | string | null
  sort_order?: number | null
}

interface ConditionItem {
  id?: string
  group_id?: string
  logical_operator?: 'AND' | 'OR'
  field: ConditionField
  operator: ConditionOperator
  value: string
  sort_order?: number | null
}

interface ProductScopeItem {
  product_id?: string | null
  product_variant_id?: string | null
  is_excluded: boolean
}

interface CategoryScopeItem {
  category_id: string
  is_excluded: boolean
}

interface BrandScopeItem {
  brand_id: string
  is_excluded: boolean
}

interface CustomerGroupScopeItem {
  customer_group_id: string
  is_excluded: boolean
}

interface ChannelScopeItem {
  channel_id: string
  is_excluded: boolean
}

interface StoreScopeItem {
  store_id: string
  is_excluded: boolean
}

interface BranchScopeItem {
  branch_id: string
  is_excluded: boolean
}

const parseDateString = (dateStr?: string | null): Date | undefined => {
  if (!dateStr) return undefined
  const parts = dateStr.split('-')
  if (parts.length < 3) return undefined
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined
  return new Date(year, month - 1, day)
}

export function PromotionWizardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { promotionId?: string }
  const isEditMode = !!params.promotionId && params.promotionId !== 'new'

  const [currentStep, setCurrentStep] = useState(1)

  const steps = useMemo(
    () => [
      {
        id: 1,
        name: t('promotions.wizard.steps.step1', 'Basic Info'),
        icon: Tag,
        desc: t('promotions.wizard.steps.step1Desc', 'Name, dates, & type'),
      },
      {
        id: 2,
        name: t('promotions.wizard.steps.step2', 'Discount Rules'),
        icon: Percent,
        desc: t('promotions.wizard.steps.step2Desc', 'Discount logic & value'),
      },
      {
        id: 3,
        name: t('promotions.wizard.steps.step3', 'Eligibility'),
        icon: Layers,
        desc: t('promotions.wizard.steps.step3Desc', 'Products, stores & groups'),
      },
      {
        id: 4,
        name: t('promotions.wizard.steps.step4', 'Conditions'),
        icon: Sliders,
        desc: t('promotions.wizard.steps.step4Desc', 'Cart minimums & rules'),
      },
      {
        id: 5,
        name: t('promotions.wizard.steps.step5', 'Limits & Stacking'),
        icon: Sparkles,
        desc: t('promotions.wizard.steps.step5Desc', 'Usage limits & priority'),
      },
      {
        id: 6,
        name: t('promotions.wizard.steps.step6', 'Review'),
        icon: FileCheck2,
        desc: t('promotions.wizard.steps.step6Desc', 'Confirm & activate'),
      },
    ],
    [t]
  )

  // Lookups and existing data
  const { data: lookups } = usePromotionLookupData()
  const { data: existingData, isLoading: promoLoading } = useInvPromotion(
    isEditMode ? params.promotionId : undefined
  )

  // Real data queries from app models
  const { data: currenciesData, isLoading: currenciesLoading } = useCurrencies({ onlyActive: true })
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoryOptions()
  const { data: brandsData, isLoading: brandsLoading } = useBrandOptions()
  const { data: customerGroupsData, isLoading: customerGroupsLoading } = useCustomerGroups()
  const { data: channelsData, isLoading: channelsLoading } = useChannels()

  // Currencies list from model, falling back to lookups
  const availableCurrencies = useMemo(() => {
    if (currenciesData && currenciesData.length > 0) return currenciesData
    return (lookups?.currencies || []).map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      name_ar: null as string | null,
      is_active: true,
      created_at: '',
      updated_at: '',
    }))
  }, [currenciesData, lookups?.currencies])

  // Categories formatted options for VirtualSearchableMultiSelect
  const categoryOptions: SearchableOption[] = useMemo(() => {
    const raw = categoriesData && categoriesData.length > 0
      ? categoriesData
      : (lookups?.categories || [])
    const map = new Map<string, { id: string; name: string; name_ar?: string | null; parent_id?: string | null }>()
    raw.forEach((c) => map.set(c.id, c))

    return raw.map((cat) => {
      let description: string | undefined = undefined
      if ('parent_id' in cat && cat.parent_id && map.has(cat.parent_id)) {
        const parent = map.get(cat.parent_id)!
        description = `${parent.name} › ${cat.name}`
      }
      return {
        id: cat.id,
        name: cat.name,
        name_ar: cat.name_ar,
        description,
      }
    })
  }, [categoriesData, lookups?.categories])

  // Brands formatted options for VirtualSearchableMultiSelect
  const brandOptions: SearchableOption[] = useMemo(() => {
    const raw = brandsData && brandsData.length > 0
      ? brandsData
      : (lookups?.brands || [])
    return raw.map((b) => ({
      id: b.id,
      name: b.name,
      name_ar: b.name_ar,
      code: b.code,
    }))
  }, [brandsData, lookups?.brands])

  // Customer Groups formatted options for VirtualSearchableMultiSelect
  const customerGroupOptions: SearchableOption[] = useMemo(() => {
    const raw = customerGroupsData && customerGroupsData.length > 0
      ? customerGroupsData
      : (lookups?.customerGroups || [])
    return raw.map((g) => {
      const pct = 'discount_percentage' in g
        ? g.discount_percentage
        : 'discountPercentage' in g
        ? (g as unknown as { discountPercentage?: number }).discountPercentage
        : null
      const pctNum = pct ? Number(pct) : 0
      return {
        id: g.id,
        name: g.name,
        description: g.description || (pctNum > 0 ? `${pctNum}% standard group discount` : undefined),
        badge: pctNum > 0 ? `${pctNum}% off` : undefined,
      }
    })
  }, [customerGroupsData, lookups?.customerGroups])

  // Sales Channels formatted options for VirtualSearchableMultiSelect
  const channelOptions: SearchableOption[] = useMemo(() => {
    const raw = channelsData && channelsData.length > 0
      ? channelsData
      : (lookups?.channels || [])
    return raw.map((ch) => ({
      id: ch.id,
      name: ch.name,
      name_ar: ch.name_ar,
      code: ch.code,
      description: ch.description || undefined,
    }))
  }, [channelsData, lookups?.channels])

  // Specific products formatted options for VirtualSearchableMultiSelect
  const productOptions: SearchableOption[] = useMemo(() => {
    return (lookups?.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.sku || undefined,
      badge: p.sku ? `SKU: ${p.sku}` : undefined,
    }))
  }, [lookups?.products])

  const createMutation = useCreatePromotion()
  const updateMutation = useUpdatePromotion()

  const defaultStartDate = new Date().toISOString().split('T')[0]

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      status: 'active',
      promoType: 'percentage',
      startDate: defaultStartDate,
      endDate: '',
      timezone: 'Asia/Qatar',
      priority: 10,
      currencyCode: 'QAR',
      minOrderAmount: 0,
      maxDiscountAmount: undefined,
      usageLimit: undefined,
      usagePerCustomer: 1,
      dailyUsageLimit: undefined,
      allowStacking: false,
      stackingPriority: 10,
      maxStackingCount: 1,
      requiresCoupon: false,
      requiresApproval: false,
      autoApply: true,
      scopeProductType: 'all',
      scopeCustomerType: 'all',
      scopeChannelType: 'all',
      scopeLocationType: 'all',
      rules: [
        {
          ruleType: 'percentage_discount',
          discountValue: 10,
          applyTo: 'matching_items',
          sortOrder: 0,
        },
      ],
      conditions: [],
      productIds: [],
      categoryIds: [],
      brandIds: [],
      customerGroupIds: [],
      channelIds: [],
      storeIds: [],
      branchIds: [],
    },
  })

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control: form.control,
    name: 'rules',
  })

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control: form.control,
    name: 'conditions',
  })

  // Prefill when editing
  useEffect(() => {
    if (existingData && isEditMode) {
      form.reset({
        name: existingData.name,
        code: existingData.code || '',
        description: existingData.description || '',
        status: existingData.status as PromotionStatus,
        promoType: existingData.promo_type as PromotionType,
        startDate: existingData.start_date
          ? new Date(existingData.start_date).toISOString().split('T')[0]
          : defaultStartDate,
        endDate: existingData.end_date
          ? new Date(existingData.end_date).toISOString().split('T')[0]
          : '',
        timezone: existingData.timezone || 'Asia/Qatar',
        priority: existingData.priority ?? 10,
        currencyId: existingData.currency_id || undefined,
        currencyCode: existingData.currency?.code || 'QAR',
        minOrderAmount: Number(existingData.min_order_amount ?? 0),
        maxDiscountAmount: existingData.max_discount_amount
          ? Number(existingData.max_discount_amount)
          : undefined,
        usageLimit: existingData.usage_limit ?? undefined,
        usagePerCustomer: existingData.usage_per_customer ?? 1,
        dailyUsageLimit: existingData.daily_usage_limit ?? undefined,
        allowStacking: existingData.allow_stacking ?? false,
        stackingPriority: existingData.stacking_priority ?? 10,
        maxStackingCount: existingData.max_stacking_count ?? 1,
        requiresCoupon: existingData.requires_coupon ?? false,
        requiresApproval: existingData.requires_approval ?? false,
        autoApply: existingData.auto_apply ?? true,
        scopeProductType: existingData.products?.length > 0 ? 'selected' : 'all',
        scopeCustomerType: existingData.customer_groups?.length > 0 ? 'selected' : 'all',
        scopeChannelType: existingData.channels?.length > 0 ? 'selected' : 'all',
        scopeLocationType:
          existingData.stores?.length > 0 || existingData.branches?.length > 0
            ? 'selected'
            : 'all',
        rules:
          existingData.rules && existingData.rules.length > 0
            ? (existingData.rules as RuleItem[]).map((r: RuleItem) => ({
                id: r.id,
                ruleType: r.action_type || 'percentage_discount',
                discountValue: Number(r.discount_value ?? 0),
                applyTo: r.apply_to || 'matching_items',
                buyQuantity: r.buy_quantity ?? undefined,
                getQuantity: r.get_quantity ?? undefined,
                getDiscountPercent: Number(r.get_discount_percent ?? 100),
                getProductVariantId: r.get_product_variant_id ?? undefined,
                tierMinQuantity: r.tier_min_quantity
                  ? Number(r.tier_min_quantity)
                  : undefined,
                tierMinAmount: r.tier_min_amount
                  ? Number(r.tier_min_amount)
                  : undefined,
                sortOrder: r.sort_order ?? 0,
              }))
            : [
                {
                  ruleType: 'percentage_discount',
                  discountValue: 10,
                  applyTo: 'matching_items',
                  sortOrder: 0,
                },
              ],
        conditions:
          (existingData.conditions as ConditionItem[])?.map((c: ConditionItem) => ({
            id: c.id,
            groupId: c.group_id || 'group_1',
            logicalOperator: c.logical_operator || 'AND',
            field: c.field,
            operator: c.operator,
            value: c.value,
            sortOrder: c.sort_order ?? 0,
          })) || [],
        productIds:
          (existingData.products as ProductScopeItem[])?.map((p: ProductScopeItem) => ({
            productId: p.product_id || undefined,
            variantId: p.product_variant_id || undefined,
            isExcluded: p.is_excluded,
          })) || [],
        categoryIds:
          (existingData.categories as CategoryScopeItem[])?.map((c: CategoryScopeItem) => ({
            categoryId: c.category_id,
            isExcluded: c.is_excluded,
          })) || [],
        brandIds:
          (existingData.brands as BrandScopeItem[])?.map((b: BrandScopeItem) => ({
            brandId: b.brand_id,
            isExcluded: b.is_excluded,
          })) || [],
        customerGroupIds:
          (existingData.customer_groups as CustomerGroupScopeItem[])?.map(
            (cg: CustomerGroupScopeItem) => ({
              customerGroupId: cg.customer_group_id,
              isExcluded: cg.is_excluded,
            })
          ) || [],
        channelIds:
          (existingData.channels as ChannelScopeItem[])?.map((ch: ChannelScopeItem) => ({
            channelId: ch.channel_id,
            isExcluded: ch.is_excluded,
          })) || [],
        storeIds:
          (existingData.stores as StoreScopeItem[])?.map((st: StoreScopeItem) => ({
            storeId: st.store_id,
            isExcluded: st.is_excluded,
          })) || [],
        branchIds:
          (existingData.branches as BranchScopeItem[])?.map((br: BranchScopeItem) => ({
            branchId: br.branch_id,
            isExcluded: br.is_excluded,
          })) || [],
      })
    }
  }, [existingData, isEditMode, form, defaultStartDate])

  // Form submission
  const onSubmit = async (values: PromotionFormValues) => {
    try {
      if (isEditMode && params.promotionId) {
        await updateMutation.mutateAsync({
          id: params.promotionId,
          input: values,
        })
        toast.success(
          t('promotions.wizard.updatedSuccess', 'Promotion updated successfully')
        )
      } else {
        await createMutation.mutateAsync(values)
        toast.success(
          t('promotions.wizard.savedSuccess', 'Promotion created successfully')
        )
      }
      navigate({ to: '/promotions' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('promotions.wizard.saveFailed', 'Failed to save promotion')
      toast.error(msg)
    }
  }

  const values = form.watch()

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  if (isEditMode && promoLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header fixed>
          <div className="font-semibold text-sm">
            {t('promotions.title', 'Promotions')}
          </div>
        </Header>
        <Main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </Main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header fixed>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/promotions' })}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {isEditMode
              ? t('promotions.wizard.titleEdit', 'Edit Promotion')
              : t('promotions.wizard.titleNew', 'Create New Promotion')}
          </span>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {/* Wizard Steps Header */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-border/60 pb-4">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isDone = currentStep > step.id
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-primary/10 border-primary/40 border text-primary shadow-xs'
                    : isDone
                    ? 'hover:bg-muted/60 text-muted-foreground'
                    : 'opacity-60 hover:opacity-100 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <span>{step.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {step.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* Wizard Form Body */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  {t('promotions.wizard.step1.title', 'Promotion Details & Identity')}
                </CardTitle>
                <CardDescription>
                  {t(
                    'promotions.wizard.step1.desc',
                    'Define the core identity, promotion type, scheduling, and currency.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {t('promotions.wizard.step1.promoName', 'Promotion Name *')}
                    </Label>
                    <Input
                      id="name"
                      placeholder={t('promotions.wizard.step1.promoNamePlaceholder', 'e.g. Eid Mega Sale 20% Off')}
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">
                      {t('promotions.wizard.step1.promoCode', 'Promo Code / Tag')}
                    </Label>
                    <Input
                      id="code"
                      placeholder={t('promotions.wizard.step1.promoCodePlaceholder', 'e.g. EID2026 (Optional promo identifier)')}
                      {...form.register('code')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t('promotions.wizard.step1.description', 'Description & Marketing Copy')}
                  </Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder={t(
                      'promotions.wizard.step1.descriptionPlaceholder',
                      'Provide details about the promotional offer for receipts and cashiers...'
                    )}
                    {...form.register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>{t('promotions.wizard.step1.promoType', 'Promotion Type *')}</Label>
                    <Select
                      value={values.promoType}
                      onValueChange={(val: string) => {
                        const typedVal = val as PromotionType
                        form.setValue('promoType', typedVal)
                        if (typedVal === 'percentage') {
                          form.setValue('rules.0.ruleType', 'percentage_discount')
                        } else if (typedVal === 'fixed_amount') {
                          form.setValue('rules.0.ruleType', 'fixed_discount')
                        } else if (typedVal === 'buy_x_get_y') {
                          form.setValue('rules.0.ruleType', 'buy_x_get_y')
                        } else if (typedVal === 'free_item') {
                          form.setValue('rules.0.ruleType', 'free_item')
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('promotions.filters.allTypes', 'Select type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          {t('promotions.common.percentage', 'Percentage Discount')}
                        </SelectItem>
                        <SelectItem value="fixed_amount">
                          {t('promotions.common.fixedAmount', 'Fixed Amount Discount')}
                        </SelectItem>
                        <SelectItem value="buy_x_get_y">
                          {t('promotions.common.buyXGetY', 'Buy X Get Y Free/Discounted')}
                        </SelectItem>
                        <SelectItem value="free_item">
                          {t('promotions.common.freeItem', 'Free Gift Item')}
                        </SelectItem>
                        <SelectItem value="order_discount">
                          {t('promotions.common.orderDiscount', 'Cart Order Discount')}
                        </SelectItem>
                        <SelectItem value="tiered">
                          {t('promotions.common.tiered', 'Tiered Volume Discount')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('promotions.wizard.step1.status', 'Status')}</Label>
                    <Select
                      value={values.status}
                      onValueChange={(val: string) =>
                        form.setValue('status', val as PromotionStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          {t('promotions.common.active', 'Active')}
                        </SelectItem>
                        <SelectItem value="draft">
                          {t('promotions.common.draft', 'Draft')}
                        </SelectItem>
                        <SelectItem value="paused">
                          {t('promotions.common.paused', 'Paused')}
                        </SelectItem>
                        <SelectItem value="scheduled">
                          {t('promotions.common.scheduled', 'Scheduled')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('promotions.wizard.step1.currency', 'Currency')}</Label>
                    <Select
                      value={values.currencyId || ''}
                      onValueChange={(val: string) => {
                        const cur = availableCurrencies.find((c) => c.id === val || c.code === val)
                        form.setValue('currencyId', val)
                        if (cur) form.setValue('currencyCode', cur.code)
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue
                          placeholder={
                            currenciesLoading
                              ? t('common.loading', 'Loading currencies...')
                              : t('promotions.wizard.step1.selectCurrency', 'Select currency (QAR default)')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span className="font-semibold text-foreground">{c.code}</span>
                              <span className="text-muted-foreground text-xs font-mono">
                                {c.symbol}
                              </span>
                              <span className="text-muted-foreground text-xs truncate">
                                {c.name} {c.name_ar ? `(${c.name_ar})` : ''}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Start Date - shadcn Calendar */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      {t('promotions.wizard.step1.startDate', 'Start Date & Time *')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-between text-left font-normal h-10 px-3',
                            !values.startDate && 'text-muted-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span>
                              {parseDateString(values.startDate)
                                ? format(parseDateString(values.startDate)!, 'PPP')
                                : t('common.selectDate', 'Pick start date')}
                            </span>
                          </div>
                          {values.startDate && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {values.startDate}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-2 border-b border-border flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t('promotions.wizard.step1.startDate', 'Start Date')}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              form.setValue('startDate', format(new Date(), 'yyyy-MM-dd'), {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                          >
                            Today
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={parseDateString(values.startDate)}
                          onSelect={(date) => {
                            if (date) {
                              form.setValue('startDate', format(date, 'yyyy-MM-dd'), {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>

                  {/* End Date - shadcn Calendar (Optional) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="endDate">
                        {t('promotions.wizard.step1.endDate', 'End Date & Time (Optional)')}
                      </Label>
                      {values.endDate && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue('endDate', '', { shouldDirty: true })}
                          className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-destructive gap-1"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear</span>
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="endDate"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-between text-left font-normal h-10 px-3',
                            !values.endDate && 'text-muted-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {parseDateString(values.endDate)
                                ? format(parseDateString(values.endDate)!, 'PPP')
                                : t('promotions.wizard.step1.noEndDate', 'Pick end date (never expires)')}
                            </span>
                          </div>
                          {values.endDate && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {values.endDate}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-2 border-b border-border flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t('promotions.wizard.step1.endDate', 'Promotion Expiry')}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const d = new Date()
                                d.setDate(d.getDate() + 30)
                                form.setValue('endDate', format(d, 'yyyy-MM-dd'), {
                                  shouldDirty: true,
                                })
                              }}
                            >
                              +30 Days
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => form.setValue('endDate', '', { shouldDirty: true })}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <Calendar
                          mode="single"
                          selected={parseDateString(values.endDate)}
                          onSelect={(date) => {
                            form.setValue('endDate', date ? format(date, 'yyyy-MM-dd') : '', {
                              shouldDirty: true,
                            })
                          }}
                          disabled={(date) => {
                            const start = parseDateString(values.startDate)
                            return start ? date < start : false
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        {t('promotions.wizard.step5.autoApply', 'Auto-Apply to Cart')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'promotions.wizard.step5.autoApplyDesc',
                          'Automatically applied when basket meets rules without coupon code.'
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={values.autoApply}
                      onCheckedChange={(val) => form.setValue('autoApply', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        {t('promotions.wizard.step5.requiresCoupon', 'Requires Coupon Code')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          'promotions.wizard.step5.requiresCouponDesc',
                          'Customer or cashier must enter a registered coupon code to trigger.'
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={values.requiresCoupon}
                      onCheckedChange={(val) => form.setValue('requiresCoupon', val)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Discount Rules */}
          {currentStep === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    {t('promotions.wizard.step2.title', 'Discount Rules & Calculation Mechanics')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.wizard.step2.desc',
                      'Configure the exact discount rates, free items, or tiered steps.'
                    )}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendRule({
                      ruleType: 'percentage_discount',
                      discountValue: 10,
                      applyTo: 'matching_items',
                      sortOrder: ruleFields.length,
                    })
                  }
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {t('promotions.wizard.step2.addRule', 'Add Rule')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {ruleFields.map((field, idx) => {
                  const ruleType = form.watch(`rules.${idx}.ruleType`)

                  return (
                    <div
                      key={field.id}
                      className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4 relative"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {t('promotions.wizard.step2.ruleNumber', {
                            number: idx + 1,
                            defaultValue: `Rule #${idx + 1}`,
                          })}
                        </span>
                        {ruleFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRule(idx)}
                            className="h-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>
                            {t('promotions.wizard.step2.ruleType', 'Rule Action Type')}
                          </Label>
                          <Select
                            value={ruleType}
                            onValueChange={(val: string) =>
                              form.setValue(`rules.${idx}.ruleType`, val as RuleActionType)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage_discount">
                                {t('promotions.wizard.step2.percentOff', 'Percentage Discount (%)')}
                              </SelectItem>
                              <SelectItem value="fixed_discount">
                                {t('promotions.wizard.step2.fixedAmountOff', {
                                  currency: values.currencyCode,
                                  defaultValue: `Fixed Amount Discount (${values.currencyCode})`,
                                })}
                              </SelectItem>
                              <SelectItem value="buy_x_get_y">
                                {t('promotions.common.buyXGetY', 'Buy X Get Y')}
                              </SelectItem>
                              <SelectItem value="free_item">
                                {t('promotions.common.freeItem', 'Free Item')}
                              </SelectItem>
                              <SelectItem value="bundle_fixed_price">
                                {t('promotions.common.bundleFixedPrice', 'Bundle Fixed Price')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Value input for percentage / fixed */}
                        {(ruleType === 'percentage_discount' ||
                          ruleType === 'fixed_discount' ||
                          ruleType === 'bundle_fixed_price') && (
                          <div className="space-y-2">
                            <Label>
                              {ruleType === 'percentage_discount'
                                ? t('promotions.wizard.step2.percentOff', 'Discount Percentage (%)')
                                : ruleType === 'fixed_discount'
                                ? t('promotions.wizard.step2.fixedAmountOff', {
                                    currency: values.currencyCode,
                                    defaultValue: `Discount Amount (${values.currencyCode})`,
                                  })
                                : t('promotions.common.bundleFixedPrice', 'Bundle Total Price')}
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              {...form.register(`rules.${idx}.discountValue`)}
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>{t('promotions.wizard.step2.applyTo', 'Apply To')}</Label>
                          <Select
                            value={form.watch(`rules.${idx}.applyTo`)}
                            onValueChange={(val: string) =>
                              form.setValue(`rules.${idx}.applyTo`, val)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="matching_items">
                                {t('promotions.wizard.step2.matchingItems', 'Matching Scoped Items')}
                              </SelectItem>
                              <SelectItem value="entire_order">
                                {t('promotions.wizard.step2.entireOrder', 'Entire Order')}
                              </SelectItem>
                              <SelectItem value="cheapest_item">
                                {t('promotions.wizard.step2.cheapestItem', 'Cheapest Item in Cart')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Buy X Get Y Parameters */}
                      {ruleType === 'buy_x_get_y' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg bg-muted/40">
                          <div className="space-y-2">
                            <Label>{t('promotions.wizard.step2.buyQty', 'Buy Quantity (X)')}</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 2"
                              {...form.register(`rules.${idx}.buyQuantity`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('promotions.wizard.step2.getQty', 'Get Quantity (Y)')}</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 1"
                              {...form.register(`rules.${idx}.getQuantity`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('promotions.wizard.step2.getDiscount', 'Discount on Y (%)')}</Label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="100 for Free"
                              {...form.register(`rules.${idx}.getDiscountPercent`)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tiered thresholds */}
                      {values.promoType === 'tiered' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            <Label>{t('promotions.wizard.step2.tierMinQty', 'Tier Minimum Quantity')}</Label>
                            <Input
                              type="number"
                              placeholder="e.g. 5"
                              {...form.register(`rules.${idx}.tierMinQuantity`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              {t('promotions.wizard.step2.tierMinAmount', {
                                currency: values.currencyCode,
                                defaultValue: `Tier Minimum Amount (${values.currencyCode})`,
                              })}
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="e.g. 500"
                              {...form.register(`rules.${idx}.tierMinAmount`)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Scopes & Eligibility */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Product Scopes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    {t('promotions.wizard.step3.title', 'Product & Category Scope')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.wizard.step3.desc',
                      'Choose which catalog items are eligible for this promotion.'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant={values.scopeProductType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue('scopeProductType', 'all')}
                    >
                      {t('promotions.wizard.step3.allProducts', 'Entire Catalog (All Products)')}
                    </Button>
                    <Button
                      type="button"
                      variant={values.scopeProductType === 'selected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue('scopeProductType', 'selected')}
                    >
                      {t('promotions.wizard.step3.selectedCatalog', 'Selected Categories, Brands, or Products')}
                    </Button>
                  </div>

                  {values.scopeProductType === 'selected' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Categories */}
                      <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            {t('promotions.wizard.step3.selectCategories', 'Eligible Categories')}
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            {values.categoryIds?.length || 0} selected
                          </Badge>
                        </div>
                        <VirtualSearchableMultiSelect
                          values={values.categoryIds?.map((c) => c.categoryId) || []}
                          onChange={(ids) => {
                            form.setValue(
                              'categoryIds',
                              ids.map((id) => ({ categoryId: id, isExcluded: false })),
                              { shouldDirty: true }
                            )
                          }}
                          options={categoryOptions}
                          placeholder={t('promotions.wizard.step3.selectCategories', 'Select categories...')}
                          searchPlaceholder="Search categories by name or Arabic..."
                          isLoading={categoriesLoading}
                          emptyText="No matching categories found"
                        />
                      </div>

                      {/* Brands */}
                      <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            {t('promotions.wizard.step3.selectBrands', 'Eligible Brands')}
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            {values.brandIds?.length || 0} selected
                          </Badge>
                        </div>
                        <VirtualSearchableMultiSelect
                          values={values.brandIds?.map((b) => b.brandId) || []}
                          onChange={(ids) => {
                            form.setValue(
                              'brandIds',
                              ids.map((id) => ({ brandId: id, isExcluded: false })),
                              { shouldDirty: true }
                            )
                          }}
                          options={brandOptions}
                          placeholder={t('promotions.wizard.step3.selectBrands', 'Select brands...')}
                          searchPlaceholder="Search brands by name, code, or Arabic..."
                          isLoading={brandsLoading}
                          emptyText="No matching brands found"
                        />
                      </div>

                      {/* Specific Products */}
                      <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            {t('promotions.wizard.step3.selectProducts', 'Specific Products')}
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            {values.productIds?.length || 0} selected
                          </Badge>
                        </div>
                        <VirtualSearchableMultiSelect
                          values={
                            (values.productIds?.map((p) => p.productId).filter(Boolean) as string[]) || []
                          }
                          onChange={(ids) => {
                            form.setValue(
                              'productIds',
                              ids.map((id) => ({ productId: id, isExcluded: false })),
                              { shouldDirty: true }
                            )
                          }}
                          options={productOptions}
                          placeholder={t('promotions.wizard.step3.selectProducts', 'Select specific products...')}
                          searchPlaceholder="Search products by title, SKU..."
                          emptyText="No products found"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location & Store Scopes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {t('promotions.wizard.step3.locationsChannels', 'Branches & Stores Scope')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.wizard.step3.locationsChannelsDesc',
                      'Control which physical or virtual locations this promotion operates in.'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant={values.scopeLocationType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue('scopeLocationType', 'all')}
                    >
                      {t('promotions.wizard.step3.allLocations', 'All Branches & Stores')}
                    </Button>
                    <Button
                      type="button"
                      variant={values.scopeLocationType === 'selected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => form.setValue('scopeLocationType', 'selected')}
                    >
                      {t('promotions.wizard.step3.selectedLocations', 'Selected Locations Only')}
                    </Button>
                  </div>

                  {values.scopeLocationType === 'selected' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2 p-3 rounded-lg border border-border/60">
                        <Label className="text-xs font-semibold">
                          {t('promotions.detailPage.branches', 'Branches')}
                        </Label>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                          {lookups?.branches?.map((br) => {
                            const isSelected = values.branchIds?.some(
                              (b) => b.branchId === br.id
                            )
                            return (
                              <label
                                key={br.id}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const current = values.branchIds || []
                                    if (e.target.checked) {
                                      form.setValue('branchIds', [
                                        ...current,
                                        { branchId: br.id, isExcluded: false },
                                      ])
                                    } else {
                                      form.setValue(
                                        'branchIds',
                                        current.filter((b) => b.branchId !== br.id)
                                      )
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                                <span>{br.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 p-3 rounded-lg border border-border/60">
                        <Label className="text-xs font-semibold">
                          {t('promotions.detailPage.stores', 'Stores')}
                        </Label>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                          {lookups?.stores?.map((st) => {
                            const isSelected = values.storeIds?.some(
                              (s) => s.storeId === st.store_id
                            )
                            return (
                              <label
                                key={st.store_id}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const current = values.storeIds || []
                                    if (e.target.checked) {
                                      form.setValue('storeIds', [
                                        ...current,
                                        { storeId: st.store_id, isExcluded: false },
                                      ])
                                    } else {
                                      form.setValue(
                                        'storeIds',
                                        current.filter((s) => s.storeId !== st.store_id)
                                      )
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                                <span>{st.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Groups & Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t('promotions.wizard.step3.customersChannels', 'Customer Groups & Sales Channels')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        {t('promotions.wizard.step3.specificGroups', 'Customer Groups')}
                      </Label>
                      <Badge variant="outline" className="text-[10px]">
                        {values.customerGroupIds?.length || 0} selected
                      </Badge>
                    </div>
                    <VirtualSearchableMultiSelect
                      values={values.customerGroupIds?.map((g) => g.customerGroupId) || []}
                      onChange={(ids) => {
                        form.setValue(
                          'customerGroupIds',
                          ids.map((id) => ({ customerGroupId: id, isExcluded: false })),
                          { shouldDirty: true }
                        )
                      }}
                      options={customerGroupOptions}
                      placeholder={t('promotions.wizard.step3.specificGroups', 'Select customer groups...')}
                      searchPlaceholder="Search customer groups..."
                      isLoading={customerGroupsLoading}
                      emptyText="No customer groups found"
                    />
                  </div>

                  <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        {t('promotions.detailPage.channels', 'Sales Channels')}
                      </Label>
                      <Badge variant="outline" className="text-[10px]">
                        {values.channelIds?.length || 0} selected
                      </Badge>
                    </div>
                    <VirtualSearchableMultiSelect
                      values={values.channelIds?.map((c) => c.channelId) || []}
                      onChange={(ids) => {
                        form.setValue(
                          'channelIds',
                          ids.map((id) => ({ channelId: id, isExcluded: false })),
                          { shouldDirty: true }
                        )
                      }}
                      options={channelOptions}
                      placeholder={t('promotions.detailPage.channels', 'Select sales channels...')}
                      searchPlaceholder="Search sales channels by name or code..."
                      isLoading={channelsLoading}
                      emptyText="No sales channels found"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 4: Conditions */}
          {currentStep === 4 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-primary" />
                    {t('promotions.wizard.step4.title', 'Eligibility Conditions & Trigger Rules')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.wizard.step4.desc',
                      'Build compound conditions (AND / OR) required before discount triggers.'
                    )}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendCondition({
                      groupId: 'group_1',
                      logicalOperator: 'AND',
                      field: 'order_subtotal',
                      operator: 'gte',
                      value: '100',
                      sortOrder: conditionFields.length,
                    })
                  }
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {t('promotions.wizard.step4.addCondition', 'Add Condition')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {conditionFields.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-border/70 rounded-xl space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'promotions.wizard.step4.noConditions',
                        'No custom conditions configured. The promotion will apply to all qualified items within the scopes defined in Step 3.'
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        appendCondition({
                          groupId: 'group_1',
                          logicalOperator: 'AND',
                          field: 'order_subtotal',
                          operator: 'gte',
                          value: '100',
                          sortOrder: 0,
                        })
                      }
                      className="gap-1 mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('promotions.wizard.step4.addCondition', 'Add Minimum Order Amount Condition')}
                    </Button>
                  </div>
                ) : (
                  conditionFields.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-lg border border-border/60 bg-muted/20 items-end"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('promotions.wizard.step4.field', 'Rule Field')}</Label>
                        <Select
                          value={form.watch(`conditions.${idx}.field`)}
                          onValueChange={(val: string) =>
                            form.setValue(`conditions.${idx}.field`, val as ConditionField)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="order_subtotal">
                              {t('promotions.wizard.step4.orderSubtotal', 'Order Subtotal Amount')}
                            </SelectItem>
                            <SelectItem value="item_quantity">
                              {t('promotions.wizard.step4.itemQuantity', 'Total Items Quantity')}
                            </SelectItem>
                            <SelectItem value="customer_first_order">
                              {t('promotions.wizard.step4.customerFirstOrder', 'First-Time Customer')}
                            </SelectItem>
                            <SelectItem value="customer_order_count">
                              {t('promotions.wizard.step4.customerOrderCount', 'Past Order Count')}
                            </SelectItem>
                            <SelectItem value="day_of_week">
                              {t('promotions.wizard.step4.dayOfWeek', 'Day of Week (1-7)')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('promotions.wizard.step4.operator', 'Operator')}</Label>
                        <Select
                          value={form.watch(`conditions.${idx}.operator`)}
                          onValueChange={(val: string) =>
                            form.setValue(`conditions.${idx}.operator`, val as ConditionOperator)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gte">&gt;=</SelectItem>
                            <SelectItem value="gt">&gt;</SelectItem>
                            <SelectItem value="lte">&lt;=</SelectItem>
                            <SelectItem value="lt">&lt;</SelectItem>
                            <SelectItem value="eq">=</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('promotions.wizard.step4.value', 'Target Value')}</Label>
                        <Input
                          placeholder="e.g. 100"
                          {...form.register(`conditions.${idx}.value`)}
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(idx)}
                          className="text-destructive h-9"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('promotions.common.delete', 'Remove')}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 5: Limits, Stacking & Budget */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('promotions.wizard.step5.title', 'Limits, Stacking & Governance')}
                </CardTitle>
                <CardDescription>
                  {t(
                    'promotions.wizard.step5.desc',
                    'Protect profit margins by configuring usage caps, maximum discount thresholds, and combinations.'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDiscountAmount">
                      {t('promotions.wizard.step5.maxDiscountCap', {
                        currency: values.currencyCode,
                        defaultValue: `Max Discount Cap per Order (${values.currencyCode})`,
                      })}
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 250"
                      {...form.register('maxDiscountAmount')}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t(
                        'promotions.wizard.step5.maxDiscountCapDesc',
                        'Ceiling on total discount given in a single checkout.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">
                      {t('promotions.wizard.step5.globalUsageLimit', 'Total Redemptions Limit')}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 1000"
                      {...form.register('usageLimit')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usagePerCustomer">
                      {t('promotions.wizard.step5.perCustomerUsageLimit', 'Uses per Customer')}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 1"
                      {...form.register('usagePerCustomer')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div className="p-4 rounded-xl border border-border/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">
                          {t('promotions.wizard.step5.allowStacking', 'Allow Stacking')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            'promotions.wizard.step5.allowStackingDesc',
                            'Can combine with other active promotions on the same cart.'
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={values.allowStacking}
                        onCheckedChange={(val) => form.setValue('allowStacking', val)}
                      />
                    </div>

                    {values.allowStacking && (
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="stackingPriority">
                          {t(
                            'promotions.wizard.step5.stackingPriority',
                            'Stacking Priority (Higher applies first)'
                          )}
                        </Label>
                        <Input
                          type="number"
                          {...form.register('stackingPriority')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">
                          {t('promotions.wizard.step5.requiresApproval', 'Manager Approval Required')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            'promotions.wizard.step5.requiresApprovalDesc',
                            'Cashiers applying this discount require supervisor PIN / electronic authorization.'
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={values.requiresApproval}
                        onCheckedChange={(val) => form.setValue('requiresApproval', val)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 6: Review & Confirmation */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCheck2 className="h-5 w-5 text-emerald-600" />
                    {t('promotions.wizard.step6.title', 'Review Promotion Configuration')}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      'promotions.wizard.step6.desc',
                      'Confirm all rules and settings before publishing to POS and sales channels.'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step6.name', 'Name')}
                      </span>
                      <span className="font-semibold text-foreground text-sm">
                        {values.name || t('promotions.wizard.step6.untitled', 'Untitled')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step6.type', 'Type')}
                      </span>
                      <Badge variant="outline" className="mt-0.5 capitalize">
                        {values.promoType?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step1.currency', 'Currency')}
                      </span>
                      <span className="font-semibold text-foreground">{values.currencyCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step6.status', 'Status')}
                      </span>
                      <Badge
                        className={`mt-0.5 ${
                          values.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {t(`promotions.common.${values.status}`, values.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Rules summary */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('promotions.wizard.step6.rulesSummary', {
                        count: values.rules?.length || 0,
                        defaultValue: `Calculated Rules (${values.rules?.length || 0})`,
                      })}
                    </h4>
                    <div className="space-y-1.5">
                      {values.rules?.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {t('promotions.wizard.step2.ruleNumber', {
                                number: i + 1,
                                defaultValue: `Rule #${i + 1}`,
                              })}:
                            </span>
                            <span>{r.ruleType.replace(/_/g, ' ')}</span>
                            <Badge variant="secondary">
                              {r.ruleType === 'percentage_discount'
                                ? `${r.discountValue}%`
                                : r.ruleType === 'fixed_discount'
                                ? `${r.discountValue} ${values.currencyCode}`
                                : `Buy ${r.buyQuantity} Get ${r.getQuantity}`}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {t('promotions.wizard.step2.applyTo', 'Applies to')}: {r.applyTo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limits summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3 rounded-lg border border-border/50 text-xs">
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step5.autoApply', 'Auto-Apply')}
                      </span>
                      <span className="font-semibold">
                        {values.autoApply
                          ? t('promotions.wizard.step6.yesAuto', 'Yes (Automatic)')
                          : t('promotions.wizard.step6.noCoupon', 'No (Coupon required)')}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 text-xs">
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step6.stackable', 'Stackable')}
                      </span>
                      <span className="font-semibold">
                        {values.allowStacking
                          ? t('promotions.wizard.step6.yes', 'Yes')
                          : t('promotions.wizard.step6.noSingle', 'No (Single use)')}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-border/50 text-xs">
                      <span className="text-muted-foreground block">
                        {t('promotions.wizard.step6.maxCap', 'Max Cap')}
                      </span>
                      <span className="font-semibold">
                        {values.maxDiscountAmount
                          ? `${values.maxDiscountAmount} ${values.currencyCode}`
                          : t('promotions.common.unlimited', 'Unlimited')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="gap-1"
            >
              {t('promotions.common.previous', 'Previous')}
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < 6 ? (
                <Button type="button" onClick={handleNext} className="gap-1">
                  {t('promotions.wizard.next', 'Next Step')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Check className="h-4 w-4" />
                  {isEditMode
                    ? t('promotions.wizard.updateBtn', 'Update Promotion')
                    : t('promotions.wizard.publishBtn', 'Publish Promotion')}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Main>
    </div>
  )
}
