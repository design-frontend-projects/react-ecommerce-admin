import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Ticket, ShieldCheck, BarChart3 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { PromotionsKpiCards } from '../components/promotions-kpi-cards'
import { PromotionsFilters } from '../components/promotions-filters'
import { PromotionsTable } from '../components/promotions-table'
import {
  useInvPromotions,
  usePromotionUsageStats,
  useChangePromotionStatus,
  useDuplicatePromotion,
  useDeletePromotion,
} from '../hooks/use-inv-promotions'
import type { PromotionStatus } from '../types'

export function PromotionsDashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PromotionStatus | 'all'>('all')
  const [promoType, setPromoType] = useState('all')
  const [page, setPage] = useState(1)

  // Realtime subscription for promotion updates
  useEffect(() => {
    const channel = supabase
      .channel(`inv_promotions_dashboard_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inv_promotions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inv_promotions'] })
          queryClient.invalidateQueries({ queryKey: ['inv_promotion_stats'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Data fetching
  const { data: statsData } = usePromotionUsageStats()
  const {
    data: promoData,
    isLoading,
  } = useInvPromotions({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    promoType: promoType !== 'all' ? promoType : undefined,
    page,
    pageSize: 20,
  })

  // Mutations
  const changeStatusMutation = useChangePromotionStatus()
  const duplicateMutation = useDuplicatePromotion()
  const deleteMutation = useDeletePromotion()

  const handleStatusChange = async (id: string, newStatus: PromotionStatus) => {
    await changeStatusMutation.mutateAsync({ id, status: newStatus })
  }

  const handleDuplicate = async (id: string) => {
    await duplicateMutation.mutateAsync(id)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('promotions.confirmArchive', 'Are you sure you want to archive this promotion?'))) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleReset = () => {
    setSearch('')
    setStatus('all')
    setPromoType('all')
    setPage(1)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header fixed>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {t('promotions.subtitle', 'ERP Promotions & Discounts')}
          </span>
        </div>
        <div className="ms-auto flex items-center space-x-4">
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('promotions.title', 'Promotions & Discounts')}
              </h1>
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                {t('promotions.engine', 'ERP Engine')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('promotions.description', 'Manage automated pricing promotions, coupons, condition rules, and discount approval workflows.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/promotions/coupons' })}
              className="gap-1.5 h-9"
            >
              <Ticket className="h-4 w-4 text-purple-600" />
              {t('promotions.coupons', 'Coupons')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/promotions/discount-approvals' })}
              className="gap-1.5 h-9"
            >
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              {t('promotions.approvals', 'Approvals')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/promotions/reports' })}
              className="gap-1.5 h-9"
            >
              <BarChart3 className="h-4 w-4 text-blue-600" />
              {t('promotions.reports', 'Reports')}
            </Button>

            <Button
              size="sm"
              onClick={() => navigate({ to: '/promotions/new' })}
              className="gap-1.5 h-9 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              {t('promotions.newPromotion', 'New Promotion')}
            </Button>
          </div>
        </div>

        {/* KPI Stats */}
        <PromotionsKpiCards
          totalPromotions={statsData?.totalPromotions ?? 0}
          activePromotions={statsData?.activePromotions ?? 0}
          totalCoupons={statsData?.totalCoupons ?? 0}
          activeCoupons={statsData?.activeCoupons ?? 0}
          totalRedemptions={statsData?.totalRedemptions ?? 0}
          totalDiscountGiven={statsData?.totalDiscountGiven ?? 0}
        />

        {/* Filters */}
        <PromotionsFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          promoType={promoType}
          onPromoTypeChange={setPromoType}
          onReset={handleReset}
        />

        {/* Table */}
        <PromotionsTable
          promotions={promoData?.data || []}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {promoData && promoData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/50 pt-4 text-xs text-muted-foreground">
            <span>
              {t('promotions.table.showingCount', {
                from: (page - 1) * 20 + 1,
                to: Math.min(page * 20, promoData.totalCount),
                total: promoData.totalCount,
                defaultValue: `Showing ${(page - 1) * 20 + 1} to ${Math.min(page * 20, promoData.totalCount)} of ${promoData.totalCount} promotions`,
              })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5"
              >
                {t('promotions.common.previous', 'Previous')}
              </Button>
              <span className="px-2 text-foreground font-medium">
                {page} / {promoData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= promoData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-2.5"
              >
                {t('promotions.common.next', 'Next')}
              </Button>
            </div>
          </div>
        )}
      </Main>
    </div>
  )
}
