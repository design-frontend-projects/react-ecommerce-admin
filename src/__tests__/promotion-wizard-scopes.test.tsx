import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PromotionWizardPage } from '@/features/promotions/pages/promotion-wizard-page'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultVal?: string | Record<string, unknown>) => {
      if (typeof defaultVal === 'string') return defaultVal
      return _key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => children || i18nKey || null,
}))

// Mock router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ promotionId: 'new' }),
  useSearch: () => ({}),
  useLocation: () => ({ pathname: '/promotions/new', search: {} }),
  Link: ({ children, ...props }: { children?: React.ReactNode }) => <a {...props}>{children}</a>,
}))

// Mock Header layout component
vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/stores/auth-store', () => {
  const mockState = {
    auth: {
      user: { id: 'mock-user-123' },
      profile: { tenant_id: '00000000-0000-0000-0000-000000000001' },
    },
  }
  const store = (selector: (state: typeof mockState) => unknown) => selector(mockState)
  store.getState = () => mockState
  return { useAuthStore: store }
})

// Mock lookup queries
vi.mock('@/features/promotions/hooks/use-inv-promotions', () => ({
  usePromotionLookupData: () => ({
    data: {
      currencies: [
        { id: 'curr-1', code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
        { id: 'curr-2', code: 'USD', name: 'US Dollar', symbol: '$' },
        { id: 'curr-3', code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
      ],
      categories: [
        { id: 'cat-1', name: 'Beverages', name_ar: 'المشروبات' },
        { id: 'cat-2', name: 'Bakery', name_ar: 'المخبوزات' },
      ],
      brands: [
        { id: 'brand-1', name: 'Lavazza', code: 'LVZ', name_ar: 'لافازا' },
        { id: 'brand-2', name: 'Illy', code: 'ILLY', name_ar: 'إيلي' },
      ],
      customerGroups: [
        { id: 'cg-1', name: 'VIP Gold', discountPercentage: 15 },
        { id: 'cg-2', name: 'Wholesale Tier 1', discountPercentage: 20 },
      ],
      channels: [
        { id: 'ch-1', code: 'POS-01', name: 'Main POS Terminal' },
        { id: 'ch-2', code: 'WEB', name: 'Online Web Store' },
      ],
      stores: [],
      branches: [],
      products: [
        { id: 'prod-1', name: 'Espresso Roast Beans', sku: 'ESP-001' },
      ],
    },
    isLoading: false,
  }),
  useInvPromotion: () => ({
    data: null,
    isLoading: false,
  }),
  useCreatePromotion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdatePromotion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

// Mock currencies hook
vi.mock('@/features/currencies/hooks/use-currencies', () => ({
  useCurrencies: () => ({
    data: [
      { id: 'curr-1', code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', is_active: true },
      { id: 'curr-2', code: 'USD', name: 'US Dollar', symbol: '$', is_active: true },
      { id: 'curr-3', code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', is_active: true },
    ],
    isLoading: false,
  }),
}))

// Mock product options hooks
vi.mock('@/features/products/hooks/use-product-options', () => ({
  useCategoryOptions: () => ({
    data: [
      { id: 'cat-1', name: 'Beverages', name_ar: 'المشروبات', parent_id: null },
      { id: 'cat-2', name: 'Bakery', name_ar: 'المخبوزات', parent_id: null },
    ],
    isLoading: false,
  }),
  useBrandOptions: () => ({
    data: [
      { id: 'brand-1', name: 'Lavazza', code: 'LVZ', name_ar: 'لافازا' },
      { id: 'brand-2', name: 'Illy', code: 'ILLY', name_ar: 'إيلي' },
    ],
    isLoading: false,
  }),
}))

// Mock customer groups hook
vi.mock('@/features/customer-groups/hooks/use-customer-groups', () => ({
  useCustomerGroups: () => ({
    data: [
      { id: 'cg-1', name: 'VIP Gold', discount_percentage: 15, description: 'VIP Tier' },
      { id: 'cg-2', name: 'Wholesale Tier 1', discount_percentage: 20, description: 'B2B' },
    ],
    isLoading: false,
  }),
}))

// Mock channels hook
vi.mock('@/features/channels/hooks/use-channels', () => ({
  useChannels: () => ({
    data: [
      { id: 'ch-1', code: 'POS-01', name: 'Main POS Terminal', is_active: true },
      { id: 'ch-2', code: 'WEB', name: 'Online Web Store', is_active: true },
    ],
    isLoading: false,
  }),
}))

// Mock branches hook
vi.mock('@/features/branches/hooks/use-branches', () => ({
  useBranches: () => ({
    data: [
      {
        id: 'branch-1',
        name: 'Doha Downtown Branch',
        is_active: true,
        cities: { name: 'Doha', countries: { name: 'Qatar' } },
      },
      {
        id: 'branch-2',
        name: 'Lusail Marina Branch',
        is_active: true,
        cities: { name: 'Lusail', countries: { name: 'Qatar' } },
      },
    ],
    isLoading: false,
  }),
}))

// Mock stores hook
vi.mock('@/features/stores/hooks/use-stores', () => ({
  useStores: () => ({
    data: [
      {
        store_id: 'store-1',
        name: 'Downtown Coffee Bar',
        code: 'STR-DOH-01',
        is_active: true,
        branches: { name: 'Doha Downtown Branch' },
        cities: { name: 'Doha' },
      },
      {
        store_id: 'store-2',
        name: 'Marina Gourmet Lounge',
        code: 'STR-LUS-02',
        is_active: true,
        branches: { name: 'Lusail Marina Branch' },
        cities: { name: 'Lusail' },
      },
    ],
    isLoading: false,
  }),
}))

describe('PromotionWizardPage - Calendar, Currency, & Scopes', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  it('renders Step 1 with shadcn Calendar trigger buttons and currency dropdown from Currency model', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <PromotionWizardPage />
      </QueryClientProvider>
    )

    // Check Step 1 title
    expect(screen.getByText('Promotion Details & Identity')).toBeInTheDocument()

    // Check Start Date & End Date labels
    expect(screen.getByText(/Start Date/)).toBeInTheDocument()
    expect(screen.getByText(/End Date/)).toBeInTheDocument()

    // Check Start Date & End Date trigger buttons
    const startDateBtn = document.getElementById('startDate')
    expect(startDateBtn).toBeInTheDocument()

    const endDateBtn = document.getElementById('endDate')
    expect(endDateBtn).toBeInTheDocument()

    // Open start date popover to reveal quick actions
    await user.click(startDateBtn!)
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()

    // Check Currency dropdown label
    expect(screen.getByText('Currency')).toBeInTheDocument()
  })

  it('navigates to Step 3 Eligibility and displays virtual multi-selects for Categories, Brands, Customer Groups, and Sales Channels', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <PromotionWizardPage />
      </QueryClientProvider>
    )

    // Click Step 3: Eligibility
    const step3Button = screen.getByText('Eligibility')
    await user.click(step3Button)

    // Verify Product & Category Scope section
    expect(screen.getByText('Product & Category Scope')).toBeInTheDocument()

    // Switch to "Selected Categories, Brands, or Products"
    const selectedCatalogBtn = screen.getByText('Selected Categories, Brands, or Products')
    await user.click(selectedCatalogBtn)

    // Verify categories, brands, and products multi-selects appear
    expect(screen.getByText('Eligible Categories')).toBeInTheDocument()
    expect(screen.getByText('Eligible Brands')).toBeInTheDocument()
    expect(screen.getByText('Specific Products')).toBeInTheDocument()

    // Verify Branches & Stores Scope section
    expect(screen.getByText('Branches & Stores Scope')).toBeInTheDocument()
    const selectedLocationsBtn = screen.getByText('Selected Locations Only')
    await user.click(selectedLocationsBtn)

    // Verify Branches and Stores selectors and live preview
    expect(screen.getByText('Branches')).toBeInTheDocument()
    expect(screen.getByText('Stores')).toBeInTheDocument()
    expect(screen.getByText('Selected Locations Live Preview')).toBeInTheDocument()

    // Verify Customer Groups & Sales Channels section
    expect(screen.getByText('Customer Groups & Sales Channels')).toBeInTheDocument()
    expect(screen.getByText('Customer Groups')).toBeInTheDocument()
    expect(screen.getByText('Sales Channels')).toBeInTheDocument()
  })
})
