import { supabase } from '@/lib/supabase'

export interface PosApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code?: string
    message: string
    details?: any
  }
}

async function getAuthHeader(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch {
    // Continue with default headers if session fetch fails
  }

  return headers
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeader()
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  })

  const json = (await res.json().catch(() => ({}))) as PosApiResponse<T>

  if (!res.ok || !json.success) {
    const errorMsg =
      json.error?.message ||
      (typeof json.error === 'string' ? json.error : `Request failed with status ${res.status}`)
    throw new Error(errorMsg)
  }

  return json.data as T
}

// ─── Terminals ──────────────────────────────────────────────────────────────

export interface TerminalListItem {
  id: string
  name: string
  code: string
  storeId?: string | null
  branchId?: string | null
  warehouseId?: string | null
  defaultPriceListId?: string | null
  status: string
  hasActiveSession: boolean
  activeSessionCashier?: string | null
  assignedCashiers: string[]
}

export interface TerminalUserAssignment {
  id: string
  terminalId: string
  terminalName: string
  terminalCode: string
  terminalStatus: string
  storeId?: string | null
  userId: string
  userName: string
  userEmail: string
  userPhone: string
  userRole: string
  avatarUrl: string | null
  userIsActive: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TerminalUsersData {
  assignments: TerminalUserAssignment[]
  terminals: {
    id: string
    name: string
    code: string
    status: string
    store_id?: string | null
  }[]
  users: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }[]
}

