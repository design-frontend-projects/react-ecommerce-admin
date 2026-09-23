import { supabase } from '@/lib/supabase'
import { authorizedRequest } from '@/lib/authorized-request'
import type { DashboardAnalytics } from '../types'

async function getToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch {
    return null
  }
}

export interface FetchDashboardAnalyticsParams {
  warehouseId?: string
  timeRange?: '7d' | '30d' | '90d'
}

export async function fetchDashboardAnalytics(
  params: FetchDashboardAnalyticsParams = {}
): Promise<DashboardAnalytics> {
  const searchParams = new URLSearchParams()
  if (params.warehouseId && params.warehouseId !== 'all') {
    searchParams.set('warehouseId', params.warehouseId)
  }
  if (params.timeRange) {
    searchParams.set('timeRange', params.timeRange)
  }

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const url = `/api/dashboard/analytics${query}`

  const res = (await authorizedRequest(getToken, url)) as {
    success: boolean
    data: DashboardAnalytics
  }

  return res.data
}
