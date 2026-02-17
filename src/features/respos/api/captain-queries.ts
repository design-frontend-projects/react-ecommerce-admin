import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ResOrderItem, ResOrder, ResTable, ResMenuItem } from '../types'

// Type for a ready order item with its relations
export type ReadyOrderItem = ResOrderItem & {
  order: ResOrder & {
    table: ResTable
  }
  menu_item: ResMenuItem
}

export const captainKeys = {
  readyItems: ['respos', 'captain', 'ready-items'] as const,
}

export function useReadyOrderItems() {
  return useQuery({
    queryKey: captainKeys.readyItems,
    queryFn: async () => {
      // Fetch order items that are 'ready'
      // We also need the order details (table, number) and menu item details
      const { data, error } = await supabase
        .from('res_order_items')
        .select(
          '*, order:res_orders(*, table:res_tables(*)), menu_item:res_menu_items(*)'
        )
        .eq('status', 'ready')
        .order('updated_at', { ascending: true }) // Oldest ready items first

      if (error) throw error
      return data as ReadyOrderItem[]
    },
    // Refetch every minute as a fallback
    refetchInterval: 60000,
  })
}

/**
 * Subscribes to realtime changes on `res_order_items`.
 * No row-level filter — catches ALL status transitions:
 *  - kitchen marks item 'ready'  → dashboard adds it
 *  - captain marks item 'served' → dashboard removes it
 *  - new items inserted directly as 'ready'
 *
 * Returns `isConnected` so the UI can show a live indicator.
 */
export function useCaptainRealtime() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  // Debounce rapid-fire events (e.g., bulk "mark all served")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const invalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: captainKeys.readyItems })
    }, 300)
  }, [queryClient])

  useEffect(() => {
    const channel = supabase
      .channel('captain-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'res_order_items',
        },
        (payload) => {
          const newStatus = (payload.new as Record<string, unknown>)?.status
          const oldStatus = (payload.old as Record<string, unknown>)?.status

          // Only invalidate + notify when the status actually changed
          if (newStatus !== oldStatus) {
            invalidate()

            if (newStatus === 'ready') {
              toast.info('🍽️ New item ready!', {
                description: 'A kitchen item is ready for serving.',
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'res_order_items',
        },
        (payload) => {
          const status = (payload.new as Record<string, unknown>)?.status
          if (status === 'ready') {
            invalidate()
            toast.info('🍽️ New ready item!', {
              description: 'A new item was added as ready.',
            })
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [invalidate])

  return { isConnected }
}

export function useMarkItemsServed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      const { data, error } = await supabase
        .from('res_order_items')
        .update({ status: 'served', updated_at: new Date().toISOString() })
        .in('id', itemIds)
        .select()

      if (error) throw error
      return data
    },
    // Optimistic update — remove served items from the cache instantly
    onMutate: async (itemIds: string[]) => {
      // Cancel in-flight fetches so they don't overwrite our optimistic data
      await queryClient.cancelQueries({ queryKey: captainKeys.readyItems })

      // Snapshot current cache for rollback
      const previousItems = queryClient.getQueryData<ReadyOrderItem[]>(
        captainKeys.readyItems
      )

      // Optimistically remove the served items
      queryClient.setQueryData<ReadyOrderItem[]>(
        captainKeys.readyItems,
        (old) => (old ? old.filter((item) => !itemIds.includes(item.id)) : [])
      )

      return { previousItems }
    },
    onSuccess: (_data, itemIds) => {
      toast.success(
        `${itemIds.length} item${itemIds.length > 1 ? 's' : ''} marked as served`
      )
    },
    onError: (error, _itemIds, context) => {
      // Rollback to previous state
      if (context?.previousItems) {
        queryClient.setQueryData(captainKeys.readyItems, context.previousItems)
      }
      toast.error('Failed to update items: ' + error.message)
    },
    onSettled: () => {
      // Always refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: captainKeys.readyItems })
    },
  })
}
