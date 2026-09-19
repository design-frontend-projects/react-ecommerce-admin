import React from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { InvoiceReportsView } from '../components/invoice-reports-view'
import { LineChart } from 'lucide-react'

export const SalesInvoiceReportsPage: React.FC = () => {
  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Invoice Reports</h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <InvoiceReportsView />
      </Main>
    </>
  )
}
