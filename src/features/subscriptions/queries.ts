import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { calculateEndDate } from '@/lib/subscription_utils'

export const subscriptionQueryKeys = {
  all: ['subscriptions'] as const,
  plans: () => [...subscriptionQueryKeys.all, 'plans'] as const,
  tenantSubs: () => [...subscriptionQueryKeys.all, 'tenant-subs'] as const,
  byTenantId: (tenantId: string) =>
    [...subscriptionQueryKeys.tenantSubs(), tenantId] as const,
}

// Fetch available subscription plans
async function getSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('duration_months', { ascending: true })

  if (error) throw error
  return data
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionQueryKeys.plans(),
    queryFn: getSubscriptionPlans,
  })
}

// Fetch tenant subscriptions
async function getTenantSubscriptions() {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(
      `
      *,
      subscriptions (
        name,
        duration_months
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export function useTenantSubscriptions() {
  return useQuery({
    queryKey: subscriptionQueryKeys.tenantSubs(),
    queryFn: getTenantSubscriptions,
  })
}

// Assign subscription to tenant
async function assignSubscription(payload: {
  auth_user_id: string
  email: string
  first_name?: string
  last_name?: string
  is_owner?: boolean
  subscription_id: number | string
  status: 'new' | 'paid' | 'canceled'
  start_date?: Date | string
  end_date?: Date | string
}) {
  const { data: existingSubs, error: fetchError } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('auth_user_id', payload.auth_user_id)
    .eq('status', 'paid')
    .gte('end_date', new Date().toISOString())
    .order('end_date', { ascending: false })
    .limit(1)

  if (fetchError) throw fetchError

  let durationMonths = 1
  try {
    const { data: planData } = await supabase
      .from('subscriptions')
      .select('duration_months')
      .eq('id', payload.subscription_id)
      .maybeSingle()

    if (planData?.duration_months) {
      durationMonths = planData.duration_months
    }
  } catch {
    // fallback if plan lookup fails
  }

  let finalStartDate = payload.start_date ? new Date(payload.start_date) : new Date()
  let isExtension = false

  if (existingSubs && existingSubs.length > 0 && existingSubs[0].end_date) {
    const activeSub = existingSubs[0]
    finalStartDate = new Date(activeSub.end_date)
    isExtension = true
  }

  const finalEndDate = calculateEndDate(finalStartDate, durationMonths)

  const monthsDiff = (d1: Date, d2: Date) => {
    return (
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth())
    )
  }
  const totalMonths = Math.max(durationMonths, monthsDiff(new Date(), finalEndDate))

  const insertPayload = {
    ...payload,
    start_date: finalStartDate,
    end_date: finalEndDate,
  }

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert([insertPayload])
    .select()
    .maybeSingle()

  if (error) throw error

  return { data, isExtension, totalMonths }
}

export function useAssignSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.tenantSubs(),
      })
    },
  })
}

// Fetch current user's subscription status
async function getCurrentUserSubscription(authUserId: string) {
  if (!authUserId) return null

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null // No record found
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

// Subscription Analytics
async function getSubscriptionAnalytics(userId: string) {
  const { data: allSubs, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .eq('auth_user_id', userId)
    .eq('status', 'paid')

  if (error) throw error

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const activeSubs = allSubs.filter(
    (s) => s.status === 'paid' && s.end_date && new Date(s.end_date) > now
  )

  const totalRevenue = allSubs
    .filter((s) => s.status === 'paid')
    .reduce((acc, s) => acc + (s.subscriptions?.price || 0), 0)

  const upcomingExpirations = allSubs.filter(
    (s) =>
      s.status === 'paid' &&
      s.end_date &&
      new Date(s.end_date) > now &&
      new Date(s.end_date) <= thirtyDaysFromNow
  )

  const newSubs = allSubs.filter((s) => {
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
    recentSubscriptions: allSubs.slice(0, 5),
  }
}

export function useSubscriptionAnalytics(userId: string) {
  return useQuery({
    queryKey: [...subscriptionQueryKeys.all, 'analytics', userId],
    queryFn: () => getSubscriptionAnalytics(userId),
    enabled: !!userId,
  })
}

// Update subscription status (admin only)
async function updateSubscriptionStatus(payload: {
  id: string
  status: 'new' | 'paid' | 'canceled'
}) {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update({ status: payload.status, updated_at: new Date() })
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
        queryKey: subscriptionQueryKeys.tenantSubs(),
      })
      queryClient.invalidateQueries({
        queryKey: [...subscriptionQueryKeys.all, 'analytics'],
      })
    },
  })
}
