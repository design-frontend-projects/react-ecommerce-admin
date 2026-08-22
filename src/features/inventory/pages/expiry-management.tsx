import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  ArrowLeftRight,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FilterBar } from '@/components/shared/filter-bar'
import { listBatches } from '@/server/fns/batches'
import { useAuthStore } from '@/stores/auth-store'

interface BatchItem {
  id: string
  batch_number?: string | null
  expiry_date?: string | Date | null
  status?: string | null
  qty_on_hand?: number | null
}

interface ProcessedBatch extends BatchItem {
  expDate: Date | null
  daysRemaining: number | null
  urgency: 'expired' | 'critical' | 'warning' | 'moderate' | 'safe' | 'none'
}

export function ExpiryManagementPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUrgency, setSelectedUrgency] = useState('all')

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches-expiry-management', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await listBatches(user.id)
      return res as BatchItem[]
    },
    enabled: !!user?.id,
  })

  const now = useMemo(() => new Date(), [])

  // Process and group batches by expiry days
  const processedBatches: ProcessedBatch[] = useMemo(() => {
    if (!batches) return []

    return batches.map((b) => {
      const expDate = b.expiry_date ? new Date(b.expiry_date) : null
      let daysRemaining: number | null = null
      let urgency: 'expired' | 'critical' | 'warning' | 'moderate' | 'safe' | 'none' = 'none'

      if (expDate) {
        const diffTime = expDate.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (daysRemaining < 0) {
          urgency = 'expired'
        } else if (daysRemaining <= 30) {
          urgency = 'critical'
        } else if (daysRemaining <= 60) {
          urgency = 'warning'
        } else if (daysRemaining <= 90) {
          urgency = 'moderate'
        } else {
          urgency = 'safe'
        }
      }

      return {
        ...b,
        expDate,
        daysRemaining,
        urgency,
      }
    })
  }, [batches, now])

  const filteredBatches = useMemo(() => {
    return processedBatches.filter((b) => {
      const matchSearch =
        !searchTerm.trim() ||
        (b.batch_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.id || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchUrgency =
        selectedUrgency === 'all' || b.urgency === selectedUrgency

      return matchSearch && matchUrgency
    })
  }, [processedBatches, searchTerm, selectedUrgency])

  // Count summaries
  const expiredCount = processedBatches.filter((b) => b.urgency === 'expired').length
  const criticalCount = processedBatches.filter((b) => b.urgency === 'critical').length
  const warningCount = processedBatches.filter((b) => b.urgency === 'warning').length
  const moderateCount = processedBatches.filter((b) => b.urgency === 'moderate').length

  const urgencyOptions = [
    { value: 'expired', label: 'Already Expired (Urgent Action)' },
    { value: 'critical', label: 'Critical (<30 Days)' },
    { value: 'warning', label: 'Warning (31 - 60 Days)' },
    { value: 'moderate', label: 'Moderate (61 - 90 Days)' },
    { value: 'safe', label: 'Fresh (>90 Days)' },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            Batch Expiry Management & Shelf-Life Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor approaching expiry deadlines, prevent inventory wastage, and trigger clearance workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/stock-transfers' })}
            className="text-xs gap-1.5"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Clearance Transfer
          </Button>

          <Button
            size="sm"
            onClick={() => navigate({ to: '/stock-adjustments' })}
            className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Write-Off Expired Stock
          </Button>
        </div>
      </div>

      {/* Urgency Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired */}
        <Card
          onClick={() => setSelectedUrgency('expired')}
          className="cursor-pointer border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Expired (Immediate Action)
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {expiredCount} Batches
              </p>
              <p className="text-[11px] text-muted-foreground">Requires disposal / write-off</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* <30 Days */}
        <Card
          onClick={() => setSelectedUrgency('critical')}
          className="cursor-pointer border-orange-300 dark:border-orange-900 bg-orange-50/40 dark:bg-orange-950/20 hover:border-orange-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                Critical (&lt;30 Days)
              </p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                {criticalCount} Batches
              </p>
              <p className="text-[11px] text-muted-foreground">FIFO clearance promotion</p>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* 31-60 Days */}
        <Card
          onClick={() => setSelectedUrgency('warning')}
          className="cursor-pointer border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Warning (31 - 60 Days)
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {warningCount} Batches
              </p>
              <p className="text-[11px] text-muted-foreground">Prioritize in sales orders</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* 61-90 Days */}
        <Card
          onClick={() => setSelectedUrgency('moderate')}
          className="cursor-pointer border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-400 transition-all shadow-xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Moderate (61 - 90 Days)
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {moderateCount} Batches
              </p>
              <p className="text-[11px] text-muted-foreground">Stable monitoring</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search batch number or barcode..."
        statusOptions={urgencyOptions}
        selectedStatus={selectedUrgency}
        onStatusChange={setSelectedUrgency}
        onReset={() => {
          setSearchTerm('')
          setSelectedUrgency('all')
        }}
      />

      {/* Batches Table Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Monitored Inventory Batches</CardTitle>
          <CardDescription className="text-xs">
            Showing {filteredBatches.length} tracked batches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading batch shelf-life data...
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border rounded-lg bg-muted/10">
              No batches match the selected expiry criteria.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">Batch Number</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs text-end">Days Remaining</TableHead>
                    <TableHead className="text-xs text-end">On-Hand Qty</TableHead>
                    <TableHead className="text-xs text-center">Urgency Level</TableHead>
                    <TableHead className="text-xs text-end">Quick Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => {
                    const days = batch.daysRemaining

                    return (
                      <TableRow key={batch.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-foreground">
                          {batch.batch_number || batch.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {batch.expDate ? batch.expDate.toLocaleDateString() : 'No expiry set'}
                        </TableCell>
                        <TableCell className="text-end font-bold tabular-nums">
                          {days !== null ? (
                            days < 0 ? (
                              <span className="text-rose-600">Expired ({Math.abs(days)}d ago)</span>
                            ) : (
                              <span>{days} days</span>
                            )
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-end font-bold tabular-nums text-foreground">
                          {batch.qty_on_hand ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {batch.urgency === 'expired' && (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                              Expired
                            </Badge>
                          )}
                          {batch.urgency === 'critical' && (
                            <Badge className="bg-orange-500 text-white text-[10px] uppercase font-bold">
                              Critical (&lt;30d)
                            </Badge>
                          )}
                          {batch.urgency === 'warning' && (
                            <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold">
                              Warning (&lt;60d)
                            </Badge>
                          )}
                          {batch.urgency === 'moderate' && (
                            <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">
                              Moderate
                            </Badge>
                          )}
                          {batch.urgency === 'safe' && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">
                              Safe
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({ to: '/stock-adjustments' })}
                            className="h-7 text-xs text-primary hover:text-primary/80"
                          >
                            Resolve <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
