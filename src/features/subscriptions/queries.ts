import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authorizedRequest } from '@/lib/api-client'
import { resolveClientTenantId } from '@/lib/client-tenant'
import {
  calculateEndDate,
  isActiveSubscriptionStatus,
} from '@/lib/subscription_utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type {
  PlatformSubscriptionPlan,
  SubscriptionTenantUser,
  TenantResourceUsageSummary,
  TenantSubscriptionOverview,
  TenantSubscriptionRecord,
} from './types'

export const subscriptionQueryKeys = {
  all: ['subscriptions'] as const,
  overview: (userId?: string) =>
    [...subscriptionQueryKeys.all, 'overview', userId ?? 'current'] as const,
  plans: () => [...subscriptionQueryKeys.all, 'plans'] as const,
  tenantSubs: () => [...subscriptionQueryKeys.all, 'tenant-subs'] as const,
  byTenantId: (tenantId: string) =>
    [...subscriptionQueryKeys.tenantSubs(), tenantId] as const,
}

async function getAccessToken(): Promise<string | null> {
  const storeToken = useAuthStore.getState().auth.session?.access_token
  if (storeToken) return storeToken
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePlan(raw: any): PlatformSubscriptionPlan {
  let features: string[] = []
  if (Array.isArray(raw.features)) {
    features = raw.features.map(String)
  } else if (typeof raw.features === 'string') {
    try {
      const parsed = JSON.parse(raw.features)
      if (Array.isArray(parsed)) features = parsed.map(String)
    } catch {
      features = []
    }
  }

  return {
    id: String(raw.id),
    code: raw.code ?? null,
    name: String(raw.name ?? ''),
    description: raw.description ?? null,
    tier: raw.tier ?? 'starter',
    billing_interval: raw.billing_interval ?? 'month',
    duration_months: Number(raw.duration_months ?? 1),
    price: Number(raw.price ?? 0),
    currency: String(raw.currency ?? 'LE').trim(),
    setup_fee: Number(raw.setup_fee ?? 0),
    discount_percentage: Number(raw.discount_percentage ?? 0),
    trial_period_days: Number(raw.trial_period_days ?? 0),
    grace_period_days: Number(raw.grace_period_days ?? 7),
    max_branches: Number(raw.max_branches ?? 1),
    max_users: Number(raw.max_users ?? 3),
    max_stores: Number(raw.max_stores ?? 1),
    max_warehouses: Number(raw.max_warehouses ?? 1),
    max_products: Number(raw.max_products ?? 500),
    max_tables: Number(raw.max_tables ?? 20),
    max_pos_registers: Number(raw.max_pos_registers ?? 2),
    max_monthly_orders: Number(raw.max_monthly_orders ?? 1000),
    max_storage_mb: Number(raw.max_storage_mb ?? 1024),
    has_restaurant_pos: Boolean(raw.has_restaurant_pos),
    has_inventory_tracking: Boolean(raw.has_inventory_tracking ?? true),
    has_kitchen_display: Boolean(raw.has_kitchen_display),
    has_delivery_management: Boolean(raw.has_delivery_management),
    has_api_access: Boolean(raw.has_api_access),
    has_advanced_reports: Boolean(raw.has_advanced_reports),
    has_audit_logs: Boolean(raw.has_audit_logs),
    has_priority_support: Boolean(raw.has_priority_support),
    allowed_modules: Array.isArray(raw.allowed_modules)
      ? raw.allowed_modules
      : ['inventory'],
    features,
    metadata:
      raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    is_active: Boolean(raw.is_active ?? true),
    is_public: Boolean(raw.is_public ?? true),
    is_popular: Boolean(raw.is_popular),
    sort_order: Number(raw.sort_order ?? 0),
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTenantSubscription(raw: any): TenantSubscriptionRecord {
  return {
    id: String(raw.id),
    auth_user_id: String(raw.auth_user_id ?? ''),
    email: String(raw.email ?? ''),
    status: raw.status ?? 'new',
    first_use: Boolean(raw.first_use),
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    trial_ends_at: raw.trial_ends_at ?? null,
    grace_ends_at: raw.grace_ends_at ?? null,
    cancelled_at: raw.cancelled_at ?? null,
    auto_renew: Boolean(raw.auto_renew ?? true),
    price_at_purchase: Number(
      raw.price_at_purchase ?? raw.subscriptions?.price ?? 0
    ),
    currency: String(
      raw.currency ?? raw.subscriptions?.currency ?? 'LE'
    ).trim(),
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    commission_amount: Number(raw.commission_amount ?? 0),
    commission_type: String(raw.commission_type ?? 'subscription'),
    first_name: raw.first_name ?? null,
    last_name: raw.last_name ?? null,
    is_owner: raw.is_owner ?? null,
    tenant_id: raw.tenant_id ?? null,
    subscription_id: String(raw.subscription_id ?? ''),
    payment_method: raw.payment_method ?? null,
    transfer_ref: raw.transfer_ref ?? null,
    billing_details: raw.billing_details ?? null,
    custom_max_branches: raw.custom_max_branches ?? null,
    custom_max_users: raw.custom_max_users ?? null,
    custom_max_stores: raw.custom_max_stores ?? null,
    custom_max_warehouses: raw.custom_max_warehouses ?? null,
    custom_max_products: raw.custom_max_products ?? null,
    custom_max_storage_mb: raw.custom_max_storage_mb ?? null,
    custom_features: raw.custom_features ?? null,
    subscriptions: raw.subscriptions ? normalizePlan(raw.subscriptions) : null,
  }
}

async function fetchTenantSubscriptionOverviewFallback(): Promise<TenantSubscriptionOverview> {
  const { user } = useAuthStore.getState().auth
  const tenantId = await resolveClientTenantId()

  const [plansRes, subsRes, usersRes, tenantRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('duration_months', { ascending: true }),
    tenantId
      ? supabase
          .from('tenant_subscriptions')
          .select('*, subscriptions(*)')
          .or(
            user?.id
              ? `tenant_id.eq.${tenantId},auth_user_id.eq.${user.id}`
              : `tenant_id.eq.${tenantId}`
          )
          .order('created_at', { ascending: false })
      : user?.id
        ? supabase
            .from('tenant_subscriptions')
            .select('*, subscriptions(*)')
            .eq('auth_user_id', user.id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    tenantId
      ? supabase
          .from('tenant_users')
          .select('*, branches(name), stores(name)')
          .or(`tenant_id.eq.${tenantId},parent_tenant_id.eq.${tenantId}`)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
      : user?.id
        ? supabase
            .from('tenant_users')
            .select('*, branches(name), stores(name)')
            .eq('auth_user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
    tenantId
      ? supabase
          .from('tenants')
          .select(
            'id, name, display_name, tenant_code, status, currency_code, current_subscription_id'
          )
          .eq('id', tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const availablePlans = (plansRes.data ?? []).map(normalizePlan)
  const subscriptionHistory = (subsRes.data ?? []).map(
    normalizeTenantSubscription
  )

  const currentSubscription =
    subscriptionHistory.find((s) => isActiveSubscriptionStatus(s.status)) ??
    subscriptionHistory[0] ??
    null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantUsers: SubscriptionTenantUser[] = (usersRes.data ?? []).map((u: any) => ({
    id: String(u.id),
    auth_user_id: u.auth_user_id ?? null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    avatar_url: u.avatar_url ?? null,
    primary_module: u.primary_module ?? 'inventory',
    modules: Array.isArray(u.modules) ? u.modules : ['inventory'],
    is_active: Boolean(u.is_active ?? true),
    is_blocked: Boolean(u.is_blocked ?? false),
    default_role: u.default_role ?? null,
    onboarding_complete: Boolean(u.onboarding_complete),
    last_login_at: u.last_login_at ?? null,
    created_at: u.created_at ?? null,
    branch_name: u.branches?.name ?? null,
    store_name: u.stores?.name ?? null,
    roles: u.default_role ? [u.default_role] : [],
  }))

  const usage: TenantResourceUsageSummary = {
    branches: 1,
    users: tenantUsers.filter((u) => u.is_active && !u.is_blocked).length,
    stores: 0,
    warehouses: 0,
    products: 0,
    tables: 0,
    posRegisters: 0,
    monthlyOrders: 0,
    storageMbUsed: 0,
  }

  const tData = tenantRes.data
  return {
    tenant: tData
      ? {
          id: tData.id,
          name: tData.display_name || tData.name,
          tenant_code: tData.tenant_code,
          status: tData.status,
          currency_code: tData.currency_code ?? null,
          current_subscription_id: tData.current_subscription_id ?? null,
        }
      : null,
    currentSubscription,
    subscriptionHistory,
    availablePlans,
    tenantUsers,
    usage,
  }
}

export async function getTenantSubscriptionOverview(): Promise<TenantSubscriptionOverview> {
  try {
    const response = (await authorizedRequest(
      getAccessToken,
      '/api/tenant/subscription/overview'
    )) as { success: boolean; data: TenantSubscriptionOverview }
    if (response?.data) {
      return response.data
    }
  } catch {
    // Fallback to direct tenant-scoped queries if server route is unavailable
  }
  return fetchTenantSubscriptionOverviewFallback()
}

export function useTenantSubscriptionOverview() {
  const userId = useAuthStore((state) => state.auth.user?.id)
  return useQuery({
    queryKey: subscriptionQueryKeys.overview(userId),
    queryFn: getTenantSubscriptionOverview,
  })
}

export interface SubscribeToPlanPayload {
  subscription_id: string
  payment_method?: string
  transfer_ref?: string | null
  auto_renew?: boolean
}

async function subscribeToPlan(payload: SubscribeToPlanPayload) {
  try {
    const response = (await authorizedRequest(
      getAccessToken,
      '/api/tenant/subscription/subscribe',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )) as {
      success: boolean
      data: {
        subscription: TenantSubscriptionRecord
        supersededCount: number
      }
    }
    return response.data
  } catch (apiErr) {
    // Fallback for client-only environment: enforce single active subscription
    const { user, profile } = useAuthStore.getState().auth
    if (!user) throw apiErr

    const tenantId = await resolveClientTenantId()
    const result = await assignSubscription({
      auth_user_id: user.id,
      tenant_id: tenantId ?? undefined,
      email: user.email ?? profile?.email ?? '',
      first_name: profile?.first_name ?? undefined,
      last_name: profile?.last_name ?? undefined,
      is_owner: true,
      subscription_id: payload.subscription_id,
      status: 'paid',
      payment_method: payload.payment_method,
      transfer_ref: payload.transfer_ref ?? undefined,
      auto_renew: payload.auto_renew,
    })

    return {
      subscription: normalizeTenantSubscription(result.data),
      supersededCount: result.supersededCount ?? 0,
    }
  }
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: subscribeToPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.all,
      })
    },
  })
}

// Fetch available subscription plans
async function getSubscriptionPlans(): Promise<PlatformSubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('duration_months', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizePlan)
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionQueryKeys.plans(),
    queryFn: getSubscriptionPlans,
  })
}

