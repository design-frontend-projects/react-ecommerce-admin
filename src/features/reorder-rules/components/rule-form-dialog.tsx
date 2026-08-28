import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useStoreOptions,
  useVariantOptions,
} from '@/hooks/use-inventory-lookups'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ruleInputSchema, type RuleListItem } from '../data/schema'
import { useCreateRule, useUpdateRule } from '../hooks/use-reorder-rules'
import { useSupplierOptions } from '../hooks/use-supplier-options'

const NONE = '__none__'

const toNumberOrNull = (value: string): number | null =>
  value === '' ? null : Number(value)

function RuleFormDialogBody({
  rule,
  onOpenChange,
}: {
  rule: RuleListItem | null
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = Boolean(rule)
  const [search, setSearch] = useState('')
  const [productVariantId, setProductVariantId] = useState(
    rule?.product_variants?.id ?? ''
  )
  const [storeId, setStoreId] = useState(rule?.stores?.store_id ?? '')
  const [reorderPoint, setReorderPoint] = useState(
    rule ? String(rule.reorder_point) : ''
  )
  const [minQty, setMinQty] = useState(
    rule?.min_qty !== null && rule ? String(rule.min_qty) : ''
  )
  const [maxQty, setMaxQty] = useState(
    rule?.max_qty !== null && rule ? String(rule.max_qty) : ''
  )
  const [safetyStock, setSafetyStock] = useState(
    rule ? String(rule.safety_stock) : ''
  )
  const [reorderQty, setReorderQty] = useState(
    rule?.reorder_qty !== null && rule ? String(rule.reorder_qty) : ''
  )
  const [eoq, setEoq] = useState(
    rule?.eoq !== null && rule ? String(rule.eoq) : ''
  )
  const [leadTimeDays, setLeadTimeDays] = useState(
    rule?.lead_time_days !== null && rule ? String(rule.lead_time_days) : ''
  )
  const [supplierId, setSupplierId] = useState(
    rule?.suppliers
      ? String(rule.suppliers.id ?? rule.suppliers.supplier_id)
      : NONE
  )
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)

  const { data: stores = [] } = useStoreOptions()
  const { data: variants = [] } = useVariantOptions(search)
  const { data: suppliers = [] } = useSupplierOptions()
  const createRule = useCreateRule()
  const updateRule = useUpdateRule()

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
      preferredSupplierId: supplierId === NONE ? null : supplierId,
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
                      key={supplier.id ?? supplier.supplier_id}
                      value={String(supplier.id ?? supplier.supplier_id)}
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
  )
}

export function RuleFormDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: RuleListItem | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <RuleFormDialogBody
          key={rule?.id ?? 'new'}
          rule={rule}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}
