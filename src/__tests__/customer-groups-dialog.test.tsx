import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CustomerGroupsProvider, {
  useCustomerGroupsContext,
} from '@/features/customer-groups/components/customer-groups-provider'
import { CustomerGroupsActionDialog } from '@/features/customer-groups/components/customer-groups-action-dialog'

const mockCreateMutateAsync = vi.fn().mockResolvedValue({ id: 'new-1' })
const mockUpdateMutateAsync = vi.fn().mockResolvedValue({ id: 'edit-1' })

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock(
  '@/features/customer-groups/hooks/use-customer-groups',
  () => ({
    useCreateCustomerGroup: () => ({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    }),
    useUpdateCustomerGroup: () => ({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    }),
  })
)

function TestHarness() {
  const { setOpen, setCurrentRow } = useCustomerGroupsContext()

  return (
    <div>
      <button
        onClick={() => {
          setCurrentRow(null)
          setOpen('create')
        }}
      >
        Open Create
      </button>
      <button
        onClick={() => {
          setCurrentRow({
            id: 'edit-1',
            name: 'Existing VIP',
            description: 'Old description',
            minimum_order_amount: 100,
            discount_percentage: 10,
            created_at: new Date().toISOString(),
          })
          setOpen('edit')
        }}
      >
        Open Edit
      </button>
      <CustomerGroupsActionDialog />
    </div>
  )
}

describe('CustomerGroupsActionDialog Clear & Reset', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('clears form fields and closes modal after successful creation', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CustomerGroupsProvider>
          <TestHarness />
        </CustomerGroupsProvider>
      </QueryClientProvider>
    )

    // Open create dialog
    await user.click(screen.getByText('Open Create'))
    expect(screen.getByText('customerGroups.createGroup')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText(
      'customerGroups.form.placeholderName'
    )
    await user.type(nameInput, 'Wholesale Clients')

    const saveButton = screen.getByRole('button', {
      name: 'customerGroups.form.save',
    })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wholesale Clients',
        })
      )
    })

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('customerGroups.createGroup')).not.toBeInTheDocument()
    })

    // Re-open create dialog; should be completely clean
    await user.click(screen.getByText('Open Create'))
    const reopenedInput = screen.getByPlaceholderText(
      'customerGroups.form.placeholderName'
    ) as HTMLInputElement

    expect(reopenedInput.value).toBe('')
  })

  it('resets form when switching from edit to create', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CustomerGroupsProvider>
          <TestHarness />
        </CustomerGroupsProvider>
      </QueryClientProvider>
    )

    // Open edit dialog
    await user.click(screen.getByText('Open Edit'))
    expect(screen.getByText('customerGroups.editGroup')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText(
      'customerGroups.form.placeholderName'
    ) as HTMLInputElement
    expect(nameInput.value).toBe('Existing VIP')

    // Cancel edit
    const cancelButton = screen.getByRole('button', {
      name: 'customerGroups.form.cancel',
    })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('customerGroups.editGroup')).not.toBeInTheDocument()
    })

    // Open create dialog; fields should be completely clean
    await user.click(screen.getByText('Open Create'))
    const createNameInput = screen.getByPlaceholderText(
      'customerGroups.form.placeholderName'
    ) as HTMLInputElement
    expect(createNameInput.value).toBe('')
  })
})