// Fetch tenant subscriptions scoped to current tenant
async function getTenantSubscriptions(): Promise<TenantSubscriptionRecord[]> {
  const overview = await getTenantSubscriptionOverview()
  return overview.subscriptionHistory
}

export function useTenantSubscriptions() {
  return useQuery({
    queryKey: subscriptionQueryKeys.tenantSubs(),
    queryFn: getTenantSubscriptions,
  })
}

// Assign subscription to tenant (enforcing only ONE active subscription per tenant)
async function assignSubscription(payload: {
  auth_user_id: string
  tenant_id?: string
  email: string
  first_name?: string
  last_name?: string
  is_owner?: boolean
  subscription_id: number | string
  status: 'new' | 'paid' | 'canceled' | 'active' | 'trial'
  start_date?: Date | string
  end_date?: Date | string
  payment_method?: string
  transfer_ref?: string
  auto_renew?: boolean
}) {
  const now = new Date()
  let durationMonths = 1
  let planPrice = 0
  let planCurrency = 'LE'

  try {
    const { data: planData } = await supabase
      .from('subscriptions')
      .select('duration_months, price, currency')
      .eq('id', String(payload.subscription_id))
      .maybeSingle()

    if (planData?.duration_months) {
      durationMonths = Number(planData.duration_months)
    }
    if (planData?.price !== undefined) {
      planPrice = Number(planData.price)
    }
    if (planData?.currency) {
      planCurrency = String(planData.currency).slice(0, 3)
    }
  } catch {
    // fallback if plan lookup fails
  }

  const finalStartDate = payload.start_date
    ? new Date(payload.start_date)
    : now
  const finalEndDate = payload.end_date
    ? new Date(payload.end_date)
    : calculateEndDate(finalStartDate, durationMonths)

  // Supersede and cancel any existing active subscriptions for this tenant/user
  let supersededCount = 0
  if (isActiveSubscriptionStatus(payload.status)) {
    const filterOr = payload.tenant_id
      ? `tenant_id.eq.${payload.tenant_id},auth_user_id.eq.${payload.auth_user_id}`
      : `auth_user_id.eq.${payload.auth_user_id}`

    const { data: cancelledRows } = await supabase
      .from('tenant_subscriptions')
      .update({
        status: 'canceled',
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .or(filterOr)
      .in('status', ['paid', 'active', 'trial', 'new', 'grace_period'])
      .select('id')

    supersededCount = cancelledRows?.length ?? 0
  }

  const insertPayload = {
    auth_user_id: payload.auth_user_id,
    tenant_id: payload.tenant_id ?? null,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    is_owner: payload.is_owner ?? true,
    subscription_id: String(payload.subscription_id),
    status: payload.status,
    first_use: false,
    start_date: finalStartDate.toISOString(),
    end_date: finalEndDate.toISOString(),
    price_at_purchase: planPrice,
    currency: planCurrency,
    payment_method: payload.payment_method ?? 'card',
    transfer_ref: payload.transfer_ref ?? null,
    auto_renew: payload.auto_renew ?? true,
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert([insertPayload])
    .select('*, subscriptions(*)')
    .maybeSingle()

  if (error) throw error

  if (payload.tenant_id && data?.id) {
    await supabase
      .from('tenants')
      .update({ current_subscription_id: data.id, updated_at: now.toISOString() })
      .eq('id', payload.tenant_id)
  }

  return {
    data,
    isExtension: false,
    supersededCount,
    totalMonths: durationMonths,
  }
}

export function useAssignSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.all,
      })
    },
  })
}

