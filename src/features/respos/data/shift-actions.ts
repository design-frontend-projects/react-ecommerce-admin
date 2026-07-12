// Shift management client actions — authorized fetches against the
// /api/respos/shifts endpoints, Zod-parsed on the way back.
import {
  activeShiftsResponseSchema,
  auditResponseSchema,
  expectedResponseSchema,
  movementResponseSchema,
  movementsResponseSchema,
  settingsResponseSchema,
  shiftDtoSchema,
  shiftListResponseSchema,
  shiftResponseSchema,
  addCashMovementInputSchema,
  closeShiftInputSchema,
  correctShiftInputSchema,
  forceCloseShiftInputSchema,
  openShiftInputSchema,
  reviewShiftInputSchema,
  updateShiftSettingsInputSchema,
  type AddCashMovementInput,
  type CashMovementDto,
  type CloseShiftInput,
  type CorrectShiftInput,
  type ForceCloseShiftInput,
  type ListShiftsQuery,
  type OpenShiftInput,
  type ReviewShiftInput,
  type ShiftAuditEntry,
  type ShiftDto,
  type ShiftExpectedDto,
  type ShiftSettingsDto,
  type UpdateShiftSettingsInput,
} from './shift-schemas'

export type TokenGetter = () => Promise<string | null>

/** Error message surfaced by the server when a variance comment is required. */
export const VARIANCE_COMMENT_REQUIRED =
  'A comment is required when the variance exceeds the threshold.'

/** Error message surfaced when the user already has an open shift (409). */
export const ACTIVE_SHIFT_EXISTS = 'active_shift_exists'

async function authorizedRequest(
  getToken: TokenGetter,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const token = await getToken()
  if (!token) {
    throw new Error('Your session is not available. Please sign in again.')
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  const payload = await response
    .json()
    .catch(() => ({ success: false, message: 'Unexpected server response.' }))

  if (!response.ok) {
    throw new Error(
      payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        'Request failed.'
    )
  }

  return payload
}

export async function openShiftRequest(
  getToken: TokenGetter,
  input: OpenShiftInput
): Promise<ShiftDto> {
  const body = openShiftInputSchema.parse(input)
  const payload = await authorizedRequest(getToken, '/api/respos/shifts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return shiftResponseSchema.parse(payload).data
}

export async function closeShiftRequest(
  getToken: TokenGetter,
  input: CloseShiftInput
): Promise<ShiftDto> {
  const body = closeShiftInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/close',
    { method: 'POST', body: JSON.stringify(body) }
  )
  return shiftResponseSchema.parse(payload).data
}

export async function forceCloseShiftRequest(
  getToken: TokenGetter,
  input: ForceCloseShiftInput
): Promise<ShiftDto> {
  const body = forceCloseShiftInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/force-close',
    { method: 'POST', body: JSON.stringify(body) }
  )
  return shiftResponseSchema.parse(payload).data
}

export async function correctShiftRequest(
  getToken: TokenGetter,
  input: CorrectShiftInput
): Promise<{ shift: ShiftDto; auditId: string }> {
  const body = correctShiftInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/corrections',
    { method: 'POST', body: JSON.stringify(body) }
  )
  if (!payload?.success) {
    throw new Error('Unexpected server response.')
  }
  return {
    shift: shiftDtoSchema.parse(payload.data.shift),
    auditId: String(payload.data.auditId),
  }
}

export async function reviewShiftRequest(
  getToken: TokenGetter,
  input: ReviewShiftInput
): Promise<ShiftDto> {
  const body = reviewShiftInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/review',
    { method: 'POST', body: JSON.stringify(body) }
  )
  return shiftResponseSchema.parse(payload).data
}

export async function addCashMovementRequest(
  getToken: TokenGetter,
  input: AddCashMovementInput
): Promise<CashMovementDto> {
  const body = addCashMovementInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/movements',
    { method: 'POST', body: JSON.stringify(body) }
  )
  return movementResponseSchema.parse(payload).data
}

