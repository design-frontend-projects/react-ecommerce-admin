import { useState } from 'react'
import {
  Layers,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Tag,
  Coins,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  useStorePriceLists,
  usePriceList,
  useAssignStorePriceList,
  useRemoveStorePriceList,
} from '@/features/price-list/hooks/use-price-list'
import { useStoresContext } from './stores-provider'

export function StorePriceListsDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useStoresContext()
  const isOpen = open === 'priceLists' && !!currentRow

  const storeId = currentRow?.store_id as string
  const storeName = currentRow?.name as string

  const { data: assignments = [], isLoading } = useStorePriceLists(
    isOpen ? storeId : undefined
  )
  const { data: allPriceLists = [] } = usePriceList()

  const assignMutation = useAssignStorePriceList()
  const removeMutation = useRemoveStorePriceList()

  const [isAdding, setIsAdding] = useState(false)
  const [selectedPriceListId, setSelectedPriceListId] = useState('')
  const [priority, setPriority] = useState(100)
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')

  if (!isOpen) return null

  // Filter out price lists already assigned to this store directly
  const assignedListIds = new Set(assignments.map((a: any) => a.price_list_id))
  const availablePriceLists = allPriceLists.filter(
    (pl: any) => !assignedListIds.has(pl.id)
  )

  const handleAssign = async () => {
    if (!selectedPriceListId) {
      toast.error(
        t('stores.priceLists.selectRequired', {
          defaultValue: 'Please select a price list to assign.',
        })
      )
      return
    }

    try {
      await assignMutation.mutateAsync({
        storeId,
        priceListId: selectedPriceListId,
        priority: Number(priority) || 100,
        validFrom: validFrom || null,
        validTo: validTo || null,
      })
      toast.success(
        t('stores.priceLists.assignSuccess', {
          defaultValue: 'Price list assigned to store successfully.',
        })
      )
      setIsAdding(false)
      setSelectedPriceListId('')
      setPriority(100)
      setValidFrom('')
      setValidTo('')
    } catch {
      toast.error(
        t('stores.priceLists.assignError', {
          defaultValue: 'Failed to assign price list.',
        })
      )
    }
  }

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeMutation.mutateAsync({
        assignmentId,
        storeId,
      })
      toast.success(
        t('stores.priceLists.removeSuccess', {
          defaultValue: 'Price list unassigned from store.',
        })
      )
    } catch {
      toast.error(
        t('stores.priceLists.removeError', {
          defaultValue: 'Failed to unassign price list.',
        })
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && setOpen(null)}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <div className='flex items-center justify-between gap-2 pr-6'>
            <DialogTitle className='flex items-center gap-2 text-xl'>
              <Layers className='h-5 w-5 text-primary' />
              {t('stores.priceLists.dialogTitle', {
                defaultValue: 'Assigned Price Lists',
              })}{' '}
              — <span className='text-muted-foreground'>{storeName}</span>
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('stores.priceLists.dialogDescription', {
              defaultValue:
                'Manage which price lists and sales pricing tiers apply to sales made at this store location.',
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Quick KPI Bar */}
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 py-2'>
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground flex items-center gap-1'>
              <Tag className='h-3.5 w-3.5 text-primary' />
              {t('stores.priceLists.activeCount', { defaultValue: 'Assigned Lists' })}
            </div>
            <div className='text-xl font-bold mt-1'>{assignments.length}</div>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='text-xs text-muted-foreground flex items-center gap-1'>
              <Sparkles className='h-3.5 w-3.5 text-amber-500' />
              {t('stores.priceLists.topPriority', { defaultValue: 'Highest Precedence' })}
            </div>
            <div className='text-xl font-bold mt-1 text-amber-600 dark:text-amber-400'>
              {assignments.length > 0 ? `P:${assignments[0].priority ?? 100}` : '—'}
            </div>
          </div>
          <div className='col-span-2 sm:col-span-1 rounded-lg border bg-muted/30 p-3 flex items-center justify-between'>
            <div>
              <div className='text-xs text-muted-foreground'>
                {t('stores.priceLists.status', { defaultValue: 'Status' })}
              </div>
              <div className='text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1'>
                <CheckCircle2 className='h-3.5 w-3.5' />
                {t('stores.priceLists.readyToSell', { defaultValue: 'Ready To Sell' })}
              </div>
            </div>
            {!isAdding && (
              <Button
                size='sm'
                onClick={() => setIsAdding(true)}
                className='h-8 gap-1'
              >
                <Plus className='h-3.5 w-3.5' />
                {t('stores.priceLists.assignButton', { defaultValue: 'Assign Price List' })}
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Add Assignment Form */}
        {isAdding && (
          <div className='rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='font-semibold text-sm flex items-center gap-1.5'>
                <Plus className='h-4 w-4 text-primary' />
                {t('stores.priceLists.newAssignment', {
                  defaultValue: 'Assign New Price List to Store',
                })}
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-xs'
                onClick={() => setIsAdding(false)}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {/* Select Price List */}
              <div className='space-y-1.5 sm:col-span-2'>
                <Label className='text-xs'>
                  {t('stores.priceLists.selectPriceList', {
                    defaultValue: 'Price List',
                  })}
                </Label>
                <Select
                  value={selectedPriceListId}
                  onValueChange={setSelectedPriceListId}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue
                      placeholder={t('stores.priceLists.selectPlaceholder', {
                        defaultValue: 'Choose active price list...',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePriceLists.map((pl: any) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name || pl.code} ({pl.code || 'NO CODE'})
                        {pl.is_default ? ' ★ Default' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className='space-y-1.5'>
                <Label className='text-xs'>
                  {t('stores.priceLists.priorityLabel', {
                    defaultValue: 'Priority (Lower = Higher Precedence)',
                  })}
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min={0}
                    max={999}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className='h-9 font-mono w-28'
                  />
                  <Badge variant='outline' className='text-[11px] font-normal'>
                    {priority <= 15
                      ? '⚡ Promo/Flash'
                      : priority <= 35
                      ? '⭐ VIP Tier'
                      : priority <= 70
                      ? '🏢 Wholesale'
                      : '🏷️ Retail Standard'}
                  </Badge>
                </div>
              </div>

              {/* Date Validity Window */}
              <div className='space-y-1.5'>
                <Label className='text-xs'>
                  {t('stores.priceLists.validity', {
                    defaultValue: 'Valid Window (Optional)',
                  })}
                </Label>
                <div className='flex items-center gap-1.5'>
                  <Input
                    type='date'
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className='h-9 text-xs'
                    placeholder='From'
                  />
                  <span className='text-xs text-muted-foreground'>→</span>
                  <Input
                    type='date'
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className='h-9 text-xs'
                    placeholder='To'
                  />
                </div>
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsAdding(false)}
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button
                size='sm'
                onClick={handleAssign}
                disabled={assignMutation.isPending || !selectedPriceListId}
              >
                {t('stores.priceLists.confirmAssign', {
                  defaultValue: 'Confirm Assignment',
                })}
              </Button>
            </div>
          </div>
        )}

        {/* Assignments Table */}
        <div className='rounded-lg border overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/40'>
              <TableRow>
                <TableHead className='w-[40%]'>
                  {t('stores.priceLists.colPriceList', { defaultValue: 'Price List' })}
                </TableHead>
                <TableHead className='w-[20%]'>
                  {t('stores.priceLists.colPriority', { defaultValue: 'Priority' })}
                </TableHead>
                <TableHead className='w-[25%]'>
                  {t('stores.priceLists.colValidity', { defaultValue: 'Validity' })}
                </TableHead>
                <TableHead className='w-[15%] text-right'>
                  {t('common.actions', { defaultValue: 'Actions' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-center py-6 text-muted-foreground'>
                    {t('common.loading', { defaultValue: 'Loading assigned price lists...' })}
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-center py-8 text-muted-foreground'>
                    <Coins className='h-8 w-8 mx-auto mb-2 text-muted-foreground/50' />
                    {t('stores.priceLists.emptyState', {
                      defaultValue:
                        'No specific price lists assigned to this store. The tenant global default price list will be used for sales.',
                    })}
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((item: any) => {
                  const pl = item.price_list
                  const isTopPriority = assignments[0]?.id === item.id

                  return (
                    <TableRow key={item.id} className={isTopPriority ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className='font-medium text-sm flex items-center gap-1.5'>
                          {pl?.name || 'Unnamed Price List'}
                          {isTopPriority && (
                            <Badge
                              variant='default'
                              className='text-[10px] py-0 px-1.5 bg-primary/90'
                            >
                              Active #1
                            </Badge>
                          )}
                          {item.is_default && (
                            <Badge
                              variant='outline'
                              className='text-[10px] py-0 px-1 text-amber-600 border-amber-400'
                            >
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className='text-xs text-muted-foreground font-mono'>
                          {pl?.code || pl?.id?.slice(0, 8)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='flex items-center gap-1.5'>
                          <Badge variant='outline' className='font-mono text-xs'>
                            {item.priority ?? 100}
                          </Badge>
                          <span className='text-[11px] text-muted-foreground'>
                            {(item.priority ?? 100) <= 15
                              ? 'Promo'
                              : (item.priority ?? 100) <= 35
                              ? 'VIP'
                              : (item.priority ?? 100) <= 70
                              ? 'B2B'
                              : 'Standard'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='text-xs font-mono text-muted-foreground flex items-center gap-1'>
                          <Calendar className='h-3 w-3' />
                          {item.valid_from || item.valid_to ? (
                            `${item.valid_from?.slice(0, 10) || 'Any'} → ${item.valid_to?.slice(0, 10) || 'Any'}`
                          ) : (
                            <span className='text-muted-foreground/60'>Always Valid</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                          onClick={() => handleRemove(item.id)}
                          disabled={removeMutation.isPending}
                          title={t('stores.priceLists.unassign', { defaultValue: 'Unassign from store' })}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className='pt-2'>
          <Button variant='outline' onClick={() => setOpen(null)}>
            {t('common.close', { defaultValue: 'Close' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
