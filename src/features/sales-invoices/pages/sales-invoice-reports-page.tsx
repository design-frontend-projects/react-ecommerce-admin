import React from 'react'
import { useTranslation } from 'react-i18next'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { InvoiceReportsView } from '../components/invoice-reports-view'
import { LineChart } from 'lucide-react'

export const SalesInvoiceReportsPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">
            {t('salesInvoices.reports.title', 'Invoice Reports')}
          </h1>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <LanguageSwitch />
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
