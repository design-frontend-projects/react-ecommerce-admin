import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { AvailablePlansTab } from '../components/available-plans-tab'
import { CurrentSubscriptionTab } from '../components/current-subscription-tab'
import { SubscriptionInvoiceDialog } from '../components/subscription-invoice-dialog'
import { SubscriptionPreviewDialog } from '../components/subscription-preview-dialog'
import { SubscriptionTenantUsersTab } from '../components/subscription-tenant-users-tab'
import type {
  PlatformSubscriptionPlan,
  SubscriptionTenantUser,
  TenantResourceUsageSummary,
  TenantSubscriptionRecord,
} from '../types'

const mockSubscribeMutate = vi.fn()

vi.mock('../queries', () => ({
  useSubscribeToPlan: () => ({
    mutateAsync: mockSubscribeMutate,
    isPending: false,
  }),
}))

const starterPlan: PlatformSubscriptionPlan = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'STARTER_MONTHLY',
  name: 'Starter Monthly',
  description: 'Ideal for single-branch operations',
  tier: 'starter',
  billing_interval: 'month',
  duration_months: 1,
  price: 499,
  currency: 'LE',
  setup_fee: 0,
  discount_percentage: 0,
  trial_period_days: 7,
  grace_period_days: 7,
  max_branches: 1,
  max_users: 5,
  max_stores: 1,
  max_warehouses: 1,
  max_products: 500,
  max_tables: 20,
  max_pos_registers: 2,
  max_monthly_orders: 1000,
  max_storage_mb: 1024,
  has_restaurant_pos: false,
  has_inventory_tracking: true,
  has_kitchen_display: false,
  has_delivery_management: false,
  has_api_access: false,
  has_advanced_reports: false,
  has_audit_logs: false,
  has_priority_support: false,
  allowed_modules: ['inventory'],
  features: ['Basic Stock Reports', 'Barcode Scanning'],
  metadata: {},
  is_active: true,
  is_public: true,
  is_popular: false,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const enterprisePlan: PlatformSubscriptionPlan = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'ENTERPRISE_YEARLY',
  name: 'Enterprise Annual',
  description: 'Complete multi-branch restaurant & inventory suite',
  tier: 'enterprise',
  billing_interval: 'year',
  duration_months: 12,
  price: 4990,
  currency: 'LE',
  setup_fee: 100,
  discount_percentage: 20,
  trial_period_days: 14,
  grace_period_days: 14,
  max_branches: -1,
  max_users: 25,
  max_stores: 10,
  max_warehouses: 10,
  max_products: -1,
  max_tables: 100,
  max_pos_registers: 15,
  max_monthly_orders: -1,
  max_storage_mb: 10240,
  has_restaurant_pos: true,
  has_inventory_tracking: true,
  has_kitchen_display: true,
  has_delivery_management: true,
  has_api_access: true,
  has_advanced_reports: true,
  has_audit_logs: true,
  has_priority_support: true,
  allowed_modules: ['inventory', 'restaurant'],
  features: ['Dedicated SLA', 'Custom Webhooks'],
  metadata: {},
  is_active: true,
  is_public: true,
  is_popular: true,
  sort_order: 2,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const activeTenantSub: TenantSubscriptionRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  auth_user_id: '44444444-4444-4444-8444-444444444444',
  email: 'owner@tenant.com',
  status: 'paid',
  first_use: false,
  start_date: '2026-10-01T00:00:00.000Z',
  end_date: '2026-12-01T00:00:00.000Z',
  trial_ends_at: null,
  grace_ends_at: '2026-12-08T00:00:00.000Z',
  cancelled_at: null,
  auto_renew: true,
  price_at_purchase: 499,
  currency: 'LE',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  commission_amount: 0,
  commission_type: 'subscription',
  first_name: 'Ahmed',
  last_name: 'Hassan',
  is_owner: true,
  tenant_id: '55555555-5555-4555-8555-555555555555',
  subscription_id: starterPlan.id,
  payment_method: 'card',
  transfer_ref: 'TRX-1001',
  billing_details: null,
  custom_max_branches: 2,
  custom_max_users: null,
  custom_max_stores: null,
  custom_max_warehouses: null,
  custom_max_products: null,
  custom_max_storage_mb: null,
  custom_features: null,
  subscriptions: starterPlan,
}

const sampleUsers: SubscriptionTenantUser[] = [
  {
    id: 'u1',
    auth_user_id: '44444444-4444-4444-8444-444444444444',
    email: 'owner@tenant.com',
    phone: '+201000000001',
    first_name: 'Ahmed',
    last_name: 'Hassan',
    avatar_url: null,
    primary_module: 'inventory',
    modules: ['inventory', 'restaurant'],
    is_active: true,
    is_blocked: false,
    default_role: 'super_admin',
    onboarding_complete: true,
    last_login_at: '2026-10-28T10:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    branch_name: 'Cairo HQ Branch',
    store_name: 'Main Store',
    roles: ['super_admin'],
  },
  {
    id: 'u2',
    auth_user_id: '66666666-6666-4666-8666-666666666666',
    email: 'cashier@tenant.com',
    phone: '+201000000002',
    first_name: 'Sara',
    last_name: 'Ali',
    avatar_url: null,
    primary_module: 'restaurant',
    modules: ['restaurant'],
    is_active: true,
    is_blocked: false,
    default_role: 'cashier',
    onboarding_complete: true,
    last_login_at: null,
    created_at: '2026-10-05T00:00:00.000Z',
    branch_name: 'Cairo HQ Branch',
    store_name: null,
    roles: ['cashier'],
  },
]