// Fetch current user's active subscription status
async function getCurrentUserSubscription(authUserId: string) {
  if (!authUserId) return null

  const tenantId = await resolveClientTenantId()
  const filterOr = tenantId
    ? `tenant_id.eq.${tenantId},auth_user_id.eq.${authUserId}`
    : `auth_user_id.eq.${authUserId}`

  // Prefer active subscription record first
  const { data: activeData, error: activeError } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .or(filterOr)
    .in('status', ['paid', 'active', 'trial', 'grace_period'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!activeError && activeData) {
    return activeData
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .or(filterOr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export function useSubscriptionStatus(authUserId: string | undefined) {
  return useQuery({
    queryKey: subscriptionQueryKeys.byTenantId(authUserId ?? ''),
    queryFn: () => getCurrentUserSubscription(authUserId!),
    enabled: !!authUserId,
  })
}

// Subscription Analytics for current tenant
async function getSubscriptionAnalytics(userId: string) {
  const tenantId = await resolveClientTenantId()
  const filterOr = tenantId
    ? `tenant_id.eq.${tenantId},auth_user_id.eq.${userId}`
    : `auth_user_id.eq.${userId}`

  const { data: allSubs, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .or(filterOr)

  if (error) throw error

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const activeSubs = (allSubs ?? []).filter(
    (s) =>
      isActiveSubscriptionStatus(s.status) &&
      s.end_date &&
      new Date(s.end_date) > now
  )

  const totalRevenue = (allSubs ?? [])
    .filter((s) => isActiveSubscriptionStatus(s.status))
    .reduce(
      (acc, s) =>
        acc + Number(s.price_at_purchase ?? s.subscriptions?.price ?? 0),
      0
    )

  const upcomingExpirations = activeSubs.filter(
    (s) => s.end_date && new Date(s.end_date) <= thirtyDaysFromNow
  )

  const newSubs = (allSubs ?? []).filter((s) => {
    if (!s.created_at) return false
    const created = new Date(s.created_at)
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    )
  })

  return {
    totalActive: activeSubs.length,
    totalRevenue,
    upcomingExpirations: upcomingExpirations.length,
    newSubscriptions: newSubs.length,
    recentSubscriptions: (allSubs ?? []).slice(0, 5),
  }
}

export function useSubscriptionAnalytics(userId: string) {
  return useQuery({
    queryKey: [...subscriptionQueryKeys.all, 'analytics', userId],
    queryFn: () => getSubscriptionAnalytics(userId),
    enabled: !!userId,
  })
}

// Update subscription status
async function updateSubscriptionStatus(payload: {
  id: string
  status: 'new' | 'paid' | 'canceled'
}) {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update({ status: payload.status, updated_at: new Date().toISOString() })
    .eq('id', payload.id)
    .select()
    .maybeSingle()

  if (error) throw error
  return data
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSubscriptionStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.all,
      })
    },
  })
}
