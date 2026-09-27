import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationBell } from '../features/notifications/components/notification-bell'

const mockMarkAsRead = vi.fn().mockResolvedValue({})
const mockMarkAllAsRead = vi.fn().mockResolvedValue({})

const sampleNotifications = [
  {
    id: 'user-notif-1',
    notification_id: 'notif-1',
    tenant_id: 'tenant-1',
    is_read: false,
    delivery_status: 'delivered',
    created_at: '2026-09-27T10:00:00Z',
    notifications: {
      id: 'notif-1',
      tenant_id: 'tenant-1',
      title: 'PO Received',
      message: 'Purchase order PO-001 has been received at Cairo Hub.',
      severity: 'SUCCESS',
      type: 'system',
      target_type: 'ROLE',
      action_url: '/purchases/orders/PO-001',
      action_label: 'View PO',
      is_active: true,
      is_archived: false,
      created_at: '2026-09-27T10:00:00Z',
      updated_at: '2026-09-27T10:00:00Z',
    },
  },
  {
    id: 'user-notif-2',
    notification_id: 'notif-2',
    tenant_id: 'tenant-1',
    is_read: true,
    delivery_status: 'delivered',
    created_at: '2026-09-27T08:00:00Z',
    notifications: {
      id: 'notif-2',
      tenant_id: 'tenant-1',
      title: 'Low Stock Alert',
      message: 'Item ESP-01 stock fell below minimum safety stock.',
      severity: 'WARNING',
      type: 'alert',
      target_type: 'ALL',
      action_url: null,
      action_label: null,
      is_active: true,
      is_archived: false,
      created_at: '2026-09-27T08:00:00Z',
      updated_at: '2026-09-27T08:00:00Z',
    },
  },
]

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    has: () => true,
    user: { id: 'user-1' },
    isSignedIn: true,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../features/notifications/hooks/use-notifications', () => ({
  useUserNotifications: () => ({
    notifications: sampleNotifications,
    unreadCount: 1,
    isLoading: false,
    markAsRead: mockMarkAsRead,
    isMarkingRead: false,
    markAllAsRead: mockMarkAllAsRead,
    isMarkingAllRead: false,
    isConnected: true,
    transport: 'websocket',
  }),
}))

describe('NotificationBell UI Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the bell icon and unread count badge', () => {
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    expect(bellBtn).toBeInTheDocument()

    // Unread count '1' badge
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('opens notification popover when bell button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    await user.click(bellBtn)

    // Header title and live indicator
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText(/Unread \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()

    // Both notification titles are rendered
    expect(screen.getByText('PO Received')).toBeInTheDocument()
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument()
  })

  it('filters notifications by unread tab', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    await user.click(bellBtn)

    // Click Unread tab
    const unreadTab = screen.getByRole('tab', { name: /Unread \(1\)/i })
    await user.click(unreadTab)

    // Unread item should be visible
    expect(screen.getByText('PO Received')).toBeInTheDocument()

    // Read item should not be visible in unread tab
    expect(screen.queryByText('Low Stock Alert')).not.toBeInTheDocument()
  })

  it('calls markAsRead when individual Mark read button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    await user.click(bellBtn)

    const markReadBtn = screen.getByRole('button', { name: /Mark read/i })
    await user.click(markReadBtn)

    expect(mockMarkAsRead).toHaveBeenCalledWith('user-notif-1')
  })

  it('calls markAllAsRead when Mark all as read button is clicked', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    await user.click(bellBtn)

    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i })
    await user.click(markAllBtn)

    expect(mockMarkAllAsRead).toHaveBeenCalled()
  })

  it('renders action link when action_url is present', async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    await user.click(bellBtn)

    const actionLink = screen.getByText('View PO')
    expect(actionLink).toBeInTheDocument()
    expect(actionLink.closest('a')).toHaveAttribute('href', '/purchases/orders/PO-001')
  })
})
