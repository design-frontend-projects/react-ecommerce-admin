import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type ReorderRequestStatus = 'pending' | 'read'

export interface PosReorderRequest {
  id: string
  clerk_user_id: string
  product_id: number
  product_variant_id: string | null
  requested_by_clerk_user_id: string
  requested_by_name: string
  requested_by_role: string | null
  requested_quantity: number | null
  requested_min_stock: number | null
  status: ReorderRequestStatus
  read_by_clerk_user_id: string | null
  read_at: string | null
  created_at: string
  updated_at: string
  products?: {
    name: string
  } | null
  product_variants?: {
    sku: string
    dimensions?: string | null
  } | null
}

export interface CreatePosReorderRequestInput {
  product_id: number
  product_variant_id?: string | null
  requested_by_clerk_user_id: string
  requested_by_name: string
  requested_by_role?: string | null
  requested_quantity?: number | null
  requested_min_stock?: number | null
}

export interface MarkPosReorderRequestReadInput {
  requestId: string
  readByClerkUserId: string
}

export const posReorderRequestKeys = {
  all: ['pos-reorder-requests'] as const,
  pendingList: ['pos-reorder-requests', 'pending-list'] as const,
  pendingCount: ['pos-reorder-requests', 'pending-count'] as const,
}

function buildDuplicateCheckQuery(input: CreatePosReorderRequestInput) {
  const query = supabase
    .from('pos_reorder_requests')
    .select('id')
    .eq('status', 'pending')
    .eq('requested_by_clerk_user_id', input.requested_by_clerk_user_id)
    .eq('product_id', input.product_id)
    .limit(1)

  if (input.product_variant_id) {
    return query.eq('product_variant_id', input.product_variant_id)
  }

  return query.is('product_variant_id', null)
}

export function useAdminPendingReorderRequests(enabled = true) {
  return useQuery({
    queryKey: posReorderRequestKeys.pendingList,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_reorder_requests')
        .select(
          `
          id,
          clerk_user_id,
          product_id,
          product_variant_id,
          requested_by_clerk_user_id,
          requested_by_name,
          requested_by_role,
          requested_quantity,
          requested_min_stock,
          status,
          read_by_clerk_user_id,
          read_at,
          created_at,
          updated_at,
          products(name),
          product_variants(sku, dimensions)
        `
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data ?? []) as PosReorderRequest[]
    },
    enabled,
  })
}

export function useAdminPendingReorderCount(enabled = true) {
  return useQuery({
    queryKey: posReorderRequestKeys.pendingCount,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pos_reorder_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) throw error
      return count ?? 0
    },
    enabled,
  })
}

export function useCreatePosReorderRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePosReorderRequestInput) => {
      const { data: existingRows, error: existingError } =
        await buildDuplicateCheckQuery(input)

      if (existingError) throw existingError

      if (existingRows && existingRows.length > 0) {
        return {
          duplicate: true,
          requestId: existingRows[0].id as string,
        }
      }

      const { data, error } = await supabase
        .from('pos_reorder_requests')
        .insert({
          product_id: input.product_id,
          product_variant_id: input.product_variant_id ?? null,
          requested_by_clerk_user_id: input.requested_by_clerk_user_id,
          requested_by_name: input.requested_by_name,
          requested_by_role: input.requested_by_role ?? null,
          requested_quantity: input.requested_quantity ?? null,
          requested_min_stock: input.requested_min_stock ?? null,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw error

      return {
        duplicate: false,
        requestId: data.id as string,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posReorderRequestKeys.all })
    },
  })
}

export function useMarkPosReorderRequestRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, readByClerkUserId }: MarkPosReorderRequestReadInput) => {
      const { error } = await supabase
        .from('pos_reorder_requests')
        .update({
          status: 'read',
          read_by_clerk_user_id: readByClerkUserId,
          read_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posReorderRequestKeys.all })
    },
  })
}

interface UsePosReorderRealtimeOptions {
  enabled?: boolean
  employeeClerkUserId?: string
  onEmployeeRequestRead?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => void
}

export function usePosReorderRealtime({
  enabled = true,
  employeeClerkUserId,
  onEmployeeRequestRead,
}: UsePosReorderRealtimeOptions = {}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const channel = supabase.channel(`pos-reorder-requests-${Date.now()}`)

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pos_reorder_requests',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: posReorderRequestKeys.all })
      }
    )

    if (employeeClerkUserId) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pos_reorder_requests',
          filter: `requested_by_clerk_user_id=eq.${employeeClerkUserId}`,
        },
        (payload) => {
          onEmployeeRequestRead?.(payload)
        }
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, enabled, employeeClerkUserId, onEmployeeRequestRead])
}

