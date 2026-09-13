import React, { createContext, useContext, useState } from 'react'
import type { FinancialTransactionRow } from '../data/schema'

interface TransactionsContextType {
  // Dialog visibility
  isCreateOpen: boolean
  setIsCreateOpen: (open: boolean) => void
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void
  isRefundOpen: boolean
  setIsRefundOpen: (open: boolean) => void
  isStatusOpen: boolean
  setIsStatusOpen: (open: boolean) => void

  // Active records
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  selectedRow: FinancialTransactionRow | null
  setSelectedRow: (row: FinancialTransactionRow | null) => void
  targetStatus: string | null
  setTargetStatus: (status: string | null) => void

  // Filters & Tabs
  activeTab: string
  setActiveTab: (tab: string) => void
  search: string
  setSearch: (search: string) => void
  typeFilter: string
  setTypeFilter: (type: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  currencyFilter: string
  setCurrencyFilter: (currency: string) => void
  page: number
  setPage: (page: number) => void

  // Helpers
  openDetail: (id: string) => void
  openRefund: (row: FinancialTransactionRow) => void
  openStatusChange: (row: FinancialTransactionRow, status: string) => void
}

const TransactionsContext = createContext<TransactionsContextType | null>(null)

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isRefundOpen, setIsRefundOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<FinancialTransactionRow | null>(null)
  const [targetStatus, setTargetStatus] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('__all__')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [currencyFilter, setCurrencyFilter] = useState('__all__')
  const [page, setPage] = useState(1)

  const openDetail = (id: string) => {
    setSelectedId(id)
    setIsDetailOpen(true)
  }

  const openRefund = (row: FinancialTransactionRow) => {
    setSelectedRow(row)
    setSelectedId(row.id)
    setIsRefundOpen(true)
  }

  const openStatusChange = (row: FinancialTransactionRow, status: string) => {
    setSelectedRow(row)
    setSelectedId(row.id)
    setTargetStatus(status)
    setIsStatusOpen(true)
  }

  return (
    <TransactionsContext.Provider
      value={{
        isCreateOpen,
        setIsCreateOpen,
        isDetailOpen,
        setIsDetailOpen,
        isRefundOpen,
        setIsRefundOpen,
        isStatusOpen,
        setIsStatusOpen,
        selectedId,
        setSelectedId,
        selectedRow,
        setSelectedRow,
        targetStatus,
        setTargetStatus,
        activeTab,
        setActiveTab,
        search,
        setSearch,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        currencyFilter,
        setCurrencyFilter,
        page,
        setPage,
        openDetail,
        openRefund,
        openStatusChange,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactionsContext() {
  const context = useContext(TransactionsContext)
  if (!context) {
    throw new Error('useTransactionsContext must be used within a TransactionsProvider')
  }
  return context
}
