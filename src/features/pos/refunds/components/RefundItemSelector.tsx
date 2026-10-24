import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, AlertCircle, PackageCheck } from 'lucide-react'
import type {
  RefundableInvoiceItem,
  RefundItemDraft,
  return_disposition_enum,
} from '../types'

interface RefundItemSelectorProps {
  items: RefundableInvoiceItem[]
  selectedDrafts: Map<string, RefundItemDraft>
  onDraftChange: (itemId: string, draft: RefundItemDraft | null) => void
  disabled?: boolean
}

export function RefundItemSelector({
  items,
  selectedDrafts,
  onDraftChange,
  disabled = false,
}: RefundItemSelectorProps) {
  const handleToggle = (item: RefundableInvoiceItem, checked: boolean) => {
    if (disabled || item.remainingRefundableQuantity <= 0) return

    if (!checked) {
      onDraftChange(item.salesInvoiceItemId, null)
    } else {
      const initialQty = Math.min(1, item.remainingRefundableQuantity)
      const initialRefundAmount = Number((item.effectiveUnitPrice * initialQty).toFixed(2))

      onDraftChange(item.salesInvoiceItemId, {
        salesInvoiceItemId: item.salesInvoiceItemId,
        productVariantId: item.productVariantId,
        refundQuantity: initialQty,
        disposition: 'resalable',
        reason: '',
        unitPrice: item.unitPrice,
        refundAmount: initialRefundAmount,
        skuSnapshot: item.skuSnapshot,
        productNameSnapshot: item.productNameSnapshot,
      })
    }
  }

  const handleQuantityChange = (
    item: RefundableInvoiceItem,
    newQty: number
  ) => {
    const existing = selectedDrafts.get(item.salesInvoiceItemId)
    if (!existing) return

    const clampedQty = Math.max(
      1,
      Math.min(item.remainingRefundableQuantity, newQty)
    )
    const refundAmount = Number((item.effectiveUnitPrice * clampedQty).toFixed(2))

    onDraftChange(item.salesInvoiceItemId, {
      ...existing,
      refundQuantity: clampedQty,
      refundAmount,
    })
  }

  const handleDispositionChange = (
    itemId: string,
    disposition: return_disposition_enum
  ) => {
    const existing = selectedDrafts.get(itemId)
    if (!existing) return

    onDraftChange(itemId, {
      ...existing,
      disposition,
    })
  }

  const handleReasonChange = (itemId: string, reason: string) => {
    const existing = selectedDrafts.get(itemId)
    if (!existing) return

    onDraftChange(itemId, {
      ...existing,
      reason,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        <span>Invoice Items ({items.length})</span>
        <span>Selected: {selectedDrafts.size}</span>
      </div>

      <div className="border rounded-lg divide-y bg-card overflow-hidden">
        {items.map((item) => {
          const isSelected = selectedDrafts.has(item.salesInvoiceItemId)
          const draft = selectedDrafts.get(item.salesInvoiceItemId)
          const isEligible = item.remainingRefundableQuantity > 0

          return (
            <div
              key={item.salesInvoiceItemId}
              className={`p-3.5 transition-colors ${
                !isEligible
                  ? 'opacity-60 bg-muted/20'
                  : isSelected
                  ? 'bg-primary/5'
                  : 'hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(item, !!checked)}
                  disabled={!isEligible || disabled}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {item.productNameSnapshot || 'Product Item'}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        SKU: {item.skuSnapshot || 'N/A'}{' '}
                        {item.variantNameSnapshot ? `• ${item.variantNameSnapshot}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">
                        ${item.effectiveUnitPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Original: ${item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-normal text-[11px] py-0">
                      Sold: {item.originalQuantity}
                    </Badge>
                    {item.previouslyRefundedQuantity > 0 && (
                      <Badge variant="secondary" className="font-normal text-[11px] py-0 text-amber-600 dark:text-amber-400">
                        Refunded: {item.previouslyRefundedQuantity}
                      </Badge>
                    )}
                    <Badge
                      variant={item.remainingRefundableQuantity > 0 ? 'outline' : 'destructive'}
                      className="font-normal text-[11px] py-0"
                    >
                      Eligible: {item.remainingRefundableQuantity}
                    </Badge>
                  </div>

                  {/* Quantity and Disposition controls when selected */}
                  {isSelected && draft && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4 flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleQuantityChange(item, draft.refundQuantity - 1)}
                          disabled={draft.refundQuantity <= 1 || disabled}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={item.remainingRefundableQuantity}
                          value={draft.refundQuantity}
                          onChange={(e) =>
                            handleQuantityChange(item, Number(e.target.value))
                          }
                          className="h-8 text-center text-sm font-semibold w-16"
                          disabled={disabled}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleQuantityChange(item, draft.refundQuantity + 1)}
                          disabled={
                            draft.refundQuantity >= item.remainingRefundableQuantity ||
                            disabled
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground pl-1">
                          / {item.remainingRefundableQuantity} max
                        </span>
                      </div>

                      <div className="sm:col-span-4">
                        <Select
                          value={draft.disposition}
                          onValueChange={(val) =>
                            handleDispositionChange(
                              item.salesInvoiceItemId,
                              val as return_disposition_enum
                            )
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Disposition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resalable">Resalable (Restock)</SelectItem>
                            <SelectItem value="damaged">Damaged (Loss)</SelectItem>
                            <SelectItem value="quarantine">Quarantine (Inspect)</SelectItem>
                            <SelectItem value="defective">Defective</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="scrap">Scrap</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-4 text-right">
                        <span className="text-xs text-muted-foreground block">
                          Line Refund
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${draft.refundAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="sm:col-span-12">
                        <Input
                          placeholder="Reason for return of this item (optional)..."
                          value={draft.reason ?? ''}
                          onChange={(e) =>
                            handleReasonChange(item.salesInvoiceItemId, e.target.value)
                          }
                          className="h-7 text-xs"
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
