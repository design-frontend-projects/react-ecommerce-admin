import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PromotionDetailPage } from '@/features/promotions/pages/promotion-detail-page'

const mockNavigate = vi.fn().mockResolvedValue(true)

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ promotionId: 'promo-usd-123' }),
  useSearch: () => ({}),
  Link: ({ children, ...props }: { children?: React.ReactNode }) => <a {...props}>{children}</a>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | { defaultValue?: string; [key: string]: unknown }) => {
      if (typeof defaultVal === 'string') return defaultVal
      if (typeof defaultVal === 'object' && defaultVal?.defaultValue) return defaultVal.defaultValue
      return key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/components/layout/header', () => ({
  Header: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}))

vi.mock('@/components/layout/main', () => ({
  Main: ({ children }: { children?: React.ReactNode }) => <main>{children}</main>,
}))

vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))

vi.mock('@/components/language-switch', () => ({
  LanguageSwitch: () => <div>Lang</div>,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockMutateStatus = vi.fn().mockResolvedValue({ success: true })
const mockPromoUSD = {
  id: 'promo-usd-123',
  name: 'Summer USD Super Deal',
  code: 'SUMMER_USD',
  description: 'Global 20% discount in USD',
  status: 'active',
  promo_type: 'percentage',
  start_date: new Date('2026-06-01T00:00:00.000Z'),
  end_date: new Date('2026-08-31T23:59:59.000Z'),
  currency_id: 'curr-usd-uuid',
  currency_code: 'USD',
  currencyCode: 'USD',
  currencies: { id: 'curr-usd-uuid', code: 'USD', name: 'US Dollar', symbol: '$' },
  min_order_amount: 50,
  max_discount_amount: 150,
  current_usage_count: 12,
  usage_limit: 100,
  usage_per_customer: 2,
  current_discount_amount: 450,
  allow_stacking: false,
  requires_coupon: false,
  rules: [
    {
      id: 'rule-1',
      action_type: 'percentage_discount',
      rule_type: 'percentage_discount',
      discount_value: 20,
      apply_to: 'matching_items',
    },
  ],
  conditions: [],
  products: [],
  categories: [],
  brands: [],
  customer_groups: [],
  channels: [],
  stores: [],
  branches: [],
  coupons: [],
  usage_logs: [],
}

vi.mock('@/features/promotions/hooks/use-inv-promotions', () => ({
  useInvPromotion: () => ({
    data: mockPromoUSD,
    isLoading: false,
    error: null,
  }),
  useChangePromotionStatus: () => ({
    mutateAsync: mockMutateStatus,
    isPending: false,
  }),
  useDuplicatePromotion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeletePromotion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('Promotion Overview Screen Enhancements', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  it('renders Discount Distributed card using the promotion created currency (USD)', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PromotionDetailPage />
      </QueryClientProvider>
    )

    // Check header
    expect(screen.getByText('Summer USD Super Deal')).toBeInTheDocument()

    // Discount Distributed should display "450 USD"
    expect(screen.getByText(/450 USD/i)).toBeInTheDocument()
    // Cap text should also use USD
    expect(screen.getByText(/Cap: 150 USD/i)).toBeInTheDocument()
  })

  it('navigates to the edit wizard for the selected promotion when Edit button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <PromotionDetailPage />
      </QueryClientProvider>
    )

    const editBtn = screen.getByRole('button', { name: /edit/i })
    expect(editBtn).toBeInTheDocument()

    await user.click(editBtn)

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/promotions/$promotionId/edit',
        params: { promotionId: 'promo-usd-123' },
      })
    )
  })

  it('invokes changeStatusMutation to pause or activate promotion in real-time', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <PromotionDetailPage />
      </QueryClientProvider>
    )

    // Currently active, so button says Pause
    const pauseBtn = screen.getByRole('button', { name: /pause/i })
    expect(pauseBtn).toBeInTheDocument()

    await user.click(pauseBtn)

    expect(mockMutateStatus).toHaveBeenCalledWith({
      id: 'promo-usd-123',
      status: 'paused',
    })
  })
})
