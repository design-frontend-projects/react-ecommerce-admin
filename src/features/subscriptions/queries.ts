import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const subscriptionQueryKeys = {
  all: ['subscriptions'] as const,
  plans: () => [...subscriptionQueryKeys.all, 'plans'] as const,
  tenantSubs: () => [...subscriptionQueryKeys.all, 'tenant-subs'] as const,
  byTenantId: (tenantId: string) => [...subscriptionQueryKeys.tenantSubs(), tenantId] as const,
};

// Fetch available subscription plans
async function getSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('duration_months', { ascending: true });

  if (error) throw error;
  return data;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionQueryKeys.plans(),
    queryFn: getSubscriptionPlans,
  });
}

// Fetch tenant subscriptions
async function getTenantSubscriptions() {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select(`
      *,
      subscriptions (
        name,
        duration_months
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export function useTenantSubscriptions() {
  return useQuery({
    queryKey: subscriptionQueryKeys.tenantSubs(),
    queryFn: getTenantSubscriptions,
  });
}

// Assign subscription to tenant
async function assignSubscription(payload: {
  clerk_user_id: string;
  email: string;
  subscription_id: number;
  status: 'new' | 'paid' | 'canceled';
  start_date: Date;
  end_date: Date;
}) {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useAssignSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: assignSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.tenantSubs() });
    },
  });
}

// Fetch current user's subscription status
async function getCurrentUserSubscription(clerkUserId: string) {
  if (!clerkUserId) return null;

  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)')
    .eq('clerk_user_id', clerkUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No record found
    throw error;
  }
  return data;
}

export function useSubscriptionStatus(clerkUserId: string | undefined) {
  return useQuery({
    queryKey: subscriptionQueryKeys.byTenantId(clerkUserId ?? ''),
    queryFn: () => getCurrentUserSubscription(clerkUserId!),
    enabled: !!clerkUserId,
  });
}

// Subscription Analytics
async function getSubscriptionAnalytics() {
  const { data: allSubs, error } = await supabase
    .from('tenant_subscriptions')
    .select('*, subscriptions(*)');

  if (error) throw error;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activeSubs = allSubs.filter(s => 
    s.status === 'paid' && s.end_date && new Date(s.end_date) > now
  );

  const totalRevenue = allSubs
    .filter(s => s.status === 'paid')
    .reduce((acc, s) => acc + (s.subscriptions?.price || 0), 0);

  const upcomingExpirations = allSubs.filter(s => 
    s.status === 'paid' && 
    s.end_date && 
    new Date(s.end_date) > now && 
    new Date(s.end_date) <= thirtyDaysFromNow
  );

  const newSubs = allSubs.filter(s => {
    const created = new Date(s.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  return {
    totalActive: activeSubs.length,
    totalRevenue,
    upcomingExpirations: upcomingExpirations.length,
    newSubscriptions: newSubs.length,
    recentSubscriptions: allSubs.slice(0, 5),
  };
}

export function useSubscriptionAnalytics() {
  return useQuery({
    queryKey: [...subscriptionQueryKeys.all, 'analytics'],
    queryFn: getSubscriptionAnalytics,
  });
}

// Update subscription status (admin only)
async function updateSubscriptionStatus(payload: { id: string, status: 'new' | 'paid' | 'canceled' }) {
  const { data, error } = await supabase
    .from('tenant_subscriptions')
    .update({ status: payload.status, updated_at: new Date() })
    .eq('id', payload.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useUpdateSubscriptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSubscriptionStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.tenantSubs() });
      queryClient.invalidateQueries({ queryKey: [...subscriptionQueryKeys.all, 'analytics'] });
    },
  });
}
