import { useState } from 'react'
import {
  ShoppingCart,
  LayoutDashboard,
  Truck,
  Monitor,
  FileSpreadsheet,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PosMainScreen } from './pos-main-screen'
import { ShiftDashboard } from './shift-dashboard'
import { NonRestaurantShipmentsBoard } from './non-restaurant-shipments-board'
import { PosTerminalsPage } from '../pages/pos-terminals-page'
import { PosReportsPage } from '../pages/pos-reports-page'

export function PosLayout() {
  const [activeTab, setActiveTab] = useState('checkout')

  return (
    <div className='flex h-[calc(100vh-4rem)] flex-col bg-muted/10 p-2 sm:p-3'>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex flex-1 flex-col overflow-hidden'
      >
        <div className='mb-2 flex items-center justify-between gap-4 shrink-0'>
          <TabsList className='grid w-full max-w-2xl grid-cols-5 h-9'>
            <TabsTrigger value='checkout' className='gap-1.5 text-xs'>
              <ShoppingCart className='h-3.5 w-3.5' />
              Register
            </TabsTrigger>
            <TabsTrigger value='dashboard' className='gap-1.5 text-xs'>
              <LayoutDashboard className='h-3.5 w-3.5' />
              Shift Analytics
            </TabsTrigger>
            <TabsTrigger value='shipments' className='gap-1.5 text-xs'>
              <Truck className='h-3.5 w-3.5' />
              Shipments
            </TabsTrigger>
            <TabsTrigger value='terminals' className='gap-1.5 text-xs'>
              <Monitor className='h-3.5 w-3.5' />
              Terminals
            </TabsTrigger>
            <TabsTrigger value='reports' className='gap-1.5 text-xs'>
              <FileSpreadsheet className='h-3.5 w-3.5' />
              Audit Logs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='checkout' className='mt-0 flex-1 overflow-hidden outline-none'>
          <PosMainScreen />
        </TabsContent>

        <TabsContent
          value='dashboard'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card shadow-xs outline-none'
        >
          <ShiftDashboard />
        </TabsContent>

        <TabsContent
          value='shipments'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card p-4 shadow-xs outline-none'
        >
          <NonRestaurantShipmentsBoard variant='embedded' context='pos' />
        </TabsContent>

        <TabsContent
          value='terminals'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card shadow-xs outline-none'
        >
          <PosTerminalsPage />
        </TabsContent>

        <TabsContent
          value='reports'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card shadow-xs outline-none'
        >
          <PosReportsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
