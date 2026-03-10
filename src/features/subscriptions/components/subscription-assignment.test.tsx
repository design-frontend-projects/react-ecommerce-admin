import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { SubscriptionAssignment } from '../components/subscription-assignment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the queries
vi.mock('../queries', () => ({
  useSubscriptionPlans: () => ({
    data: [
      { id: 1, name: '1 Month', duration_months: 1, price: 10 },
      { id: 2, name: '12 Months', duration_months: 12, price: 100 },
    ],
  }),
  useAssignSubscription: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

vi.mock('../data/users_query', () => ({
  useSearchClerkUsers: () => ({
    data: [
      { clerk_user_id: 'user_1', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
    ],
    isLoading: false,
  }),
}));

const queryClient = new QueryClient();

describe('SubscriptionAssignment Component', () => {
  test('renders the assign button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionAssignment />
      </QueryClientProvider>
    );
    expect(screen.getByText('Assign Subscription')).toBeInTheDocument();
  });

  test('opens dialog and shows search input', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionAssignment />
      </QueryClientProvider>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /assign subscription/i }));
    
    expect(screen.getByRole('heading', { name: /assign subscription/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});
