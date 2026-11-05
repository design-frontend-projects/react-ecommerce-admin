import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileCode,
  Loader2,
  Monitor,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { usePosScreenLogs, usePosTerminals } from '../hooks/use-pos-queries'
import type { PosScreenLogItem } from '../services/pos-client'

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'SALE_CHECKOUT', label: 'Sale Checkout' },
  { value: 'REFUND_PROCESSED', label: 'Refund Processed' },
  { value: 'REFUND_FAILED', label: 'Refund Failed' },
  { value: 'PIN_ASSIGNED', label: 'PIN Assigned' },
  { value: 'PIN_VERIFY_SUCCESS', label: 'PIN Verified' },
  { value: 'PIN_VERIFY_FAILED', label: 'PIN Failed' },
  { value: 'PIN_LOCKED', label: 'PIN Locked' },
  { value: 'PIN_UNLOCKED', label: 'PIN Unlocked' },
  { value: 'TERMINAL_USER_ASSIGNED', label: 'Cashier Assigned' },
  { value: 'TERMINAL_USER_REMOVED', label: 'Cashier Removed' },
  { value: 'DISCOUNT_APPLIED', label: 'Discount Applied' },
  { value: 'CART_CLEAR', label: 'Cart Cleared' },
  { value: 'CART_HOLD', label: 'Order Held' },
  { value: 'DRAWER_OPEN', label: 'Cash Drawer Opened' },
  { value: 'CASH_MOVEMENT', label: 'Cash Movement' },
  { value: 'SESSION_OPEN', label: 'Session Opened' },
  { value: 'SESSION_CLOSE', label: 'Session Closed' },
  { value: 'MANAGER_OVERRIDE', label: 'Manager Override' },
]

