import React, { useState } from 'react'
import { Barcode, Search, CheckCircle2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

interface CountSheetProps {
  items: CountItemRow[]
  isBlind?: boolean
  isCounting: boolean
  entries: Record<string, string>
  onEntryChange: (itemId: string, value: string) => void
  onSave: () => void
  isSaving: boolean
}

export function CountSheet({
  items,
  isBlind = false,
  isCounting,
  entries,
  onEntryChange,
  onSave,
  isSaving,
}: CountSheetProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')

  const filteredItems = items.filter((it) => {
    const sku = it.product_variants?.sku || it.product_variant_id
    const name = it.product_variants?.products?.name || ''
    const term = searchTerm.toLowerCase()
    return sku.toLowerCase().includes(term) || name.toLowerCase().includes(term)
  })

  // Barcode rapid scan simulation: increments counted qty for scanned SKU
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    const matched = items.find(
      (it) =>
        (it.product_variants?.sku || '').toLowerCase() ===
        barcodeInput.trim().toLowerCase()
    )

    if (matched) {
      const currentVal = Number(
        entries[matched.id] ?? (matched.qty_counted !== null ? matched.qty_counted : 0)
      )
      onEntryChange(matched.id, String(currentVal + 1))
      setBarcodeInput('')
    }
  }

  const totalCountedLines = items.filter(
    (it) => entries[it.id] !== undefined || it.qty_counted !== null
  ).length

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          {/* Barcode Quick Scan */}
          {isCounting && (
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 max-w-xs">
              <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan barcode / SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-8 h-8 text-xs font-mono"
              />
            </form>
          )}

          {/* Search Filter */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Progress: <strong className="text-foreground">{totalCountedLines}/{items.length}</strong> lines
          </span>
          {isCounting && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 text-xs bg-primary"
            >
              {isSaving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              Save Progress
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="max-h-[50vh]">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Product Name</TableHead>
                {!isBlind && <TableHead className="text-xs text-end">Expected</TableHead>}
                <TableHead className="text-xs text-end">Counted Qty</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const currentVal =
                  entries[item.id] ??
                  (item.qty_counted !== null ? String(item.qty_counted) : '')
                const isEntered = currentVal !== ''

                return (
                  <TableRow key={item.id} className="text-xs">
                    <TableCell className="font-mono font-medium">
                      {item.product_variants?.sku ?? item.product_variant_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.product_variants?.products?.name ?? '—'}
                    </TableCell>
                    {!isBlind && (
                      <TableCell className="text-end font-semibold tabular-nums text-muted-foreground">
                        {item.qty_snapshot}
                      </TableCell>
                    )}
                    <TableCell className="text-end">
                      {isCounting ? (
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={currentVal}
                          onChange={(e) => onEntryChange(item.id, e.target.value)}
                          className="ms-auto h-8 w-24 text-end font-bold text-xs"
                          placeholder="0"
                        />
                      ) : (
                        <span className="font-bold tabular-nums">
                          {item.qty_counted ?? '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEntered ? (
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Counted
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
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