export const posApi = {
  // Terminals
  listTerminals: (storeId?: string) => {
    const params = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
    return apiRequest<TerminalListItem[]>(`/api/pos/terminals${params}`)
  },

  createTerminal: (data: {
    name: string
    code: string
    storeId?: string
    branchId?: string
    warehouseId?: string
    defaultPriceListId?: string
    deviceIdentifier?: string
  }) => {
    return apiRequest<any>('/api/pos/terminals', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...data }),
    })
  },

  updateTerminal: (data: {
    terminalId: string
    name?: string
    code?: string
    status?: string
    warehouseId?: string
    defaultPriceListId?: string
  }) => {
    return apiRequest<any>('/api/pos/terminals', {
      method: 'POST',
      body: JSON.stringify({ action: 'update', ...data }),
    })
  },

  assignCashiers: (terminalId: string, userIds: string[]) => {
    return apiRequest<any>('/api/pos/terminals', {
      method: 'POST',
      body: JSON.stringify({
        action: 'assign-cashiers',
        terminalId,
        userIds,
      }),
    })
  },

  // Terminal Users
  listTerminalUsers: (params?: { terminalId?: string; status?: string }) => {
    const query = new URLSearchParams()
    if (params?.terminalId) query.set('terminalId', params.terminalId)
    if (params?.status) query.set('status', params.status)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest<TerminalUsersData>(`/api/pos/terminal-users${qs}`)
  },

  assignTerminalUsers: (data: {
    terminalId: string
    userIds: string[]
    isActive?: boolean
  }) => {
    return apiRequest<any>('/api/pos/terminal-users', {
      method: 'POST',
      body: JSON.stringify({ action: 'assign', ...data }),
    })
  },

  toggleTerminalUserStatus: (id: string, isActive: boolean) => {
    return apiRequest<any>('/api/pos/terminal-users', {
      method: 'POST',
      body: JSON.stringify({ action: 'toggle-status', id, isActive }),
    })
  },

  removeTerminalUser: (id: string) => {
    return apiRequest<any>('/api/pos/terminal-users', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove', id }),
    })
  },

  batchRemoveTerminalUsers: (ids: string[]) => {
    return apiRequest<any>('/api/pos/terminal-users', {
      method: 'POST',
      body: JSON.stringify({ action: 'batch-remove', ids }),
    })
  },

  // Sessions
  getTerminalStatus: (terminalId: string) => {
    return apiRequest<{
      terminal: any
      activeSession: any
      todaySummary: {
        totalSales: number
        salesCount: number
        refundCount: number
      }
    }>(`/api/pos/sessions?action=terminal-status&terminalId=${encodeURIComponent(terminalId)}`)
  },

  getSessionSummary: (sessionId: string) => {
    return apiRequest<any>(
      `/api/pos/sessions?action=summary&sessionId=${encodeURIComponent(sessionId)}`
    )
  },

  listSessions: (params?: {
    terminalId?: string
    status?: 'open' | 'closed' | 'suspended'
    cashierId?: string
    page?: number
    pageSize?: number
  }) => {
    const search = new URLSearchParams()
    if (params?.terminalId) search.set('terminalId', params.terminalId)
    if (params?.status) search.set('status', params.status)
    if (params?.cashierId) search.set('cashierId', params.cashierId)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))

    return apiRequest<{
      sessions: any[]
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }>(`/api/pos/sessions?${search.toString()}`)
  },

  openSession: (data: {
    terminalId: string
    openingCash: number | string
    notes?: string
  }) => {
    return apiRequest<any>('/api/pos/sessions', {
      method: 'POST',
      body: JSON.stringify({ action: 'open', ...data }),
    })
  },

  closeSession: (data: {
    sessionId: string
    actualCash: number | string
    notes?: string
  }) => {
    return apiRequest<any>('/api/pos/sessions', {
      method: 'POST',
      body: JSON.stringify({ action: 'close', ...data }),
    })
  },

  addCashMovement: (data: {
    sessionId: string
    type: 'in' | 'out'
    reason:
      | 'opening'
      | 'closing'
      | 'sale'
      | 'purchase_refund'
      | 'customer_refund'
      | 'supplier_payment'
      | 'customer_payment'
      | 'expense'
      | 'income'
      | 'payout'
      | 'adjustment'
    amount: number | string
    notes?: string
    referenceType?: string
    referenceId?: string
  }) => {
    return apiRequest<any>('/api/pos/sessions', {
      method: 'POST',
      body: JSON.stringify({ action: 'cash-movement', ...data }),
    })
  },

  // Products
  searchProducts: (params?: {
    q?: string
    categoryId?: string
    brandId?: string
    warehouseId?: string
    storeId?: string
    page?: number
    pageSize?: number
  }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.categoryId) search.set('categoryId', params.categoryId)
    if (params?.brandId) search.set('brandId', params.brandId)
    if (params?.warehouseId) search.set('warehouseId', params.warehouseId)
    if (params?.storeId) search.set('storeId', params.storeId)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))

    return apiRequest<{
      items: Array<{
        productId: string
        productVariantId: string
        productName: string
        variantName?: string | null
        sku: string
        barcode?: string | null
        basePrice: string
        costPrice: string
        categoryId?: string | null
        categoryName?: string | null
        brandName?: string | null
        imageUrl?: string | null
        taxRateId?: string | null
        taxRate: string
        taxInclusive: boolean
        stockAvailable: string
        stockOnHand: string
        variantAttributes?: any
      }>
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }>(`/api/pos/products?${search.toString()}`)
  },

  // Checkout
  checkout: (payload: {
    terminalId: string
    sessionId: string
    warehouseId: string
    storeId?: string
    branchId?: string
    customerId?: string | null
    priceListId?: string | null
    items: Array<{
      productVariantId: string
      sku?: string
      productName?: string
      variantName?: string
      quantity: number | string
      unitPrice: number | string
      unitCost?: number | string
      discountAmount?: number | string
      taxAmount?: number | string
      taxRateId?: string | null
      batchId?: string | null
    }>
    payments: Array<{
      method: 'cash' | 'card' | 'bank_transfer' | 'wallet' | 'cheque' | 'mixed'
      amount: number | string
      referenceNumber?: string
      notes?: string
    }>
    orderDiscountAmount?: number | string
    notes?: string
    idempotencyKey?: string
  }) => {
    return apiRequest<{
      orderId: string
      orderNumber: string
      invoiceId: string
      invoiceNumber: string
      receipt: any
      inventoryTransactionId: string
      isDuplicate?: boolean
    }>('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Returns
  lookupOrderForReturn: (orderRef: string) => {
    return apiRequest<any>(
      `/api/pos/returns?orderRef=${encodeURIComponent(orderRef)}`
    )
  },

  processReturn: (payload: {
    originalOrderId: string
    sessionId: string
    terminalId: string
    warehouseId: string
    items: Array<{
      salesOrderItemId?: string
      productVariantId: string
      quantity: number | string
      unitPrice: number | string
      reason?: string
      restockToWarehouseId?: string
    }>
    refundMethod: 'cash' | 'card' | 'bank_transfer' | 'wallet' | 'cheque' | 'mixed'
    refundAmount?: number | string
    notes?: string
  }) => {
    return apiRequest<any>('/api/pos/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Held Orders
  listHeldOrders: (params?: { sessionId?: string; terminalId?: string }) => {
    const search = new URLSearchParams()
    if (params?.sessionId) search.set('sessionId', params.sessionId)
    if (params?.terminalId) search.set('terminalId', params.terminalId)

    return apiRequest<any[]>(`/api/pos/held-orders?${search.toString()}`)
  },

  holdOrder: (data: {
    terminalId: string
    sessionId: string
    customerId?: string | null
    holdReference: string
    cartData: any
    subtotal: number | string
    taxAmount: number | string
    discountAmount: number | string
    totalAmount: number | string
    notes?: string
  }) => {
    return apiRequest<any>('/api/pos/held-orders', {
      method: 'POST',
      body: JSON.stringify({ action: 'hold', ...data }),
    })
  },

  resumeHeldOrder: (heldOrderId: string) => {
    return apiRequest<any>('/api/pos/held-orders', {
      method: 'POST',
      body: JSON.stringify({ action: 'resume', heldOrderId }),
    })
  },

  cancelHeldOrder: (heldOrderId: string) => {
    return apiRequest<any>('/api/pos/held-orders', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', heldOrderId }),
    })
  },
}