export function PosScreenLogsTable() {
  const [terminalId, setTerminalId] = useState('all')
  const [action, setAction] = useState('all')
  const [level, setLevel] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Details Modal
  const [selectedLog, setSelectedLog] = useState<PosScreenLogItem | null>(null)

  const { data: terminals = [] } = usePosTerminals()
  const { data: response, isLoading, refetch } = usePosScreenLogs({
    terminalId: terminalId !== 'all' ? terminalId : undefined,
    action: action !== 'all' ? action : undefined,
    level: level !== 'all' ? level : undefined,
    search: search.trim() || undefined,
    page,
    pageSize,
  })

  const logsData = response?.data
  const logs = useMemo(() => logsData?.logs || [], [logsData?.logs])
  const total = logsData?.total || 0
  const totalPages = logsData?.totalPages || 1

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case 'critical':
        return (
          <Badge variant='destructive' className='gap-1 text-[10px] font-bold uppercase'>
            <ShieldAlert className='h-3 w-3' /> Critical
          </Badge>
        )
      case 'error':
        return (
          <Badge variant='destructive' className='gap-1 text-[10px] font-semibold uppercase'>
            <AlertCircle className='h-3 w-3' /> Error
          </Badge>
        )
      case 'warn':
        return (
          <Badge variant='outline' className='gap-1 text-[10px] text-amber-600 border-amber-300 font-semibold uppercase'>
            <AlertTriangle className='h-3 w-3' /> Warning
          </Badge>
        )
      default:
        return (
          <Badge variant='secondary' className='gap-1 text-[10px] font-semibold uppercase'>
            <Info className='h-3 w-3 text-muted-foreground' /> Info
          </Badge>
        )
    }
  }

  const getActionBadge = (act: string) => {
    if (act.includes('REFUND')) {
      return (
        <Badge variant='secondary' className='text-[10px] font-mono text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200'>
          {act}
        </Badge>
      )
    }
    if (act.includes('PIN')) {
      return (
        <Badge variant='secondary' className='text-[10px] font-mono text-purple-600 bg-purple-50 dark:bg-purple-950/20 border-purple-200'>
          {act}
        </Badge>
      )
    }
    if (act.includes('CHECKOUT') || act.includes('SALE')) {
      return (
        <Badge variant='secondary' className='text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200'>
          {act}
        </Badge>
      )
    }
    return (
      <Badge variant='outline' className='text-[10px] font-mono'>
        {act}
      </Badge>
    )
  }

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.error('No logs available to export')
      return
    }

    const headers = ['Timestamp', 'Level', 'Action', 'Terminal', 'Cashier', 'Message']
    const rows = logs.map((l) => [
      l.createdAt,
      l.level,
      l.action,
      l.terminalCode || l.terminalName || 'N/A',
      l.userName,
      `"${l.message.replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `pos-screen-logs-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Logs exported to CSV')
  }

  return (
    <div className='space-y-4'>
      {/* Controls Bar */}
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <div className='flex flex-wrap flex-1 items-center gap-2'>
          <div className='relative w-full sm:w-[220px]'>
            <Search className='absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search logs...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='h-8 pl-8 text-xs'
            />
          </div>

          <Select
            value={terminalId}
            onValueChange={(val) => {
              setTerminalId(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='h-8 w-[160px] text-xs'>
              <Monitor className='mr-1.5 h-3 w-3 text-muted-foreground' />
              <SelectValue placeholder='All Terminals' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>
                All Terminals
              </SelectItem>
              {terminals.map((t) => (
                <SelectItem key={t.id} value={t.id} className='text-xs'>
                  {t.code} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={action}
            onValueChange={(val) => {
              setAction(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='h-8 w-[170px] text-xs'>
              <Filter className='mr-1.5 h-3 w-3 text-muted-foreground' />
              <SelectValue placeholder='All Actions' />
            </SelectTrigger>
            <SelectContent className='max-h-64'>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={level}
            onValueChange={(val) => {
              setLevel(val)
              setPage(1)
            }}
          >
            <SelectTrigger className='h-8 w-[120px] text-xs'>
              <SelectValue placeholder='All Levels' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all' className='text-xs'>All Levels</SelectItem>
              <SelectItem value='info' className='text-xs'>Info</SelectItem>
              <SelectItem value='warn' className='text-xs'>Warning</SelectItem>
              <SelectItem value='error' className='text-xs'>Error</SelectItem>
              <SelectItem value='critical' className='text-xs'>Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className='h-8 text-xs gap-1.5'
          >
            <Download className='h-3.5 w-3.5' /> Export CSV
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='h-8 text-xs gap-1.5'
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className='rounded-lg border bg-card'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[160px] text-xs font-bold uppercase'>Timestamp</TableHead>
              <TableHead className='w-[100px] text-xs font-bold uppercase'>Severity</TableHead>
              <TableHead className='w-[170px] text-xs font-bold uppercase'>Action</TableHead>
              <TableHead className='w-[140px] text-xs font-bold uppercase'>Terminal</TableHead>
              <TableHead className='w-[150px] text-xs font-bold uppercase'>Cashier</TableHead>
              <TableHead className='text-xs font-bold uppercase'>Message / Details</TableHead>
              <TableHead className='w-[80px] text-right text-xs font-bold uppercase'>Raw</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className='h-32 text-center'>
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin text-primary' />
                    <span className='text-xs'>Loading POS screen activity logs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='h-32 text-center'>
                  <div className='flex flex-col items-center justify-center gap-1.5 text-muted-foreground'>
                    <Monitor className='h-8 w-8 text-muted-foreground/30' />
                    <p className='text-sm font-semibold'>No screen logs found</p>
                    <p className='text-xs'>Screen events will be recorded as operations occur.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className='hover:bg-muted/40'>
                  {/* Timestamp */}
                  <TableCell className='text-xs font-mono text-muted-foreground whitespace-nowrap'>
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </TableCell>

                  {/* Level */}
                  <TableCell>{getLevelBadge(log.level)}</TableCell>

                  {/* Action */}
                  <TableCell>{getActionBadge(log.action)}</TableCell>

                  {/* Terminal */}
                  <TableCell>
                    {log.terminalCode ? (
                      <Badge variant='outline' className='font-mono text-[10px]'>
                        {log.terminalCode}
                      </Badge>
                    ) : (
                      <span className='text-[10px] text-muted-foreground'>—</span>
                    )}
                  </TableCell>

                  {/* Cashier */}
                  <TableCell>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-xs font-medium truncate max-w-[130px]'>
                        {log.userName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Message */}
                  <TableCell>
                    <p className='text-xs text-foreground font-medium leading-relaxed'>
                      {log.message}
                    </p>
                  </TableCell>

                  {/* Raw Details Button */}
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      onClick={() => setSelectedLog(log)}
                      title='View event payload JSON'
                    >
                      <FileCode className='h-3.5 w-3.5 text-muted-foreground hover:text-foreground' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className='flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground'>
          <span>
            Showing {logs.length} of {total} event(s)
          </span>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='icon'
              className='h-7 w-7'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant='outline'
              size='icon'
              className='h-7 w-7'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      </div>

      {/* JSON Payload Details Dialog */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <div className='flex items-center gap-2'>
              <FileCode className='h-5 w-5 text-primary' />
              <DialogTitle>Log Event Details</DialogTitle>
            </div>
            <DialogDescription className='text-xs font-mono'>
              ID: {selectedLog?.id} | {selectedLog?.action}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 pt-2 text-xs'>
            <div className='grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3'>
              <div>
                <span className='text-muted-foreground'>Action:</span>{' '}
                <span className='font-semibold'>{selectedLog?.action}</span>
              </div>
              <div>
                <span className='text-muted-foreground'>Severity:</span>{' '}
                <span className='font-semibold uppercase'>{selectedLog?.level}</span>
              </div>
              <div>
                <span className='text-muted-foreground'>Terminal:</span>{' '}
                <span className='font-mono'>{selectedLog?.terminalCode || 'N/A'}</span>
              </div>
              <div>
                <span className='text-muted-foreground'>User:</span>{' '}
                <span className='font-semibold'>{selectedLog?.userName}</span>
              </div>
              <div>
                <span className='text-muted-foreground'>IP Address:</span>{' '}
                <span className='font-mono'>{selectedLog?.ipAddress || '—'}</span>
              </div>
              <div>
                <span className='text-muted-foreground'>Timestamp:</span>{' '}
                <span>{selectedLog?.createdAt}</span>
              </div>
            </div>

            <div>
              <p className='font-semibold mb-1'>Message:</p>
              <p className='p-2 rounded border bg-muted/10'>{selectedLog?.message}</p>
            </div>

            <div>
              <p className='font-semibold mb-1'>Metadata & Payload:</p>
              <pre className='max-h-60 overflow-y-auto rounded-md bg-muted/60 p-3 font-mono text-[11px] leading-snug'>
                {JSON.stringify(selectedLog?.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