export async function fetchCashMovements(
  getToken: TokenGetter,
  shiftId: string
): Promise<CashMovementDto[]> {
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/movements?shiftId=${encodeURIComponent(shiftId)}`
  )
  return movementsResponseSchema.parse(payload).data.movements
}

export async function fetchExpectedCash(
  getToken: TokenGetter,
  shiftId: string
): Promise<ShiftExpectedDto> {
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/expected?shiftId=${encodeURIComponent(shiftId)}`
  )
  return expectedResponseSchema.parse(payload).data
}

export async function fetchShiftAudit(
  getToken: TokenGetter,
  shiftId: string
): Promise<ShiftAuditEntry[]> {
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/audit?shiftId=${encodeURIComponent(shiftId)}`
  )
  return auditResponseSchema.parse(payload).data.entries
}

export async function fetchAllShifts(
  getToken: TokenGetter,
  query: Partial<ListShiftsQuery> = {}
): Promise<{
  shifts: ShiftDto[]
  total: number
  page: number
  pageSize: number
}> {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.userId) params.set('userId', query.userId)
  if (query.branchId) params.set('branchId', query.branchId)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.needsReview !== undefined) {
    params.set('needsReview', String(query.needsReview))
  }
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))

  const search = params.toString()
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts${search ? `?${search}` : ''}`
  )
  return shiftListResponseSchema.parse(payload).data
}

export async function fetchActiveShifts(
  getToken: TokenGetter,
  branchId?: string
): Promise<Array<ShiftDto & { elapsedMinutes: number }>> {
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/active${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`
  )
  return activeShiftsResponseSchema.parse(payload).data.shifts
}

export async function fetchShiftSettings(
  getToken: TokenGetter,
  restaurantId?: string | null,
  branchId?: string | null
): Promise<ShiftSettingsDto> {
  const params = new URLSearchParams()
  if (restaurantId) params.set('restaurantId', restaurantId)
  if (branchId) params.set('branchId', branchId)
  const search = params.toString()
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/settings${search ? `?${search}` : ''}`
  )
  return settingsResponseSchema.parse(payload).data
}

export type ShiftAnalyticsMetric =
  | 'duration'
  | 'variance'
  | 'coverage'
  | 'offenders'
export type ShiftAnalyticsRange = '1d' | '7d' | '15d' | '30d' | '90d'

export interface ShiftDurationPoint {
  day: string
  avgHours: number
  medianHours: number
  shifts: number
}

export interface ShiftVarianceSeries {
  key: string
  label: string
  points: Array<{
    day: string
    totalVariance: string
    avgAbsVariance: string
    overThreshold: number
  }>
}

export interface ShiftCoverageCell {
  weekday: number
  hour: number
  avgHeadcount: number
}

export interface ShiftOffenderRow {
  userId: string
  employeeName: string
  shifts: number
  sumAbsVariance: string
  countOverThreshold: number
}

export async function fetchShiftAnalytics<T>(
  getToken: TokenGetter,
  metric: ShiftAnalyticsMetric,
  range: ShiftAnalyticsRange,
  branchId?: string
): Promise<T> {
  const params = new URLSearchParams({ metric, range })
  if (branchId) params.set('branchId', branchId)
  const payload = await authorizedRequest(
    getToken,
    `/api/respos/shifts/analytics?${params.toString()}`
  )
  if (!payload?.success) {
    throw new Error('Unexpected server response.')
  }
  return payload.data as T
}

export async function updateShiftSettingsRequest(
  getToken: TokenGetter,
  input: UpdateShiftSettingsInput
): Promise<ShiftSettingsDto> {
  const body = updateShiftSettingsInputSchema.parse(input)
  const payload = await authorizedRequest(
    getToken,
    '/api/respos/shifts/settings',
    { method: 'PUT', body: JSON.stringify(body) }
  )
  return settingsResponseSchema.parse(payload).data
}