const sampleUsage: TenantResourceUsageSummary = {
  branches: 1,
  users: 2,
  stores: 1,
  warehouses: 1,
  products: 120,
  tables: 8,
  posRegisters: 1,
  monthlyOrders: 240,
  storageMbUsed: 128,
}

describe('Tenant Subscriptions Module Components', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockSubscribeMutate.mockReset()
  })

  test('CurrentSubscriptionTab renders current plan options, custom overrides, expiration info, and history', () => {
    const onSwitchPlans = vi.fn()
    const onSwitchUsers = vi.fn()
    const onPreview = vi.fn()

    render(
      <CurrentSubscriptionTab
        currentSubscription={activeTenantSub}
        subscriptionHistory={[activeTenantSub]}
        usage={sampleUsage}
        onSwitchToPlansTab={onSwitchPlans}
        onSwitchToUsersTab={onSwitchUsers}
        onPreviewPlan={onPreview}
      />
    )

    expect(screen.getAllByText('Starter Monthly').length).toBeGreaterThan(0)
    expect(screen.getByText('STARTER_MONTHLY')).toBeInTheDocument()
    expect(
      screen.getByText(/Custom Tenant Override \(Base: 1\)/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/120 \/ 500/i)).toBeInTheDocument()
    expect(screen.getByText('Inventory Tracking')).toBeInTheDocument()
  })

  test('AvailablePlansTab displays all platform plans and triggers single-active-subscription confirmation dialog', async () => {
    mockSubscribeMutate.mockResolvedValue({
      subscription: { ...activeTenantSub, subscription_id: enterprisePlan.id },
      supersededCount: 1,
    })
    const onPreview = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <AvailablePlansTab
          availablePlans={[starterPlan, enterprisePlan]}
          currentSubscription={activeTenantSub}
          onPreviewPlan={onPreview}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Starter Monthly')).toBeInTheDocument()
    expect(screen.getByText('Enterprise Annual')).toBeInTheDocument()

    // Click 'Switch to Plan' on Enterprise Annual
    const switchBtn = screen.getByRole('button', { name: /switch to plan/i })
    fireEvent.click(switchBtn)

    expect(
      screen.getByText(/Single Active Subscription Policy/i)
    ).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', {
      name: /confirm & switch plan/i,
    })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockSubscribeMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_id: enterprisePlan.id,
        })
      )
    })
  })

  test('SubscriptionPreviewDialog shows full plan details, projected expiration, and related tenant users compatibility', () => {
    render(
      <SubscriptionPreviewDialog
        plan={enterprisePlan}
        currentSubscription={activeTenantSub}
        tenantUsers={sampleUsers}
        usage={sampleUsage}
        open={true}
        onOpenChange={() => {}}
      />
    )

    expect(screen.getByText('Enterprise Annual')).toBeInTheDocument()
    expect(screen.getByText('ENTERPRISE_YEARLY')).toBeInTheDocument()
    expect(screen.getByText('Dedicated SLA')).toBeInTheDocument()
    expect(screen.getByText(/2 Active \/ 25 Allowed Seats/i)).toBeInTheDocument()
    expect(screen.getByText(/Ahmed Hassan/i)).toBeInTheDocument()
  })

  test('SubscriptionTenantUsersTab renders seat usage and related tenant_users', () => {
    render(
      <SubscriptionTenantUsersTab
        tenantUsers={sampleUsers}
        currentSubscription={activeTenantSub}
      />
    )

    expect(screen.getByText('2 / 5 Seats Used')).toBeInTheDocument()
    expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument()
    expect(screen.getByText('Sara Ali')).toBeInTheDocument()
    expect(screen.getAllByText('Cairo HQ Branch').length).toBeGreaterThan(0)
  })

  test('SubscriptionInvoiceDialog renders billing receipt, tax invoice specs, and print action', () => {
    render(
      <SubscriptionInvoiceDialog
        subscription={activeTenantSub}
        open={true}
        onOpenChange={() => {}}
      />
    )

    expect(
      screen.getByText(/Subscription Receipt & Tax Invoice/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/^PAID$/i)).toBeInTheDocument()
    expect(screen.getByText('INV-TRX-1001')).toBeInTheDocument()
    expect(screen.getAllByText(/Ahmed Hassan/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Starter Monthly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Print Receipt/i })).toBeInTheDocument()
  })
})

