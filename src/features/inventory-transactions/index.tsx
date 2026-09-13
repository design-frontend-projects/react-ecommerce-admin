import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Plus,
  Search as SearchIcon,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { Search } from '@/components/search'
import {
  useInventoryTransactions,
  usePostInventoryTransaction,
} from './hooks/use-inventory-transactions'
import { TransactionDetailDialog } from './components/transaction-detail-dialog'
import { CreateTransactionDialog } from './components/create-transaction-dialog'
import { ReverseTransactionDialog } from './components/reverse-transaction-dialog'
import { CancelTransactionDialog } from './components/cancel-transaction-dialog'

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
  const draftCount = items.filter((i) => i.status === 'draft' || i.status === 'pending').length

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case 'posted':
        return (
          <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'>
            Posted
          </Badge>
        )
      case 'draft':
        return <Badge variant='outline' className='text-amber-600 border-amber-500/30'>Draft</Badge>
      case 'pending':
        return <Badge variant='secondary'>Pending</Badge>
      case 'cancelled':
        return <Badge variant='destructive'>Cancelled</Badge>
      case 'reversed':
        return (
          <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20'>
            Reversed
          </Badge>
        )
      default:
        return <Badge variant='outline'>{txStatus}</Badge>
    }
  }

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case 'inbound':
        return <ArrowDownLeft className='h-4 w-4 text-blue-500 inline me-1' />
      case 'outbound':
        return <ArrowUpRight className='h-4 w-4 text-amber-500 inline me-1' />
      case 'internal':
        return <ArrowLeftRight className='h-4 w-4 text-violet-500 inline me-1' />
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
              {t('sidebar.inventoryTransactions', 'Inventory Transactions')}
            </h2>
            <p className='text-muted-foreground text-sm mt-0.5'>
              Immutable transaction engine ledger enforcing atomic stock mutations, audit history, and rule evaluation.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className='shadow-xs'>
            <Plus className='h-4 w-4 me-1.5' />
            New Transaction
          </Button>
        </div>

        {/* Metrics Overview Cards */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium uppercase tracking-wider'>Total Transactions</span>
              <ArrowLeftRight className='h-4 w-4 text-primary' />
            </div>
            <p className='text-2xl font-bold mt-2 font-mono'>{total.toLocaleString()}</p>
            <p className='text-xs text-muted-foreground mt-0.5'>Ledger entries</p>
          </div>

          <div className='p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium uppercase tracking-wider'>Inbound (Page)</span>
              <ArrowDownLeft className='h-4 w-4 text-blue-500' />
            </div>
            <p className='text-2xl font-bold mt-2 font-mono text-blue-600 dark:text-blue-400'>
              {inboundCount}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>Receipts & additions</p>
          </div>

          <div className='p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium uppercase tracking-wider'>Outbound (Page)</span>
              <ArrowUpRight className='h-4 w-4 text-amber-500' />
            </div>
            <p className='text-2xl font-bold mt-2 font-mono text-amber-600 dark:text-amber-400'>
              {outboundCount}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>Dispatches & deductions</p>
          </div>

          <div className='p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-medium uppercase tracking-wider'>Draft / Pending</span>
              <Clock className='h-4 w-4 text-amber-500' />
            </div>
            <p className='text-2xl font-bold mt-2 font-mono text-amber-600 dark:text-amber-400'>
              {draftCount}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>Awaiting commit</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className='flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/20'>
          <div className='relative flex-1 min-w-[220px]'>
            <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search transaction #, reference, or notes...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='pl-9 h-9 bg-background'
            />
          </div>

          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='w-40 h-9 bg-background'>
              <SelectValue placeholder='All Statuses' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              <SelectItem value='posted'>Posted</SelectItem>
              <SelectItem value='draft'>Draft</SelectItem>
              <SelectItem value='pending'>Pending</SelectItem>
              <SelectItem value='cancelled'>Cancelled</SelectItem>
              <SelectItem value='reversed'>Reversed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeCode}
            onValueChange={(val) => {
              setTypeCode(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='w-48 h-9 bg-background'>
              <SelectValue placeholder='All Types' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              <SelectItem value='PURCHASE_RECEIPT'>Purchase Receipt</SelectItem>
              <SelectItem value='SALE_POS'>POS Sale</SelectItem>
              <SelectItem value='SALE_ORDER_FULFILLMENT'>Sales Order Fulfillment</SelectItem>
              <SelectItem value='TRANSFER_SHIPMENT'>Transfer Shipment</SelectItem>
              <SelectItem value='TRANSFER_RECEIPT'>Transfer Receipt</SelectItem>
              <SelectItem value='ADJUSTMENT_IN'>Adjustment In</SelectItem>
              <SelectItem value='ADJUSTMENT_OUT'>Adjustment Out</SelectItem>
              <SelectItem value='DAMAGE_WRITE_OFF'>Damage Write-Off</SelectItem>
              <SelectItem value='EXPIRY_SCRAP'>Expiry Scrap</SelectItem>
              <SelectItem value='OPENING_BALANCE'>Opening Balance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className='flex items-center justify-center p-16'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='p-6 text-center text-destructive border rounded-lg bg-destructive/10'>
            Failed to load inventory transactions.
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center justify-center p-16 rounded-xl border border-dashed text-center bg-card/40'>
            <ArrowLeftRight className='h-12 w-12 text-muted-foreground/50 mb-3' />
            <h3 className='font-semibold text-lg'>No inventory transactions found</h3>
            <p className='text-sm text-muted-foreground max-w-sm mt-1'>
              Post purchase receipts, sales, stock adjustments or create a manual transaction to record inventory movements.
            </p>
            <Button onClick={() => setCreateOpen(true)} className='mt-4' variant='outline'>
              <Plus className='h-4 w-4 me-1.5' />
              Create Transaction
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-end'>Total Qty</TableHead>
                    <TableHead className='text-end'>Valuation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className='text-end'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((txn) => (
                    <TableRow key={txn.id} className='hover:bg-muted/30'>
                      <TableCell className='font-mono font-bold text-primary'>
                        <button
                          onClick={() => setDetailId(txn.id)}
                          className='hover:underline focus:outline-hidden text-start'
                        >
                          {txn.transaction_number}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center'>
                          {getDirectionIcon(txn.direction)}
                          <span className='font-medium text-xs'>
                            {txn.transaction_type?.name ?? txn.transaction_type?.code}
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
                      <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                        {new Date(txn.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell className='text-end'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuItem onClick={() => setDetailId(txn.id)}>
                              <Eye className='h-4 w-4 me-2' />
                              View Details
                            </DropdownMenuItem>

                            {txn.status === 'draft' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => postMutation.mutate(txn.id)}
                                  className='text-emerald-600'
                                >
                                  <CheckCircle2 className='h-4 w-4 me-2' />
                                  Post Transaction
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancelId(txn.id)}
                                  className='text-destructive'
                                >
                                  <XCircle className='h-4 w-4 me-2' />
                                  Cancel Transaction
                                </DropdownMenuItem>
                              </>
                            )}

                            {txn.status === 'posted' && (
                              <DropdownMenuItem
                                onClick={() => setReverseId(txn.id)}
                                className='text-purple-600'
                              >
                                <RotateCcw className='h-4 w-4 me-2' />
                                Reverse Transaction
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
                  Page {page} of {totalPages} ({total} transactions)
                </p>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    Next
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
