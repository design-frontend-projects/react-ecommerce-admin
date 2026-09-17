import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posApi } from '../services/pos-client'

export const POS_QUERY_KEYS = {
  terminals: (storeId?: string) => ['pos', 'terminals', { storeId }] as const,
  terminalStatus: (terminalId?: string) => ['pos', 'terminal-status', terminalId] as const,
  terminalUsers: (params?: { terminalId?: string; status?: string }) =>
    ['pos', 'terminal-users', params] as const,
  sessionSummary: (sessionId?: string) => ['pos', 'session-summary', sessionId] as const,
  sessionsList: (params?: any) => ['pos', 'sessions', params] as const,
  products: (params?: any) => ['pos', 'products', params] as const,
  heldOrders: (params?: any) => ['pos', 'held-orders', params] as const,
  orderLookup: (orderRef?: string) => ['pos', 'order-lookup', orderRef] as const,
}

// ─── Terminals ──────────────────────────────────────────────────────────────

export function usePosTerminals(storeId?: string) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.terminals(storeId),
    queryFn: () => posApi.listTerminals(storeId),
  })
}

export function usePosTerminalStatus(terminalId?: string) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.terminalStatus(terminalId),
    queryFn: () => (terminalId ? posApi.getTerminalStatus(terminalId) : null),
    enabled: Boolean(terminalId),
    refetchInterval: 30000,
  })
}

export function useCreateTerminalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.createTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

export function useUpdateTerminalMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.updateTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

// ─── Terminal Users ─────────────────────────────────────────────────────────

export function usePosTerminalUsers(params?: { terminalId?: string; status?: string }) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.terminalUsers(params),
    queryFn: () => posApi.listTerminalUsers(params),
  })
}

export function useAssignTerminalUsersMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.assignTerminalUsers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-users'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

export function useToggleTerminalUserStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      posApi.toggleTerminalUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-users'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

export function useRemoveTerminalUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => posApi.removeTerminalUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-users'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

export function useBatchRemoveTerminalUsersMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => posApi.batchRemoveTerminalUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-users'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminals'] })
    },
  })
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function usePosSessionSummary(sessionId?: string) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.sessionSummary(sessionId),
    queryFn: () => (sessionId ? posApi.getSessionSummary(sessionId) : null),
    enabled: Boolean(sessionId),
  })
}

export function usePosSessionsList(params?: {
  terminalId?: string
  status?: 'open' | 'closed' | 'suspended'
  cashierId?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.sessionsList(params),
    queryFn: () => posApi.listSessions(params),
  })
}

export function useOpenSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.openSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-status', variables.terminalId] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sessions'] })
    },
  })
}

export function useCloseSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.closeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-status'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'session-summary'] })
    },
  })
}

export function useCashMovementMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.addCashMovement,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.sessionSummary(variables.sessionId) })
    },
  })
}

// ─── Products Catalog ───────────────────────────────────────────────────────

export function usePosProductsQuery(params: {
  q?: string
  categoryId?: string
  brandId?: string
  warehouseId?: string
  storeId?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.products(params),
    queryFn: () => posApi.searchProducts(params),
  })
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export function usePosCheckoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.checkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-status'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sessions'] })
    },
  })
}

// ─── Returns ────────────────────────────────────────────────────────────────

export function useOrderLookupQuery(orderRef?: string) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.orderLookup(orderRef),
    queryFn: () => (orderRef ? posApi.lookupOrderForReturn(orderRef) : null),
    enabled: Boolean(orderRef && orderRef.trim().length > 0),
  })
}

export function useProcessReturnMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.processReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'terminal-status'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['pos', 'sessions'] })
    },
  })
}

// ─── Held Orders ────────────────────────────────────────────────────────────

export function useHeldOrdersQuery(params?: { sessionId?: string; terminalId?: string }) {
  return useQuery({
    queryKey: POS_QUERY_KEYS.heldOrders(params),
    queryFn: () => posApi.listHeldOrders(params),
  })
}

export function useHoldOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.holdOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'held-orders'] })
    },
  })
}

export function useResumeHeldOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.resumeHeldOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'held-orders'] })
    },
  })
}

export function useCancelHeldOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: posApi.cancelHeldOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'held-orders'] })
    },
  })
}
