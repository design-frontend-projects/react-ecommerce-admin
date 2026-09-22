import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  LayoutDashboard,
  Truck,
  Monitor,
  FileSpreadsheet,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PosMainScreen } from './pos-main-screen'
import { ShiftDashboard } from './shift-dashboard'
import { NonRestaurantShipmentsBoard } from './non-restaurant-shipments-board'
import { PosTerminalsPage } from '../pages/pos-terminals-page'
import { PosReportsPage } from '../pages/pos-reports-page'
import { usePosStore } from '../store/use-pos-store'

export function PosLayout() {
  const { t } = useTranslation()
  const { activeTab, setActiveTab } = usePosStore()

  return (
    <div className='flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-muted/10 p-1.5 sm:p-2.5 md:p-3'>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex flex-1 min-h-0 flex-col overflow-hidden'
      >
        <div className='mb-1.5 sm:mb-2 flex items-center justify-between gap-2 sm:gap-4 shrink-0'>
          <div className='flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden'>
            <SidebarTrigger
              className='h-8 w-8 shrink-0 text-muted-foreground hover:bg-background/80 hover:text-foreground'
              title={t('pos.layout.toggleSidebar', 'Toggle Sidebar')}
            />
            <Separator orientation='vertical' className='hidden h-5 sm:block' />
            <div className='flex-1 overflow-x-auto no-scrollbar py-0.5'>
              <TabsList className='inline-flex h-9 w-auto min-w-full sm:min-w-0 p-1 bg-muted/70'>
                <TabsTrigger value='checkout' className='gap-1.5 text-xs whitespace-nowrap px-2.5 sm:px-3 font-semibold'>
                  <ShoppingCart className='h-3.5 w-3.5 shrink-0' />
                  <span>{t('pos.tabs.register', 'Register')}</span>
                </TabsTrigger>
                <TabsTrigger value='dashboard' className='gap-1.5 text-xs whitespace-nowrap px-2.5 sm:px-3 font-semibold'>
                  <LayoutDashboard className='h-3.5 w-3.5 shrink-0' />
                  <span>{t('pos.tabs.shiftAnalytics', 'Shift Analytics')}</span>
                </TabsTrigger>
                <TabsTrigger value='shipments' className='gap-1.5 text-xs whitespace-nowrap px-2.5 sm:px-3 font-semibold'>
                  <Truck className='h-3.5 w-3.5 shrink-0' />
                  <span>{t('pos.tabs.shipments', 'Shipments')}</span>
                </TabsTrigger>
                <TabsTrigger value='terminals' className='gap-1.5 text-xs whitespace-nowrap px-2.5 sm:px-3 font-semibold'>
                  <Monitor className='h-3.5 w-3.5 shrink-0' />
                  <span>{t('pos.tabs.terminals', 'Terminals')}</span>
                </TabsTrigger>
                <TabsTrigger value='reports' className='gap-1.5 text-xs whitespace-nowrap px-2.5 sm:px-3 font-semibold'>
                  <FileSpreadsheet className='h-3.5 w-3.5 shrink-0' />
                  <span>{t('pos.tabs.auditLogs', 'Audit Logs')}</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value='checkout' className='mt-0 flex-1 min-h-0 overflow-hidden outline-none'>
          <PosMainScreen />
        </TabsContent>

        <TabsContent
          value='dashboard'
          className='mt-0 flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border bg-card p-3 sm:p-4 shadow-xs outline-none'
        >
          <ShiftDashboard />
        </TabsContent>

        <TabsContent
          value='shipments'
          className='mt-0 flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border bg-card p-3 sm:p-4 shadow-xs outline-none'
        >
          <NonRestaurantShipmentsBoard variant='embedded' context='pos' />
        </TabsContent>

        <TabsContent
          value='terminals'
          className='mt-0 flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border bg-card p-3 sm:p-4 shadow-xs outline-none'
        >
          <PosTerminalsPage />
        </TabsContent>

        <TabsContent
          value='reports'
          className='mt-0 flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border bg-card p-3 sm:p-4 shadow-xs outline-none'
        >
          <PosReportsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
