import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Plus,
  RotateCcw,
  Search as SearchIcon,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CancelTransactionDialog } from './components/cancel-transaction-dialog'
import { CreateTransactionDialog } from './components/create-transaction-dialog'
import { ReverseTransactionDialog } from './components/reverse-transaction-dialog'
import { TransactionDetailDialog } from './components/transaction-detail-dialog'
import {
  useInventoryTransactions,
  usePostInventoryTransaction,
} from './hooks/use-inventory-transactions'

const ALL = '__all__'

export function InventoryTransactions() {
  const { t } = useTranslation()

  const [status, setStatus] = useState<string>(ALL)
  const [typeCode, setTypeCode] = useState<string>(ALL)
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)

  // Dialog states
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reverseId, setReverseId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState<boolean>(false)

  const { data, isLoading, error } = useInventoryTransactions({
    status: status === ALL ? undefined : status,
    typeCode: typeCode === ALL ? undefined : typeCode,
    search: search.trim() || undefined,
    page,
    pageSize: 20,
  })

  const postMutation = usePostInventoryTransaction()

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  // Metric aggregates
  const inboundCount = items.filter((i) => i.direction === 'inbound').length
  const outboundCount = items.filter((i) => i.direction === 'outbound').length
  const draftCount = items.filter(
    (i) => i.status === 'draft' || i.status === 'pending'
  ).length

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case 'posted':
        return (
          <Badge className='border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'>
            {t('inventoryTransactions.status.posted')}
          </Badge>
        )
      case 'draft':
        return (
          <Badge
            variant='outline'
            className='border-amber-500/30 text-amber-600'
          >
            {t('inventoryTransactions.status.draft')}
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant='secondary'>
            {t('inventoryTransactions.status.pending')}
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant='destructive'>
            {t('inventoryTransactions.status.cancelled')}
          </Badge>
        )
      case 'reversed':
        return (
          <Badge className='border-purple-500/30 bg-purple-500/15 text-purple-700 hover:bg-purple-500/20 dark:text-purple-400'>
            {t('inventoryTransactions.status.reversed')}
          </Badge>
        )
      default:
        return <Badge variant='outline'>{txStatus}</Badge>
    }
  }

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case 'inbound':
        return <ArrowDownLeft className='me-1 inline h-4 w-4 text-blue-500' />
      case 'outbound':
        return <ArrowUpRight className='me-1 inline h-4 w-4 text-amber-500' />
      case 'internal':
        return (
          <ArrowLeftRight className='me-1 inline h-4 w-4 text-violet-500' />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Page title & primary action */}
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent'>
              {t('inventoryTransactions.title')}
            </h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              {t('inventoryTransactions.description')}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className='shadow-xs'>
            <Plus className='me-1.5 h-4 w-4' />
            {t('inventoryTransactions.newTransaction')}
          </Button>
        </div>

        {/* Metrics Overview Cards */}
        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          <div className='rounded-xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium tracking-wider uppercase'>
                {t('inventoryTransactions.metrics.totalTransactions')}
              </span>
              <ArrowLeftRight className='h-4 w-4 text-primary' />
            </div>
            <p className='mt-2 font-mono text-2xl font-bold'>
              {total.toLocaleString()}
            </p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {t('inventoryTransactions.metrics.ledgerEntries')}
            </p>
          </div>

          <div className='rounded-xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium tracking-wider uppercase'>
                {t('inventoryTransactions.metrics.inboundPage')}
              </span>
              <ArrowDownLeft className='h-4 w-4 text-blue-500' />
            </div>
            <p className='mt-2 font-mono text-2xl font-bold text-blue-600 dark:text-blue-400'>
              {inboundCount}
            </p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {t('inventoryTransactions.metrics.receiptsAndAdditions')}
            </p>
          </div>

          <div className='rounded-xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium tracking-wider uppercase'>
                {t('inventoryTransactions.metrics.outboundPage')}
              </span>
              <ArrowUpRight className='h-4 w-4 text-amber-500' />
            </div>
            <p className='mt-2 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {outboundCount}
            </p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {t('inventoryTransactions.metrics.dispatchesAndDeductions')}
            </p>
          </div>

          <div className='rounded-xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium tracking-wider uppercase'>
                {t('inventoryTransactions.metrics.draftPending')}
              </span>
              <Clock className='h-4 w-4 text-amber-500' />
            </div>
            <p className='mt-2 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {draftCount}
            </p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {t('inventoryTransactions.metrics.awaitingCommit')}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className='flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3'>
          <div className='relative min-w-[220px] flex-1'>
            <SearchIcon className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder={t('inventoryTransactions.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='h-9 bg-background pl-9'
            />
          </div>

          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='h-9 w-40 bg-background'>
              <SelectValue
                placeholder={t('inventoryTransactions.filters.allStatuses')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('inventoryTransactions.filters.allStatuses')}
              </SelectItem>
              <SelectItem value='posted'>
                {t('inventoryTransactions.filters.posted')}
              </SelectItem>
              <SelectItem value='draft'>
                {t('inventoryTransactions.filters.draft')}
              </SelectItem>
              <SelectItem value='pending'>
                {t('inventoryTransactions.filters.pending')}
              </SelectItem>
              <SelectItem value='cancelled'>
                {t('inventoryTransactions.filters.cancelled')}
              </SelectItem>
              <SelectItem value='reversed'>
                {t('inventoryTransactions.filters.reversed')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeCode}
            onValueChange={(val) => {
              setTypeCode(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='h-9 w-48 bg-background'>
              <SelectValue
                placeholder={t('inventoryTransactions.filters.allTypes')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('inventoryTransactions.filters.allTypes')}
              </SelectItem>
              <SelectItem value='PURCHASE_RECEIPT'>
                {t('inventoryTransactions.filters.purchaseReceipt')}
              </SelectItem>
              <SelectItem value='SALE_POS'>
                {t('inventoryTransactions.filters.posSale')}
              </SelectItem>
              <SelectItem value='SALE_ORDER_FULFILLMENT'>
                {t('inventoryTransactions.filters.salesOrderFulfillment')}
              </SelectItem>
              <SelectItem value='TRANSFER_SHIPMENT'>
                {t('inventoryTransactions.filters.transferShipment')}
              </SelectItem>
              <SelectItem value='TRANSFER_RECEIPT'>
                {t('inventoryTransactions.filters.transferReceipt')}
              </SelectItem>
              <SelectItem value='ADJUSTMENT_IN'>
                {t('inventoryTransactions.filters.adjustmentIn')}
              </SelectItem>
              <SelectItem value='ADJUSTMENT_OUT'>
                {t('inventoryTransactions.filters.adjustmentOut')}
              </SelectItem>
              <SelectItem value='DAMAGE_WRITE_OFF'>
                {t('inventoryTransactions.filters.damageWriteOff')}
              </SelectItem>
              <SelectItem value='EXPIRY_SCRAP'>
                {t('inventoryTransactions.filters.expiryScrap')}
              </SelectItem>
              <SelectItem value='OPENING_BALANCE'>
                {t('inventoryTransactions.filters.openingBalance')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className='flex items-center justify-center p-16'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='rounded-lg border bg-destructive/10 p-6 text-center text-destructive'>
            {t('inventoryTransactions.error.loadFailed')}
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-16 text-center'>
            <ArrowLeftRight className='mb-3 h-12 w-12 text-muted-foreground/50' />
            <h3 className='text-lg font-semibold'>
              {t('inventoryTransactions.empty.title')}
            </h3>
            <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
              {t('inventoryTransactions.empty.description')}
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className='mt-4'
              variant='outline'
            >
              <Plus className='me-1.5 h-4 w-4' />
              {t('inventoryTransactions.empty.createButton')}
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('inventoryTransactions.table.transactionNumber')}
                    </TableHead>
                    <TableHead>
                      {t('inventoryTransactions.table.type')}
                    </TableHead>
                    <TableHead>
                      {t('inventoryTransactions.table.status')}
                    </TableHead>
                    <TableHead className='text-end'>
                      {t('inventoryTransactions.table.totalQty')}
                    </TableHead>
                    <TableHead className='text-end'>
                      {t('inventoryTransactions.table.valuation')}
                    </TableHead>
                    <TableHead>
                      {t('inventoryTransactions.table.date')}
                    </TableHead>
                    <TableHead className='text-end'>
                      {t('inventoryTransactions.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((txn) => (
                    <TableRow key={txn.id} className='hover:bg-muted/30'>
                      <TableCell className='font-mono font-bold text-primary'>
                        <button
                          onClick={() => setDetailId(txn.id)}
                          className='text-start hover:underline focus:outline-hidden'
                        >
                          {txn.transaction_number}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          {getDirectionIcon(txn.direction)}
                          <span className='text-xs font-medium'>
                            {txn.transaction_type?.name ??
                              txn.transaction_type?.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                      <TableCell className='text-end font-mono font-semibold'>
                        {Number(txn.total_qty).toLocaleString()}
                      </TableCell>
                      <TableCell className='text-end font-mono text-sm'>
                        ${Number(txn.total_cost).toFixed(2)}
                      </TableCell>
                      <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                        {new Date(txn.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className='text-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                            >
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuItem
                              onClick={() => setDetailId(txn.id)}
                            >
                              <Eye className='me-2 h-4 w-4' />
                              {t('inventoryTransactions.actions.viewDetails')}
                            </DropdownMenuItem>

                            {txn.status === 'draft' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => postMutation.mutate(txn.id)}
                                  className='text-emerald-600'
                                >
                                  <CheckCircle2 className='me-2 h-4 w-4' />
                                  {t(
                                    'inventoryTransactions.actions.postTransaction'
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelId(txn.id)}
                                  className='text-destructive'
                                >
                                  <XCircle className='me-2 h-4 w-4' />
                                  {t(
                                    'inventoryTransactions.actions.cancelTransaction'
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}

                            {txn.status === 'posted' && (
                              <DropdownMenuItem
                                onClick={() => setReverseId(txn.id)}
                                className='text-purple-600'
                              >
                                <RotateCcw className='me-2 h-4 w-4' />
                                {t(
                                  'inventoryTransactions.actions.reverseTransaction'
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='flex items-center justify-between px-2'>
                <p className='text-xs text-muted-foreground'>
                  {t('inventoryTransactions.pagination.pageOf', {
                    page,
                    totalPages,
                    total,
                  })}
                </p>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                  >
                    {t('inventoryTransactions.pagination.previous')}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    {t('inventoryTransactions.pagination.next')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialogs */}
        <TransactionDetailDialog
          transactionId={detailId}
          open={Boolean(detailId)}
          onOpenChange={(open) => !open && setDetailId(null)}
          onReverseClick={(id) => {
            setDetailId(null)
            setReverseId(id)
          }}
          onCancelClick={(id) => {
            setDetailId(null)
            setCancelId(id)
          }}
        />

        <CreateTransactionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />

        <ReverseTransactionDialog
          transactionId={reverseId}
          open={Boolean(reverseId)}
          onOpenChange={(open) => !open && setReverseId(null)}
        />

        <CancelTransactionDialog
          transactionId={cancelId}
          open={Boolean(cancelId)}
          onOpenChange={(open) => !open && setCancelId(null)}
        />
      </Main>
    </>
  )
}
