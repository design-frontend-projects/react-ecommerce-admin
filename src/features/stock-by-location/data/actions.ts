import { authorizedRequest, type TokenGetter } from '@/lib/authorized-request'
import {
  reconcileResponseSchema,
  stockByLocationResponseSchema,
  type ReconcileReport,
  type StockByLocationRow,
} from './schema'

const BASE = '/api/inventory/stock-by-location'

export async function fetchStockByLocation(
  getToken: TokenGetter,
  filters: { storeId?: string; warehouseId?: string } = {}
): Promise<StockByLocationRow[]> {
  const params = new URLSearchParams()
  if (filters.storeId) params.set('storeId', filters.storeId)
  if (filters.warehouseId) params.set('warehouseId', filters.warehouseId)
  const query = params.toString()
  const payload = await authorizedRequest(
    getToken,
    query ? `${BASE}?${query}` : BASE
  )
  return stockByLocationResponseSchema.parse(payload).data
}

export async function fetchReconcileReport(
  getToken: TokenGetter
): Promise<ReconcileReport> {
  const payload = await authorizedRequest(getToken, `${BASE}?reconcile=1`)
  return reconcileResponseSchema.parse(payload).data
}
