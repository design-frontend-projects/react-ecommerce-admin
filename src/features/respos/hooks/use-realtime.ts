// Supabase Realtime Hook for ResPOS
// Subscribes to table changes for real-time updates
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { resposQueryKeys } from '../api/queries'

type RealtimeTable =
  | 'res_tables'
  | 'res_orders'
  | 'res_order_items'
  | 'res_notifications'
  | 'res_void_requests'

interface UseRealtimeOptions {
  tables?: RealtimeTable[]
  employeeId?: string
  onTableChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void
  onOrderChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void
  onNotification?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void
}

export function useResposRealtime(options: UseRealtimeOptions = {}) {
  const queryClient = useQueryClient()
  const {
    tables = [
      'res_tables',
      'res_orders',
      'res_order_items',
      'res_notifications',
      'res_void_requests',
    ],
    employeeId,
    onTableChange,
    onOrderChange,
    onNotification,
  } = options

  // Extract to variable for dependency array
  const tablesKey = tables.join(',')

  useEffect(() => {
    const channelName = `respos-realtime-${Date.now()}`

    const channel = supabase.channel(channelName)

    // Subscribe to table changes
    if (tables.includes('res_tables')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'res_tables',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.tables() })
          queryClient.invalidateQueries({
            queryKey: resposQueryKeys.dashboardStats,
          })
          onTableChange?.(payload)
        }
      )
    }

    // Subscribe to order changes
    if (tables.includes('res_orders')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'res_orders',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
          queryClient.invalidateQueries({
            queryKey: resposQueryKeys.dashboardStats,
          })
          onOrderChange?.(payload)
        }
      )
    }

    // Subscribe to order item changes
    if (tables.includes('res_order_items')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'res_order_items',
        },
        (payload) => {
          // Get the order_id from the payload if available
          const orderId = (payload.new as { order_id?: string })?.order_id
          if (orderId) {
            queryClient.invalidateQueries({
              queryKey: resposQueryKeys.order(orderId),
            })
          }
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
        }
      )
    }

    // Subscribe to notifications (filtered by employee)
    if (tables.includes('res_notifications') && employeeId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'res_notifications',
          filter: `recipient_id=eq.${employeeId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({
            queryKey: resposQueryKeys.notifications(employeeId),
          })
          queryClient.invalidateQueries({
            queryKey: resposQueryKeys.unreadNotifications(employeeId),
          })
          onNotification?.(payload)
        }
      )
    }

    // Subscribe to void request changes
    if (tables.includes('res_void_requests')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'res_void_requests',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: resposQueryKeys.voidRequests(),
          })
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queryClient,
    tablesKey,
    employeeId,
    onTableChange,
    onOrderChange,
    onNotification,
  ])
}

// Specific hook for kitchen display
export function useKitchenRealtime(onNewOrder?: () => void) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'res_orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'res_order_items',
        },
        () => {
          onNewOrder?.()
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'res_order_items',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: resposQueryKeys.orders() })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, onNewOrder])
}
