import { useEffect } from 'react'
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

export function useCaptainRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('captain-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'res_order_items',
          filter: 'status=eq.ready',
        },
        (_payload) => {
          // When an item becomes ready, invalidate the query
          queryClient.invalidateQueries({ queryKey: captainKeys.readyItems })

          // Optionally show a toast here or let the UI handle it via data changes
          toast.info('New item ready!', {
            description: 'Check the dashboard for details.',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: captainKeys.readyItems })
      toast.success('Items marked as served')
    },
    onError: (error) => {
      toast.error('Failed to update items: ' + error.message)
    },
  })
}
