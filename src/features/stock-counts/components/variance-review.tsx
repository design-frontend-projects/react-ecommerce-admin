import { TrendingDown, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CountItemRow } from '../data/schema'

interface VarianceReviewProps {
  items: CountItemRow[]
}

export function VarianceReview({ items }: VarianceReviewProps) {
  let matchedCount = 0
  let shrinkageCount = 0
  let surplusCount = 0
  let totalShrinkageUnits = 0
  let totalSurplusUnits = 0

  const processedItems = items.map((it) => {
    const counted = it.qty_counted !== null ? Number(it.qty_counted) : null
    const snapshot = Number(it.qty_snapshot || 0)
    const variance = counted !== null ? counted - snapshot : null

    if (variance === 0) {
      matchedCount++
    } else if (variance !== null && variance < 0) {
      shrinkageCount++
      totalShrinkageUnits += Math.abs(variance)
    } else if (variance !== null && variance > 0) {
      surplusCount++
      totalSurplusUnits += variance
    }

    return {
      ...it,
      variance,
    }
  })

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-emerald-200/60 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Exact Matches</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {matchedCount} / {items.length} Lines
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200/60 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Shrinkage / Missing</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                -{totalShrinkageUnits} Units ({shrinkageCount} Lines)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/60 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Surplus / Overage</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                +{totalSurplusUnits} Units ({surplusCount} Lines)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ABAC Segregation of Duties Notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-xs">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Segregation of Duties Compliance (ABAC)
          </p>
          <p className="text-amber-800/80 dark:text-amber-300/80">
            To prevent fraud, the user who performed the physical counting cannot approve or post this count variance into the live stock ledger.
          </p>
        </div>
      </div>

      {/* Variance Matrix Table */}
      <ScrollArea className="max-h-[45vh]">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Product Name</TableHead>
                <TableHead className="text-xs text-end">Expected</TableHead>
                <TableHead className="text-xs text-end">Counted</TableHead>
                <TableHead className="text-xs text-end">Variance (Δ)</TableHead>
                <TableHead className="text-xs text-center">Variance Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedItems.map((item) => {
                const variance = item.variance
                let statusBadge = (
                  <span className="text-[11px] text-muted-foreground font-medium">Exact Match</span>
                )
                if (variance !== null && variance < 0) {
                  statusBadge = (
                    <span className="text-[11px] text-rose-600 font-bold">Shrinkage</span>
                  )
                } else if (variance !== null && variance > 0) {
                  statusBadge = (
                    <span className="text-[11px] text-blue-600 font-bold">Surplus</span>
                  )
                }

                return (
                  <TableRow key={item.id} className="text-xs">
                    <TableCell className="font-mono font-medium">
                      {item.product_variants?.sku ?? item.product_variant_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.product_variants?.products?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">
                      {item.qty_snapshot}
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">
                      {item.qty_counted ?? '—'}
                    </TableCell>
                    <TableCell
                      className={
                        variance !== null && variance < 0
                          ? 'text-end font-bold tabular-nums text-rose-600'
                          : variance !== null && variance > 0
                          ? 'text-end font-bold tabular-nums text-emerald-600'
                          : 'text-end tabular-nums text-muted-foreground'
                      }
                    >
                      {variance !== null ? `${variance > 0 ? '+' : ''}${variance}` : '—'}
                    </TableCell>
                    <TableCell className="text-center">{statusBadge}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  )
}
