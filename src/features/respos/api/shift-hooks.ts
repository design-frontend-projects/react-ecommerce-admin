// Shift management TanStack Query hooks (specs/026) — server-backed reads and
// writes against /api/respos/shifts/*. Own-shift reads (useActiveShift /
// useShifts in queries.ts) stay on the direct-supabase path.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  addCashMovementRequest,
  closeShiftRequest,
  correctShiftRequest,
  fetchActiveShifts,
  fetchAllShifts,
  fetchCashMovements,
  fetchExpectedCash,
  fetchShiftAnalytics,
  fetchShiftAudit,
  fetchShiftSettings,
  forceCloseShiftRequest,
  openShiftRequest,
  reviewShiftRequest,
  updateShiftSettingsRequest,
  type ShiftAnalyticsMetric,
  type ShiftAnalyticsRange,
} from '../data/shift-actions'
import type {
  AddCashMovementInput,
  CloseShiftInput,
  CorrectShiftInput,
  ForceCloseShiftInput,
  ListShiftsQuery,
  OpenShiftInput,
  UpdateShiftSettingsInput,
} from '../data/shift-schemas'
import { resposQueryKeys } from './queries'

function useInvalidateShiftQueries() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['respos', 'shifts'] })
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useAllShifts(query: Partial<ListShiftsQuery> = {}) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.allShifts(query),
    queryFn: () => fetchAllShifts(getToken, query),
    enabled: isLoaded && isSignedIn,
  })
}

export function useActiveShiftsAll(branchId?: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.activeShiftsAll(branchId),
    queryFn: () => fetchActiveShifts(getToken, branchId),
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60_000,
  })
}

export function useShiftAudit(shiftId?: string) {
  const { getToken } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.shiftAudit(shiftId ?? ''),
    queryFn: () => fetchShiftAudit(getToken, shiftId as string),
    enabled: !!shiftId,
  })
}

export function useShiftExpected(shiftId?: string | null) {
  const { getToken } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.shiftExpected(shiftId ?? ''),
    queryFn: () => fetchExpectedCash(getToken, shiftId as string),
    enabled: !!shiftId,
  })
}

export function useShiftMovements(shiftId?: string | null) {
  const { getToken } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.shiftMovements(shiftId ?? ''),
    queryFn: () => fetchCashMovements(getToken, shiftId as string),
    enabled: !!shiftId,
  })
}

export function useShiftSettings(
  restaurantId?: string | null,
  branchId?: string | null,
  options: { enabled?: boolean } = {}
) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.shiftSettings(restaurantId, branchId),
    queryFn: () => fetchShiftSettings(getToken, restaurantId, branchId),
    enabled: isLoaded && isSignedIn && (options.enabled ?? true),
    staleTime: 60_000,
  })
}

export function useShiftAnalytics<T>(
  metric: ShiftAnalyticsMetric,
  range: ShiftAnalyticsRange,
  branchId?: string
) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: resposQueryKeys.shiftAnalytics(metric, range, branchId),
    queryFn: () => fetchShiftAnalytics<T>(getToken, metric, range, branchId),
    enabled: isLoaded && isSignedIn,
    refetchInterval: 60_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useOpenShiftServer() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (input: OpenShiftInput) => openShiftRequest(getToken, input),
    onSuccess: invalidate,
  })
}

export function useCloseShiftServer() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (input: CloseShiftInput) => closeShiftRequest(getToken, input),
    onSuccess: invalidate,
  })
}

export function useForceCloseShift() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (input: ForceCloseShiftInput) =>
      forceCloseShiftRequest(getToken, input),
    onSuccess: invalidate,
  })
}

export function useCorrectShift() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (input: CorrectShiftInput) =>
      correctShiftRequest(getToken, input),
    onSuccess: invalidate,
  })
}

export function useReviewShift() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (shiftId: string) => reviewShiftRequest(getToken, { shiftId }),
    onSuccess: invalidate,
  })
}

export function useAddCashMovement() {
  const { getToken } = useAuth()
  const invalidate = useInvalidateShiftQueries()

  return useMutation({
    mutationFn: (input: AddCashMovementInput) =>
      addCashMovementRequest(getToken, input),
    onSuccess: invalidate,
  })
}

export function useUpdateShiftSettings() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateShiftSettingsInput) =>
      updateShiftSettingsRequest(getToken, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['respos', 'shifts', 'settings'],
      })
    },
  })
}
