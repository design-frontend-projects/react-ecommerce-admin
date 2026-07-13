import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { useStoreOptions, useVariantOptions } from '@/hooks/use-inventory-lookups'
import { useSupplierOptions } from '../hooks/use-supplier-options'
import { useCreateRule, useUpdateRule } from '../hooks/use-reorder-rules'
import { ruleInputSchema, type RuleListItem } from '../data/schema'

const NONE = '__none__'

const toNumberOrNull = (value: string): number | null =>
  value === '' ? null : Number(value)

export function RuleFormDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: RuleListItem | null
}) {
  const isEdit = Boolean(rule)
  const [search, setSearch] = useState('')
  const [productVariantId, setProductVariantId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [reorderPoint, setReorderPoint] = useState('')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [safetyStock, setSafetyStock] = useState('')
  const [reorderQty, setReorderQty] = useState('')
  const [eoq, setEoq] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [supplierId, setSupplierId] = useState(NONE)
  const [isActive, setIsActive] = useState(true)

  const { data: stores = [] } = useStoreOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const { data: suppliers = [] } = useSupplierOptions()
  const createRule = useCreateRule()
  const updateRule = useUpdateRule()

  useEffect(() => {
    if (open) {
      setSearch('')
      setProductVariantId(rule?.product_variants?.id ?? '')
      setStoreId(rule?.stores?.store_id ?? '')
      setReorderPoint(rule ? String(rule.reorder_point) : '')
      setMinQty(rule?.min_qty !== null && rule ? String(rule.min_qty) : '')
      setMaxQty(rule?.max_qty !== null && rule ? String(rule.max_qty) : '')
      setSafetyStock(rule ? String(rule.safety_stock) : '')
      setReorderQty(
        rule?.reorder_qty !== null && rule ? String(rule.reorder_qty) : ''
      )
      setEoq(rule?.eoq !== null && rule ? String(rule.eoq) : '')
      setLeadTimeDays(
        rule?.lead_time_days !== null && rule ? String(rule.lead_time_days) : ''
      )
      setSupplierId(
        rule?.suppliers ? String(rule.suppliers.supplier_id) : NONE
      )
      setIsActive(rule?.is_active ?? true)
    }
  }, [open, rule])

  // Ensure the current rule's variant is selectable even when the search
  // results do not include it.
  const variantOptions = useMemo(() => {
    const current = rule?.product_variants
    if (!current || variants.some((variant) => variant.id === current.id)) {
      return variants
    }
    return [
      ...variants,
      {
        id: current.id,
        sku: current.sku,
        price: 0,
        cost_price: null,
        products: current.products
          ? { product_id: 0, name: current.products.name }
          : null,
      },
    ]
  }, [variants, rule])

  const handleSubmit = async () => {
    const parsed = ruleInputSchema.safeParse({
      productVariantId,
      storeId,
      reorderPoint: reorderPoint === '' ? undefined : Number(reorderPoint),
      minQty: toNumberOrNull(minQty),
      maxQty: toNumberOrNull(maxQty),
      safetyStock: toNumberOrNull(safetyStock),
      reorderQty: toNumberOrNull(reorderQty),
      eoq: toNumberOrNull(eoq),
      leadTimeDays: toNumberOrNull(leadTimeDays),
      preferredSupplierId: supplierId === NONE ? null : Number(supplierId),
      isActive,
    })
    if (!parsed.success) {
      toast.error('Please fix the reorder rule', {
        description: parsed.error.issues[0]?.message ?? 'Invalid input.',
      })
      return
    }
    try {
      if (isEdit && rule) {
        await updateRule.mutateAsync({ id: rule.id, input: parsed.data })
      } else {
        await createRule.mutateAsync(parsed.data)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation onError toast */
    }
  }

  const pending = createRule.isPending || updateRule.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Reorder Rule' : 'New Reorder Rule'}
          </DialogTitle>
          <DialogDescription>
            One rule per variant and store. The reorder check suggests
            replenishment when available + on-order stock falls to the reorder
            point plus safety stock.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='max-h-[60vh] pe-4'>
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <div className='flex items-center justify-between'>
                <Label>Product variant</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search SKU...'
                  className='h-8 w-40'
                />
              </div>
              <Select
                value={productVariantId}
                onValueChange={setProductVariantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select variant' />
                </SelectTrigger>
                <SelectContent>
                  {variantOptions.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.sku}
                      {variant.products?.name
                        ? ` — ${variant.products.name}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label>Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder='Select store' />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.store_id} value={store.store_id}>
                      {store.name ?? store.store_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Reorder point</Label>
                <Input
                  type='number'
                  step='any'
                  min='0'
                  value={reorderPoint}
                  onChange={(event) => setReorderPoint(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Safety stock (optional)</Label>
                <Input
                  type='number'
                  step='any'
                  min='0'
                  value={safetyStock}
                  onChange={(event) => setSafetyStock(event.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Min qty (optional)</Label>
                <Input
                  type='number'
                  step='any'
                  value={minQty}
                  onChange={(event) => setMinQty(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Max qty (optional)</Label>
                <Input
                  type='number'
                  step='any'
                  value={maxQty}
                  onChange={(event) => setMaxQty(event.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Reorder qty (optional)</Label>
                <Input
                  type='number'
                  step='any'
                  value={reorderQty}
                  onChange={(event) => setReorderQty(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>EOQ (optional)</Label>
                <Input
                  type='number'
                  step='any'
                  value={eoq}
                  onChange={(event) => setEoq(event.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label>Lead time days (optional)</Label>
                <Input
                  type='number'
                  step='1'
                  min='0'
                  value={leadTimeDays}
                  onChange={(event) => setLeadTimeDays(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Preferred supplier (optional)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder='No supplier' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem
                        key={supplier.supplier_id}
                        value={String(supplier.supplier_id)}
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEdit ? (
              <div className='flex items-center gap-2'>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? 'Saving...' : isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
