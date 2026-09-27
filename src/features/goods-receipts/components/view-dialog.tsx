import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  FileText,
  MapPin,
  Hash,
  Package,
  Printer,
  Copy,
  Check,
  Calendar,
  Building2,
  User,
  Clock,
  AlertTriangle,
  Search,
  Boxes,
  ShieldCheck,
  ScanBarcode,
  History,
  Coins,
  Truck,
  Info,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Can } from '@/components/rbac/Can'
import type { ReceiptListItem, ReceiptItemRow } from '../data/schema'
import {
  useCancelReceipt,
  usePostReceipt,
  useReceipt,
} from '../hooks/use-goods-receipts'

export function ReceiptViewDialog({
  receipt,
  open,
  onOpenChange,
}: {
  receipt: ReceiptListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { data: detail, isLoading } = useReceipt(open ? receipt.id : undefined)
  const postReceipt = usePostReceipt()
  const cancelReceipt = useCancelReceipt()

  const [confirmPost, setConfirmPost] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'serials' | 'audit'>('items')
  const [searchQuery, setSearchQuery] = useState('')
  const [itemFilter, setItemFilter] = useState<'all' | 'accepted' | 'rejected' | 'serials' | 'batches'>('all')
  const [serialQuery, setSerialQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const isDraft = receipt.status === 'draft'
  const isPosted = receipt.status === 'posted'
  const isCancelled = receipt.status === 'cancelled'

  // Computed summary metrics
  const items: ReceiptItemRow[] = detail?.goods_receipt_items ?? []
  const totalLines = items.length || (receipt._count?.goods_receipt_items ?? 0)

  const totalReceived = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.qty_received) || 0), 0),
    [items]
  )
  const totalAccepted = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.accepted_qty ?? it.qty_received) || 0), 0),
    [items]
  )
  const totalRejected = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.rejected_qty) || 0), 0),
    [items]
  )
  const totalValuation = useMemo(
    () =>
      items.reduce(
        (acc, it) =>
          acc +
          (Number(it.accepted_qty ?? it.qty_received) || 0) * (Number(it.unit_cost) || 0),
        0
      ),
    [items]
  )

  const acceptanceRate = totalReceived > 0 ? Math.round((totalAccepted / totalReceived) * 100) : 100

  // Aggregate all serial numbers across items
  const allSerials = useMemo(() => {
    const list: Array<{
      serial: string
      productName: string
      sku: string
      itemId: string
      condition: string
    }> = []

    for (const it of items) {
      if (it.serials && it.serials.length > 0) {
        const pName =
          it.product_variants?.products?.name ??
          it.product_variants?.name ??
          it.product_variants?.sku ??
          'Unknown Product'
        const sku = it.product_variants?.sku ?? '—'
        for (const sn of it.serials) {
          list.push({
            serial: sn,
            productName: pName,
            sku,
            itemId: it.id,
            condition: it.condition ?? 'good',
          })
        }
      }
    }
    return list
  }, [items])

  // Filtered line items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Type/category filter
      if (itemFilter === 'accepted' && (Number(it.accepted_qty) || 0) === 0) return false
      if (itemFilter === 'rejected' && (Number(it.rejected_qty) || 0) === 0) return false
      if (itemFilter === 'serials' && (!it.serials || it.serials.length === 0)) return false
      if (itemFilter === 'batches' && !it.product_batches?.batch_number && !it.batch_number) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const name = (it.product_variants?.products?.name ?? it.product_variants?.name ?? '').toLowerCase()
        const sku = (it.product_variants?.sku ?? '').toLowerCase()
        const barcode = (it.product_variants?.barcode ?? '').toLowerCase()
        const batch = (it.product_batches?.batch_number ?? it.batch_number ?? '').toLowerCase()
        const loc = (it.warehouse_locations?.code ?? it.warehouse_locations?.name ?? '').toLowerCase()
        if (!name.includes(q) && !sku.includes(q) && !barcode.includes(q) && !batch.includes(q) && !loc.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [items, itemFilter, searchQuery])

  // Filtered serials
  const filteredSerials = useMemo(() => {
    if (!serialQuery.trim()) return allSerials
    const q = serialQuery.toLowerCase().trim()
    return allSerials.filter(
      (s) =>
        s.serial.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q)
    )
  }, [allSerials, serialQuery])

  // Copy to clipboard helper
  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Copy all serials
  const handleCopyAllSerials = () => {
    if (allSerials.length === 0) return
    const text = allSerials.map((s) => s.serial).join('\n')
    handleCopy(text, 'all-serials', `${allSerials.length} serial numbers`)
  }

  // Print Goods Receipt Note
  const handlePrint = () => {
    window.print()
  }

  // Post & Cancel Actions
  const handlePost = async () => {
    try {
      await postReceipt.mutateAsync(receipt.id)
      setConfirmPost(false)
      onOpenChange(false)
    } catch {
      setConfirmPost(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelReceipt.mutateAsync(receipt.id)
      setConfirmCancel(false)
      onOpenChange(false)
    } catch {
      setConfirmCancel(false)
    }
  }

  const poDisplay = receipt.purchase_orders?.po_number
    ? `PO #${receipt.purchase_orders.po_number}`
    : receipt.purchase_order_id
      ? `PO-${receipt.purchase_order_id.slice(0, 8)}`
      : '—'

  const supplierDisplay =
    receipt.purchase_orders?.suppliers?.name ??
    receipt.suppliers?.name ??
    '—'

  const supplierCode =
    receipt.purchase_orders?.suppliers?.code ??
    receipt.suppliers?.code ??
    null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          id='goods-receipt-printable-document'
          className='max-h-[92vh] sm:max-w-5xl flex flex-col p-0 overflow-hidden shadow-2xl border-border/80'
        >
          {/* 1. Header Banner & Document Identity */}
          <div className='p-6 pb-4 border-b bg-gradient-to-r from-muted/40 via-background to-muted/20 print:hidden'>
            <DialogHeader className='space-y-3'>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div className='flex items-center gap-3.5'>
                  <div className='p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-xs'>
                    <FileText className='h-6 w-6' />
                  </div>
                  <div>
                    <div className='flex flex-wrap items-center gap-2.5'>
                      <DialogTitle className='text-xl font-bold tracking-tight'>
                        {receipt.receipt_number}
                      </DialogTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7 rounded-md text-muted-foreground hover:text-foreground'
                              onClick={() => handleCopy(receipt.receipt_number, 'receipt-no', 'Receipt number')}
                            >
                              {copiedKey === 'receipt-no' ? (
                                <Check className='h-3.5 w-3.5 text-emerald-600' />
                              ) : (
                                <Copy className='h-3.5 w-3.5' />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('common.copy', 'Copy Receipt #')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Status Badge */}
                      <Badge
                        variant={
                          isPosted
                            ? 'default'
                            : isCancelled
                              ? 'destructive'
                              : 'outline'
                        }
                        className={`capitalize px-2.5 py-0.5 text-xs font-semibold gap-1.5 shadow-2xs ${
                          isPosted
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : isDraft
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isPosted && <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />}
                        {isDraft && <Clock className='h-3 w-3 text-amber-600 dark:text-amber-400' />}
                        {isCancelled && <XCircle className='h-3 w-3 text-rose-600 dark:text-rose-400' />}
                        {t(`goodsReceipts.status.${receipt.status}`, { defaultValue: receipt.status })}
                      </Badge>
                    </div>

                    <DialogDescription className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                      <span className='flex items-center gap-1 font-medium text-foreground/80'>
                        <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                        {receipt.warehouses?.name ?? '—'}
                      </span>
                      <span className='inline-block h-3 w-px bg-border' />
                      <span className='flex items-center gap-1'>
                        <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                        {new Date(receipt.received_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className='inline-block h-3 w-px bg-border' />
                      <span className='flex items-center gap-1 text-primary font-medium'>
                        <FileText className='h-3.5 w-3.5' />
                        {poDisplay}
                      </span>
                    </DialogDescription>
                  </div>
                </div>

                {/* Print & Action toolbar */}
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 gap-1.5 text-xs font-medium'
                    onClick={handlePrint}
                  >
                    <Printer className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>{t('goodsReceipts.printSlip', { defaultValue: 'Print Slip' })}</span>
                  </Button>
                </div>
              </div>

              {/* 2. Executive KPI Cards */}
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1'>
                <Card className='p-3 bg-card/60 backdrop-blur-xs border-border/70 shadow-2xs gap-0'>
                  <div className='flex items-center justify-between text-xs text-muted-foreground font-medium'>
                    <span>{t('goodsReceipts.receivedQty', { defaultValue: 'Units Received' })}</span>
                    <Boxes className='h-4 w-4 text-blue-500/80' />
                  </div>
                  <div className='mt-1.5 flex items-baseline gap-1.5'>
                    <span className='text-lg font-bold tracking-tight'>{totalReceived}</span>
                    <span className='text-xs text-muted-foreground'>
                      ({totalLines} {t('goodsReceipts.columns.items', { defaultValue: 'lines' })})
                    </span>
                  </div>
                </Card>

                <Card className='p-3 bg-card/60 backdrop-blur-xs border-border/70 shadow-2xs gap-0'>
                  <div className='flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium'>
                    <span>{t('goodsReceipts.acceptedQty', { defaultValue: 'Accepted Units' })}</span>
                    <ShieldCheck className='h-4 w-4 text-emerald-500' />
                  </div>
                  <div className='mt-1.5 flex items-baseline gap-2'>
                    <span className='text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400'>
                      {totalAccepted}
                    </span>
                    <Badge variant='outline' className='text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'>
                      {acceptanceRate}%
                    </Badge>
                  </div>
                </Card>

                <Card className='p-3 bg-card/60 backdrop-blur-xs border-border/70 shadow-2xs gap-0'>
                  <div className='flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-medium'>
                    <span>{t('goodsReceipts.rejectedQty', { defaultValue: 'Rejected Units' })}</span>
                    <AlertTriangle className='h-4 w-4 text-rose-500' />
                  </div>
                  <div className='mt-1.5 flex items-baseline gap-1.5'>
                    <span className={`text-lg font-bold tracking-tight ${totalRejected > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                      {totalRejected}
                    </span>
                    {totalRejected === 0 && (
                      <span className='text-[11px] text-muted-foreground'>
                        {t('goodsReceipts.zeroDefects', { defaultValue: 'Zero Defects' })}
                      </span>
                    )}
                  </div>
                </Card>

                <Card className='p-3 bg-card/60 backdrop-blur-xs border-border/70 shadow-2xs gap-0'>
                  <div className='flex items-center justify-between text-xs text-muted-foreground font-medium'>
                    <span>{t('goodsReceipts.valuation', { defaultValue: 'Stock Valuation' })}</span>
                    <Coins className='h-4 w-4 text-amber-500/80' />
                  </div>
                  <div className='mt-1.5 flex items-baseline gap-1.5'>
                    <span className='text-lg font-bold tracking-tight font-mono'>
                      ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </Card>
              </div>
            </DialogHeader>
          </div>

          {/* 3. Main Content with Tabs */}
          <div className='flex-1 overflow-hidden p-6 pt-4 flex flex-col min-h-0 print:hidden'>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className='flex-1 flex flex-col min-h-0'
            >
              <div className='flex flex-wrap items-center justify-between gap-3 pb-3'>
                <TabsList className='h-9 bg-muted/60 p-1'>
                  <TabsTrigger value='items' className='gap-1.5 text-xs'>
                    <Package className='h-3.5 w-3.5' />
                    <span>{t('goodsReceipts.items', { defaultValue: 'Line Items' })}</span>
                    <Badge variant='secondary' className='text-[10px] py-0 px-1 font-mono'>
                      {totalLines}
                    </Badge>
                  </TabsTrigger>

                  {allSerials.length > 0 && (
                    <TabsTrigger value='serials' className='gap-1.5 text-xs'>
                      <Hash className='h-3.5 w-3.5' />
                      <span>{t('goodsReceipts.serialsDirectory', { defaultValue: 'Serials Directory' })}</span>
                      <Badge variant='secondary' className='text-[10px] py-0 px-1 font-mono'>
                        {allSerials.length}
                      </Badge>
                    </TabsTrigger>
                  )}

                  <TabsTrigger value='audit' className='gap-1.5 text-xs'>
                    <History className='h-3.5 w-3.5' />
                    <span>{t('goodsReceipts.auditAndWorkflow', { defaultValue: 'Audit & Movement' })}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab-specific toolbar */}
                {activeTab === 'items' && (
                  <div className='flex items-center gap-2 flex-1 max-w-md justify-end'>
                    <div className='relative w-full max-w-xs'>
                      <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                      <Input
                        placeholder={t('goodsReceipts.filterItems', { defaultValue: 'Search product, SKU, batch...' })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='h-8 pl-8 text-xs bg-muted/20'
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'serials' && (
                  <div className='flex items-center gap-2'>
                    <div className='relative w-48'>
                      <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                      <Input
                        placeholder={t('goodsReceipts.searchSerials', { defaultValue: 'Filter serials...' })}
                        value={serialQuery}
                        onChange={(e) => setSerialQuery(e.target.value)}
                        className='h-8 pl-8 text-xs bg-muted/20'
                      />
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs gap-1.5'
                      onClick={handleCopyAllSerials}
                    >
                      {copiedKey === 'all-serials' ? (
                        <Check className='h-3.5 w-3.5 text-emerald-600' />
                      ) : (
                        <Copy className='h-3.5 w-3.5' />
                      )}
                      <span>{t('goodsReceipts.copyAllSerials', { defaultValue: 'Copy All Serials' })}</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* TAB 1: Line Items */}
              <TabsContent value='items' className='flex-1 flex flex-col min-h-0 m-0'>
                {/* Filter chips bar */}
                <div className='flex flex-wrap items-center gap-1.5 pb-2.5 text-xs'>
                  <span className='text-muted-foreground me-1 flex items-center gap-1 font-medium'>
                    <Filter className='h-3 w-3' />
                    {t('common.filter', { defaultValue: 'Filter' })}:
                  </span>
                  <Button
                    variant={itemFilter === 'all' ? 'secondary' : 'ghost'}
                    size='sm'
                    className='h-6 px-2 text-xs rounded-full'
                    onClick={() => setItemFilter('all')}
                  >
                    {t('common.all', { defaultValue: 'All' })} ({items.length})
                  </Button>
                  <Button
                    variant={itemFilter === 'accepted' ? 'secondary' : 'ghost'}
                    size='sm'
                    className='h-6 px-2 text-xs rounded-full text-emerald-600 dark:text-emerald-400'
                    onClick={() => setItemFilter('accepted')}
                  >
                    {t('goodsReceipts.acceptedQty', { defaultValue: 'Accepted' })}
                  </Button>
                  {totalRejected > 0 && (
                    <Button
                      variant={itemFilter === 'rejected' ? 'secondary' : 'ghost'}
                      size='sm'
                      className='h-6 px-2 text-xs rounded-full text-rose-600 dark:text-rose-400'
                      onClick={() => setItemFilter('rejected')}
                    >
                      {t('goodsReceipts.rejectedQty', { defaultValue: 'Rejected' })} ({totalRejected})
                    </Button>
                  )}
                  {allSerials.length > 0 && (
                    <Button
                      variant={itemFilter === 'serials' ? 'secondary' : 'ghost'}
                      size='sm'
                      className='h-6 px-2 text-xs rounded-full'
                      onClick={() => setItemFilter('serials')}
                    >
                      {t('goodsReceipts.serials', { defaultValue: 'Serialized' })}
                    </Button>
                  )}
                </div>

                {isLoading ? (
                  <div className='space-y-2 py-4'>
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className='py-12 text-center rounded-lg border border-dashed border-border bg-muted/10'>
                    <Package className='h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50' />
                    <p className='text-sm font-medium text-foreground'>
                      {t('goodsReceipts.noItemsMatch', { defaultValue: 'No items match the current filter.' })}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {t('goodsReceipts.clearFiltersPrompt', { defaultValue: 'Try clearing your search query or switching filters.' })}
                    </p>
                  </div>
                ) : (
                  <div className='flex-1 overflow-auto rounded-lg border border-border shadow-2xs'>
                    <Table>
                      <TableHeader className='bg-muted/60 sticky top-0 backdrop-blur-xs z-10'>
                        <TableRow>
                          <TableHead className='w-[32%]'>{t('goodsReceipts.columns.product', { defaultValue: 'Product / Variant' })}</TableHead>
                          <TableHead className='text-center w-[12%]'>{t('goodsReceipts.condition', { defaultValue: 'Condition' })}</TableHead>
                          <TableHead className='text-end w-[14%]'>{t('goodsReceipts.breakdown', { defaultValue: 'Rec / Acc / Rej' })}</TableHead>
                          <TableHead className='text-end w-[13%]'>{t('goodsReceipts.unitCost', { defaultValue: 'Cost & Total' })}</TableHead>
                          <TableHead className='w-[14%]'>{t('goodsReceipts.columns.location', { defaultValue: 'Location' })}</TableHead>
                          <TableHead className='w-[15%]'>{t('goodsReceipts.batchAndExpiry', { defaultValue: 'Batch & Expiry' })}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => {
                          const batchNum = item.product_batches?.batch_number ?? item.batch_number ?? null
                          const expiryDateVal = item.product_batches?.expiry_date || item.expiry_date
                          const locationCode = item.warehouse_locations?.code || item.warehouse_locations?.name || null
                          const locationPath = item.warehouse_locations?.path

                          const received = Number(item.qty_received) || 0
                          const accepted = Number(item.accepted_qty ?? item.qty_received) || 0
                          const rejected = Number(item.rejected_qty) || 0
                          const unitCost = Number(item.unit_cost) || 0
                          const lineTotal = accepted * unitCost

                          const isExpired = expiryDateVal ? new Date(expiryDateVal) < new Date() : false
                          const daysUntilExpiry = expiryDateVal
                            ? Math.ceil((new Date(expiryDateVal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            : null

                          return (
                            <TableRow key={item.id} className='hover:bg-muted/20 transition-colors'>
                              {/* Product Info */}
                              <TableCell className='py-3'>
                                <div className='font-semibold text-foreground leading-tight'>
                                  {item.product_variants?.products?.name ?? item.product_variants?.name ?? item.product_variants?.sku ?? '—'}
                                </div>
                                <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                                  {item.product_variants?.sku && (
                                    <Badge variant='outline' className='text-[10px] font-mono px-1.5 py-0 bg-muted/40'>
                                      {item.product_variants.sku}
                                    </Badge>
                                  )}
                                  {item.product_variants?.barcode && (
                                    <span className='inline-flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono'>
                                      <ScanBarcode className='h-3 w-3' />
                                      {item.product_variants.barcode}
                                    </span>
                                  )}
                                </div>

                                {/* Rejection reason callout */}
                                {item.rejection_reason && (
                                  <div className='mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-sm px-2 py-0.5 flex items-center gap-1'>
                                    <AlertTriangle className='h-3 w-3 shrink-0' />
                                    <span><strong>{t('goodsReceipts.rejectionReason', { defaultValue: 'Rejected' })}:</strong> {item.rejection_reason}</span>
                                  </div>
                                )}

                                {/* Serials badge row */}
                                {item.serials && item.serials.length > 0 && (
                                  <div className='mt-2 flex flex-wrap items-center gap-1'>
                                    <span className='text-[10px] font-medium text-muted-foreground me-1'>
                                      {t('goodsReceipts.serials', { defaultValue: 'Serials' })} ({item.serials.length}):
                                    </span>
                                    {item.serials.slice(0, 4).map((sn, sIdx) => (
                                      <Badge key={sIdx} variant='secondary' className='text-[10px] font-mono py-0 px-1'>
                                        <Hash className='h-2.5 w-2.5 me-0.5 inline text-muted-foreground' />
                                        {sn}
                                      </Badge>
                                    ))}
                                    {item.serials.length > 4 && (
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='h-4 px-1 text-[10px] text-primary hover:underline'
                                        onClick={() => setActiveTab('serials')}
                                      >
                                        +{item.serials.length - 4} {t('common.more', { defaultValue: 'more' })}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>

                              {/* Condition */}
                              <TableCell className='text-center py-3'>
                                <Badge
                                  variant='outline'
                                  className={`text-[11px] capitalize ${
                                    (item.condition || 'good') === 'good'
                                      ? 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                      : (item.condition || '') === 'damaged'
                                        ? 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                                        : 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                                  }`}
                                >
                                  {item.condition ?? 'good'}
                                </Badge>
                              </TableCell>

                              {/* Quantities (Received / Accepted / Rejected) */}
                              <TableCell className='text-end py-3'>
                                <div className='font-bold text-foreground'>{received}</div>
                                <div className='text-xs mt-0.5 flex items-center justify-end gap-1.5'>
                                  <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                                    ✓ {accepted}
                                  </span>
                                  {rejected > 0 && (
                                    <span className='text-rose-600 dark:text-rose-400 font-medium'>
                                      ✗ {rejected}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Unit Cost & Total */}
                              <TableCell className='text-end py-3'>
                                <div className='font-mono font-medium text-foreground'>
                                  ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className='text-xs text-muted-foreground font-mono mt-0.5'>
                                  @ ${unitCost.toFixed(2)}
                                </div>
                              </TableCell>

                              {/* Location */}
                              <TableCell className='py-3'>
                                {locationCode ? (
                                  <div>
                                    <div className='flex items-center gap-1 text-xs font-medium text-foreground'>
                                      <MapPin className='h-3 w-3 text-primary shrink-0' />
                                      <span>{locationCode}</span>
                                    </div>
                                    {locationPath && locationPath !== locationCode && (
                                      <div className='text-[10px] text-muted-foreground font-mono truncate max-w-[120px]'>
                                        {locationPath}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className='text-xs text-muted-foreground italic'>
                                    {t('goodsReceipts.defaultZone', { defaultValue: 'Default Zone' })}
                                  </span>
                                )}
                              </TableCell>

                              {/* Batch & Expiry */}
                              <TableCell className='py-3'>
                                {batchNum ? (
                                  <div>
                                    <Badge variant='outline' className='text-xs font-mono px-1.5 py-0 bg-muted/30'>
                                      {batchNum}
                                    </Badge>
                                    {expiryDateVal && (
                                      <div className='mt-1 text-[11px] flex items-center gap-1'>
                                        {isExpired ? (
                                          <span className='text-rose-600 dark:text-rose-400 font-semibold'>
                                            Expired ({new Date(expiryDateVal).toLocaleDateString()})
                                          </span>
                                        ) : daysUntilExpiry !== null && daysUntilExpiry <= 30 ? (
                                          <span className='text-amber-600 dark:text-amber-400 font-medium'>
                                            {daysUntilExpiry}d left
                                          </span>
                                        ) : (
                                          <span className='text-muted-foreground'>
                                            {new Date(expiryDateVal).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className='text-xs text-muted-foreground'>—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: Serials Directory */}
              {allSerials.length > 0 && (
                <TabsContent value='serials' className='flex-1 flex flex-col min-h-0 m-0'>
                  <ScrollArea className='flex-1 rounded-lg border border-border bg-card p-4'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5'>
                      {filteredSerials.map((snItem, idx) => (
                        <div
                          key={idx}
                          className='p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between group shadow-2xs'
                        >
                          <div className='min-w-0 flex-1 pr-2'>
                            <div className='flex items-center gap-1.5'>
                              <Hash className='h-3.5 w-3.5 text-primary shrink-0' />
                              <span className='font-mono font-semibold text-sm tracking-tight text-foreground truncate'>
                                {snItem.serial}
                              </span>
                            </div>
                            <div className='text-xs text-muted-foreground truncate mt-0.5'>
                              {snItem.productName}
                            </div>
                            <div className='flex items-center gap-1.5 mt-1'>
                              <span className='text-[10px] font-mono text-muted-foreground'>
                                {snItem.sku}
                              </span>
                              <Badge variant='outline' className='text-[9px] px-1 py-0 capitalize'>
                                {snItem.condition}
                              </Badge>
                            </div>
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 opacity-70 group-hover:opacity-100'
                                  onClick={() => handleCopy(snItem.serial, `sn-${idx}`, `Serial ${snItem.serial}`)}
                                >
                                  {copiedKey === `sn-${idx}` ? (
                                    <Check className='h-3.5 w-3.5 text-emerald-600' />
                                  ) : (
                                    <Copy className='h-3.5 w-3.5' />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('common.copy', 'Copy Serial')}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* TAB 3: Audit & Workflow */}
              <TabsContent value='audit' className='flex-1 flex flex-col min-h-0 m-0'>
                <ScrollArea className='flex-1 pr-3'>
                  <div className='space-y-4'>
                    {/* Stepper Progression */}
                    <Card className='p-4 border-border bg-card shadow-2xs'>
                      <div className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5'>
                        <History className='h-4 w-4 text-primary' />
                        <span>{t('goodsReceipts.lifecycleTimeline', { defaultValue: 'Document Lifecycle Timeline' })}</span>
                      </div>
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                        {/* Step 1: Draft Creation */}
                        <div className='flex items-start gap-3 p-3 rounded-lg border bg-muted/10'>
                          <div className='h-7 w-7 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs'>
                            1
                          </div>
                          <div>
                            <div className='text-xs font-semibold text-foreground'>
                              {t('goodsReceipts.draftCreated', { defaultValue: 'Receipt Initiated' })}
                            </div>
                            <div className='text-[11px] text-muted-foreground mt-0.5'>
                              {new Date(receipt.received_date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className='text-[10px] text-primary font-medium mt-1'>
                              {poDisplay}
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Quality Inspection */}
                        <div className='flex items-start gap-3 p-3 rounded-lg border bg-muted/10'>
                          <div className='h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs'>
                            2
                          </div>
                          <div>
                            <div className='text-xs font-semibold text-foreground'>
                              {t('goodsReceipts.qualityInspected', { defaultValue: 'Inspection & Serials' })}
                            </div>
                            <div className='text-[11px] text-muted-foreground mt-0.5'>
                              {totalAccepted} {t('goodsReceipts.acceptedQty', 'accepted')}, {totalRejected} {t('goodsReceipts.rejectedQty', 'rejected')}
                            </div>
                            <div className='text-[10px] text-emerald-600 font-medium mt-1'>
                              {acceptanceRate}% {t('goodsReceipts.passRate', 'passed')}
                            </div>
                          </div>
                        </div>

                        {/* Step 3: Stock Ledger Update */}
                        <div className={`flex items-start gap-3 p-3 rounded-lg border ${isPosted ? 'bg-emerald-500/5 border-emerald-500/30' : isCancelled ? 'bg-rose-500/5 border-rose-500/30' : 'bg-muted/10'}`}>
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${isPosted ? 'bg-emerald-500/20 text-emerald-600' : isCancelled ? 'bg-rose-500/20 text-rose-600' : 'bg-muted text-muted-foreground'}`}>
                            3
                          </div>
                          <div>
                            <div className='text-xs font-semibold text-foreground'>
                              {isPosted
                                ? t('goodsReceipts.stockPosted', { defaultValue: 'Inventory Movements Posted' })
                                : isCancelled
                                  ? t('goodsReceipts.status.cancelled', { defaultValue: 'Receipt Cancelled' })
                                  : t('goodsReceipts.pendingPost', { defaultValue: 'Pending Warehouse Posting' })}
                            </div>
                            <div className='text-[11px] text-muted-foreground mt-0.5'>
                              {isPosted && receipt.posted_by_user?.email
                                ? `${t('goodsReceipts.columns.postedBy', 'Posted by')} ${receipt.posted_by_user.email}`
                                : isDraft
                                  ? t('goodsReceipts.draftNotice', 'Stock balances have not yet increased')
                                  : 'No stock movements'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Metadata & Reference Cards */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {/* Supplier Card */}
                      <Card className='p-4 border-border shadow-2xs'>
                        <div className='flex items-center justify-between pb-2 border-b mb-3'>
                          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                            <Truck className='h-4 w-4 text-primary' />
                            {t('goodsReceipts.columns.supplier', { defaultValue: 'Supplier Reference' })}
                          </span>
                          {supplierCode && (
                            <Badge variant='outline' className='font-mono text-[10px]'>
                              {supplierCode}
                            </Badge>
                          )}
                        </div>
                        <div className='space-y-1.5 text-xs'>
                          <div className='font-semibold text-sm text-foreground'>{supplierDisplay}</div>
                          <div className='text-muted-foreground flex items-center gap-1.5'>
                            <FileText className='h-3.5 w-3.5' />
                            <span>{poDisplay}</span>
                          </div>
                        </div>
                      </Card>

                      {/* Destination Warehouse Card */}
                      <Card className='p-4 border-border shadow-2xs'>
                        <div className='flex items-center justify-between pb-2 border-b mb-3'>
                          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                            <Building2 className='h-4 w-4 text-primary' />
                            {t('goodsReceipts.columns.warehouse', { defaultValue: 'Destination Warehouse' })}
                          </span>
                          {receipt.warehouses?.code && (
                            <Badge variant='outline' className='font-mono text-[10px]'>
                              {receipt.warehouses.code}
                            </Badge>
                          )}
                        </div>
                        <div className='space-y-1.5 text-xs'>
                          <div className='font-semibold text-sm text-foreground'>
                            {receipt.warehouses?.name ?? '—'}
                          </div>
                          <div className='text-muted-foreground flex items-center gap-1.5'>
                            <MapPin className='h-3.5 w-3.5' />
                            <span>{t('goodsReceipts.warehouseAssigned', { defaultValue: 'Stock location assigned to warehouse ledger' })}</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Notes Box */}
                    {receipt.notes ? (
                      <Card className='p-4 border-border shadow-2xs bg-muted/20'>
                        <div className='text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5'>
                          <Info className='h-4 w-4 text-primary' />
                          <span>{t('goodsReceipts.form.notes', { defaultValue: 'Inspection & Receiving Notes' })}</span>
                        </div>
                        <p className='text-xs text-muted-foreground italic leading-relaxed pl-5.5'>
                          "{receipt.notes}"
                        </p>
                      </Card>
                    ) : null}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* 4. Action Footer */}
          <DialogFooter className='p-4 px-6 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3 print:hidden'>
            <div className='text-xs text-muted-foreground'>
              {isDraft ? (
                <span className='flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium'>
                  <Clock className='h-3.5 w-3.5' />
                  {t('goodsReceipts.draftFooterNotice', { defaultValue: 'Draft document — stock balances have not yet increased.' })}
                </span>
              ) : isPosted ? (
                <span className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium'>
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  {t('goodsReceipts.postedFooterNotice', { defaultValue: 'Stock balances successfully updated in warehouse inventory.' })}
                </span>
              ) : (
                <span className='flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium'>
                  <XCircle className='h-3.5 w-3.5' />
                  {t('goodsReceipts.cancelledFooterNotice', { defaultValue: 'Document cancelled. No stock adjustments made.' })}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2'>
              {isDraft ? (
                <Can permission='purchasing.manage'>
                  <Button
                    variant='outline'
                    onClick={() => setConfirmCancel(true)}
                    disabled={cancelReceipt.isPending}
                    className='text-destructive hover:bg-destructive/10'
                  >
                    <XCircle className='h-4 w-4 me-1.5' />
                    {t('goodsReceipts.cancelReceipt', { defaultValue: 'Cancel receipt' })}
                  </Button>
                  <Button
                    onClick={() => setConfirmPost(true)}
                    disabled={postReceipt.isPending}
                    className='gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  >
                    <CheckCircle2 className='h-4 w-4 me-1.5' />
                    {t('goodsReceipts.postReceipt', { defaultValue: 'Post receipt' })}
                  </Button>
                </Can>
              ) : (
                <Button variant='outline' onClick={() => onOpenChange(false)}>
                  {t('goodsReceipts.form.cancel', { defaultValue: 'Close' })}
                </Button>
              )}
            </div>
          </DialogFooter>

          {/* 5. Enterprise Printable GRN Slip (Rendered exclusively in print mode) */}
          <div className='print-only p-8 text-black bg-white'>
            {/* GRN Slip Document Header */}
            <div className='flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6'>
              <div>
                <h1 className='text-2xl font-bold tracking-tight text-slate-900 uppercase'>
                  Goods Receipt Note (GRN)
                </h1>
                <p className='text-xs text-slate-500 font-mono mt-1'>
                  Official Warehouse Inbound Receiving Voucher
                </p>
              </div>
              <div className='text-right'>
                <div className='text-lg font-bold font-mono text-slate-900'>
                  {receipt.receipt_number}
                </div>
                <div className='text-xs font-semibold text-slate-600 uppercase mt-0.5'>
                  Status: {receipt.status.toUpperCase()}
                </div>
                <div className='text-xs text-slate-500 mt-1'>
                  Date: {new Date(receipt.received_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Entity & Logistics Details */}
            <div className='grid grid-cols-2 gap-4 border border-slate-300 rounded p-4 mb-6 text-xs bg-slate-50'>
              <div>
                <span className='font-bold text-slate-700 block uppercase mb-1'>Supplier Information</span>
                <div className='font-semibold text-slate-900'>{supplierDisplay}</div>
                {supplierCode && <div className='font-mono text-slate-600'>Code: {supplierCode}</div>}
                <div className='font-mono text-slate-600 mt-1'>Reference PO: {poDisplay}</div>
              </div>
              <div>
                <span className='font-bold text-slate-700 block uppercase mb-1'>Destination Warehouse</span>
                <div className='font-semibold text-slate-900'>{receipt.warehouses?.name ?? '—'}</div>
                {receipt.warehouses?.code && <div className='font-mono text-slate-600'>Code: {receipt.warehouses.code}</div>}
                <div className='text-slate-600 mt-1'>
                  Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Print Summary Metrics */}
            <div className='grid grid-cols-4 gap-3 mb-6 text-xs'>
              <div className='border border-slate-300 rounded p-2 text-center'>
                <span className='text-slate-500 block'>Units Received</span>
                <strong className='text-base text-slate-900'>{totalReceived}</strong>
              </div>
              <div className='border border-slate-300 rounded p-2 text-center'>
                <span className='text-slate-500 block'>Accepted</span>
                <strong className='text-base text-emerald-700'>{totalAccepted} ({acceptanceRate}%)</strong>
              </div>
              <div className='border border-slate-300 rounded p-2 text-center'>
                <span className='text-slate-500 block'>Rejected</span>
                <strong className='text-base text-rose-700'>{totalRejected}</strong>
              </div>
              <div className='border border-slate-300 rounded p-2 text-center'>
                <span className='text-slate-500 block'>Valuation</span>
                <strong className='text-base font-mono text-slate-900'>${totalValuation.toFixed(2)}</strong>
              </div>
            </div>

            {/* Line Items Table */}
            <table className='w-full text-xs border-collapse mb-6'>
              <thead>
                <tr className='border-b-2 border-slate-900 bg-slate-100 text-left font-bold text-slate-800'>
                  <th className='py-2 px-2'>#</th>
                  <th className='py-2 px-2'>Product / Variant</th>
                  <th className='py-2 px-2'>SKU / Barcode</th>
                  <th className='py-2 px-2 text-center'>Condition</th>
                  <th className='py-2 px-2 text-right'>Rec</th>
                  <th className='py-2 px-2 text-right'>Acc</th>
                  <th className='py-2 px-2 text-right'>Rej</th>
                  <th className='py-2 px-2 text-right'>Unit Cost</th>
                  <th className='py-2 px-2 text-right'>Total</th>
                  <th className='py-2 px-2'>Batch / Expiry</th>
                  <th className='py-2 px-2'>Location</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const pName = it.product_variants?.products?.name ?? it.product_variants?.name ?? '—'
                  const sku = it.product_variants?.sku ?? '—'
                  const barcode = it.product_variants?.barcode ?? ''
                  const rec = Number(it.qty_received) || 0
                  const acc = Number(it.accepted_qty ?? it.qty_received) || 0
                  const rej = Number(it.rejected_qty) || 0
                  const cost = Number(it.unit_cost) || 0
                  const batch = it.product_batches?.batch_number ?? it.batch_number ?? '—'
                  const expiry = it.product_batches?.expiry_date || it.expiry_date
                  const loc = it.warehouse_locations?.code || it.warehouse_locations?.name || '—'

                  return (
                    <tr key={it.id} className='border-b border-slate-200'>
                      <td className='py-2 px-2 font-mono text-slate-500'>{idx + 1}</td>
                      <td className='py-2 px-2 font-semibold text-slate-900'>{pName}</td>
                      <td className='py-2 px-2 font-mono text-slate-700'>
                        {sku}
                        {barcode && <div className='text-[10px] text-slate-500'>{barcode}</div>}
                      </td>
                      <td className='py-2 px-2 text-center capitalize'>{it.condition ?? 'good'}</td>
                      <td className='py-2 px-2 text-right font-medium'>{rec}</td>
                      <td className='py-2 px-2 text-right text-emerald-700 font-semibold'>{acc}</td>
                      <td className='py-2 px-2 text-right text-rose-700'>{rej}</td>
                      <td className='py-2 px-2 text-right font-mono'>${cost.toFixed(2)}</td>
                      <td className='py-2 px-2 text-right font-mono font-semibold'>${(acc * cost).toFixed(2)}</td>
                      <td className='py-2 px-2 text-[11px] font-mono'>
                        {batch}
                        {expiry && <div className='text-[10px] text-slate-500'>{new Date(expiry).toLocaleDateString()}</div>}
                      </td>
                      <td className='py-2 px-2'>{loc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Serials Appendix if any */}
            {allSerials.length > 0 && (
              <div className='mb-6 border-t border-slate-300 pt-4'>
                <h3 className='text-xs font-bold text-slate-800 uppercase mb-2'>
                  Serialized Units Appendix ({allSerials.length} units)
                </h3>
                <div className='flex flex-wrap gap-1.5'>
                  {allSerials.map((s, idx) => (
                    <span key={idx} className='font-mono text-[10px] border border-slate-300 bg-slate-50 rounded px-1.5 py-0.5'>
                      {s.serial} ({s.sku})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes if any */}
            {receipt.notes && (
              <div className='mb-6 border border-slate-200 rounded p-3 text-xs bg-slate-50'>
                <strong className='text-slate-700 block mb-1'>Receiving & Inspection Remarks:</strong>
                <p className='text-slate-600 italic'>{receipt.notes}</p>
              </div>
            )}

            {/* Sign-Off Authorization Boxes */}
            <div className='grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 mt-8 text-xs'>
              <div>
                <div className='font-bold text-slate-800 uppercase mb-8'>Inspected By</div>
                <div className='border-t border-dashed border-slate-400 pt-1 text-slate-500'>
                  Quality Inspector Signature / Date
                </div>
              </div>
              <div>
                <div className='font-bold text-slate-800 uppercase mb-8'>Received By</div>
                <div className='border-t border-dashed border-slate-400 pt-1 text-slate-500'>
                  Storekeeper / Receiving Agent / Date
                </div>
              </div>
              <div>
                <div className='font-bold text-slate-800 uppercase mb-8'>Authorized By</div>
                <div className='border-t border-dashed border-slate-400 pt-1 text-slate-500'>
                  Warehouse Manager / Date
                </div>
              </div>
            </div>
          </div>
        </DialogContent>

        {/* Embedded Print CSS */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #goods-receipt-printable-document,
            #goods-receipt-printable-document * {
              visibility: visible !important;
            }
            #goods-receipt-printable-document {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              display: block !important;
              overflow: visible !important;
              max-height: none !important;
              border: none !important;
              box-shadow: none !important;
            }
            .print\\:hidden,
            [data-slot="dialog-overlay"],
            [data-slot="dialog-close"] {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
          }
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmPost}
        onOpenChange={setConfirmPost}
        title={t('goodsReceipts.dialog.postTitle', { defaultValue: 'Post this receipt?' })}
        desc={t('goodsReceipts.dialog.postDesc', {
          defaultValue:
            'Stock balances will be increased and inventory movements recorded. This cannot be undone.',
        })}
        confirmText={t('goodsReceipts.postReceipt', { defaultValue: 'Post' })}
        cancelBtnText={t('goodsReceipts.form.cancel', { defaultValue: 'Cancel' })}
        isLoading={postReceipt.isPending}
        handleConfirm={handlePost}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        destructive
        title={t('goodsReceipts.dialog.cancelTitle', { defaultValue: 'Cancel this receipt?' })}
        desc={t('goodsReceipts.dialog.cancelDesc', {
          defaultValue: 'The draft goods receipt will be marked cancelled.',
        })}
        confirmText={t('goodsReceipts.cancelReceipt', { defaultValue: 'Cancel receipt' })}
        cancelBtnText={t('goodsReceipts.form.cancel', { defaultValue: 'Keep draft' })}
        isLoading={cancelReceipt.isPending}
        handleConfirm={handleCancel}
      />
    </>
  )
}
