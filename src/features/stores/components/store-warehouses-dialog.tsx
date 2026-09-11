import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  Clock,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Truck,
  Undo2,
  Warehouse,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import type { StoreWarehouseItem } from '../data/store-warehouses-schema'
import {
  useRemoveStoreWarehouse,
  useReorderStoreWarehouses,
  useStoreWarehouses,
  useUpdateStoreWarehouse,
} from '../hooks/use-store-warehouses'
import { StoreWarehouseDialog } from './store-warehouse-dialog'
import { useStoresContext } from './stores-provider'

export function StoreWarehousesDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useStoresContext()
  const isOpen = open === 'warehouses' && !!currentRow

  const storeId = currentRow?.store_id as string
  const storeName = currentRow?.name as string

  const { data: warehouses = [], isLoading } = useStoreWarehouses(
    isOpen ? storeId : undefined
  )
  const updateMutation = useUpdateStoreWarehouse()
  const reorderMutation = useReorderStoreWarehouses()
  const removeMutation = useRemoveStoreWarehouse()

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StoreWarehouseItem | null>(
    null
  )
  const [deletingItem, setDeletingItem] = useState<StoreWarehouseItem | null>(
    null
  )

  if (!isOpen) return null

  const defaultWarehouse = warehouses.find((w) => w.is_default)
  const avgLeadTime =
    warehouses.length > 0
      ? (
          warehouses.reduce((acc, w) => acc + (w.lead_time_days ?? 0), 0) /
          warehouses.length
        ).toFixed(1)
      : '0'

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= warehouses.length) return

    const newOrder = [...warehouses]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(targetIndex, 0, moved)

    const orderedIds = newOrder.map((w) => w.id)
    await reorderMutation.mutateAsync({ storeId, orderedIds })
  }

  const handleSetDefault = async (item: StoreWarehouseItem) => {
    await updateMutation.mutateAsync({
      id: item.id,
      storeId,
      warehouseId: item.warehouse_id,
      input: { isDefault: true },
    })
  }

  const handleToggleActive = async (item: StoreWarehouseItem) => {
    await updateMutation.mutateAsync({
      id: item.id,
      storeId,
      warehouseId: item.warehouse_id,
      input: { isActive: !item.is_active },
    })
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    await removeMutation.mutateAsync({
      id: deletingItem.id,
      storeId,
      warehouseId: deletingItem.warehouse_id,
    })
    setDeletingItem(null)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !val && setOpen(null)}>
        <DialogContent className='flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0'>
          {/* Header */}
          <div className='relative border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6'>
            <DialogHeader className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20'>
                    <Warehouse className='h-6 w-6' />
                  </div>
                  <div>
                    <DialogTitle className='text-xl font-bold'>
                      {t(
                        'stores.warehouses.title',
                        'Warehouse & Supply Routing'
                      )}
                    </DialogTitle>
                    <DialogDescription className='text-xs'>
                      {t('stores.warehouses.description', {
                        store: storeName,
                        defaultValue: `Manage fulfillment hubs, replenishment priority, and return depots for ${storeName}`,
                      })}
                    </DialogDescription>
                  </div>
                </div>

                <Button
                  size='sm'
                  onClick={() => {
                    setEditingItem(null)
                    setLinkDialogOpen(true)
                  }}
                  className='gap-1.5'
                >
                  <Plus className='h-4 w-4' />
                  {t('stores.warehouses.linkNew', 'Link Warehouse')}
                </Button>
              </div>
            </DialogHeader>

            {/* Quick KPI Bar */}
            <div className='grid grid-cols-3 gap-3 pt-4'>
              <div className='rounded-lg border bg-background/80 p-2.5 backdrop-blur'>
                <span className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
                  {t('stores.warehouses.kpi.linkedCount', 'Linked Warehouses')}
                </span>
                <p className='mt-0.5 text-lg font-bold text-foreground'>
                  {warehouses.length}
                </p>
              </div>

              <div className='rounded-lg border bg-background/80 p-2.5 backdrop-blur'>
                <span className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
                  {t(
                    'stores.warehouses.kpi.primaryDepot',
                    'Primary Default Hub'
                  )}
                </span>
                <p className='mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-foreground'>
                  {defaultWarehouse ? (
                    <>
                      <Star className='h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500' />
                      <span className='truncate font-mono'>
                        {defaultWarehouse.warehouses?.code} -{' '}
                        {defaultWarehouse.warehouses?.name}
                      </span>
                    </>
                  ) : (
                    <span className='text-xs text-muted-foreground italic'>
                      {t(
                        'stores.warehouses.kpi.noneAssigned',
                        'No default assigned'
                      )}
                    </span>
                  )}
                </p>
              </div>

              <div className='rounded-lg border bg-background/80 p-2.5 backdrop-blur'>
                <span className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
                  {t('stores.warehouses.kpi.avgLeadTime', 'Avg Lead Time')}
                </span>
                <p className='mt-0.5 text-lg font-bold text-foreground'>
                  {avgLeadTime} {t('common.days', 'days')}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className='flex-1 space-y-4 overflow-y-auto p-6'>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
                <RefreshCw className='mb-2 h-6 w-6 animate-spin' />
                <p className='text-sm'>
                  {t('common.loading', 'Loading warehouses...')}
                </p>
              </div>
            ) : warehouses.length === 0 ? (
              /* Empty State */
              <div className='flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-14 text-center'>
                <div className='mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground'>
                  <Warehouse className='h-7 w-7 opacity-70' />
                </div>
                <h4 className='text-base font-semibold text-foreground'>
                  {t(
                    'stores.warehouses.empty.title',
                    'No Warehouses Linked Yet'
                  )}
                </h4>
                <p className='mt-1 mb-5 max-w-sm text-sm text-muted-foreground'>
                  {t(
                    'stores.warehouses.empty.description',
                    'Connecting a warehouse enables inventory lookup, automated restocking transfers, and delivery dispatch for this store.'
                  )}
                </p>
                <Button
                  onClick={() => {
                    setEditingItem(null)
                    setLinkDialogOpen(true)
                  }}
                  className='gap-2'
                >
                  <Plus className='h-4 w-4' />
                  {t('stores.warehouses.empty.button', 'Link First Warehouse')}
                </Button>
              </div>
            ) : (
              /* List of Linked Warehouses */
              <div className='space-y-3'>
                <div className='flex items-center justify-between px-1 text-xs text-muted-foreground'>
                  <span className='font-semibold tracking-wider uppercase'>
                    {t(
                      'stores.warehouses.listHeader',
                      'Routing Priority Hierarchy'
                    )}
                  </span>
                  <span>
                    {t(
                      'stores.warehouses.dragHint',
                      'Higher priority hubs receive orders first'
                    )}
                  </span>
                </div>

                {warehouses.map((item, index) => {
                  const isFirst = index === 0
                  const isLast = index === warehouses.length - 1
                  const warehouse = item.warehouses

                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-xl border bg-card p-4 transition-all hover:shadow-sm ${
                        item.is_default
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/[0.03] to-transparent shadow-sm'
                          : ''
                      } ${!item.is_active ? 'bg-muted/20 opacity-60' : ''}`}
                    >
                      <div className='flex items-start justify-between gap-4'>
                        {/* Priority Rank & Warehouse Basic Info */}
                        <div className='flex items-start gap-3'>
                          <div className='flex flex-col items-center gap-1'>
                            <Badge
                              variant={item.is_default ? 'default' : 'outline'}
                              className={`px-2 py-0.5 font-mono text-xs ${
                                item.is_default
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : ''
                              }`}
                            >
                              #{item.priority}
                            </Badge>

                            {/* Reorder Up / Down Buttons */}
                            <div className='flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                              <button
                                type='button'
                                disabled={isFirst}
                                onClick={() => handleMove(index, 'up')}
                                className='p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30'
                                title='Move Up'
                              >
                                <ArrowUp className='h-3 w-3' />
                              </button>
                              <button
                                type='button'
                                disabled={isLast}
                                onClick={() => handleMove(index, 'down')}
                                className='p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30'
                                title='Move Down'
                              >
                                <ArrowDown className='h-3 w-3' />
                              </button>
                            </div>
                          </div>

                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold'>
                                {warehouse?.code ?? '—'}
                              </span>
                              <h5 className='text-base font-bold text-foreground'>
                                {warehouse?.name ??
                                  t('warehouses.unnamed', 'Unnamed Facility')}
                              </h5>

                              {item.is_default ? (
                                <Badge className='gap-1 border-amber-500/30 bg-amber-500/15 text-[11px] font-semibold text-amber-700 dark:text-amber-400'>
                                  <Star className='h-3 w-3 fill-amber-500' />
                                  {t(
                                    'stores.warehouses.primaryDefault',
                                    'Primary Default Hub'
                                  )}
                                </Badge>
                              ) : (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleSetDefault(item)}
                                  className='h-6 px-2 text-[11px] text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600'
                                >
                                  <Star className='me-1 h-3 w-3' />
                                  {t(
                                    'stores.warehouses.setAsDefault',
                                    'Make Default'
                                  )}
                                </Button>
                              )}
                            </div>

                            {/* Address & City */}
                            <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                              {warehouse?.cities?.name && (
                                <span className='flex items-center gap-1'>
                                  <MapPin className='h-3 w-3' />
                                  {warehouse.cities.name}
                                </span>
                              )}
                              {warehouse?.address && (
                                <span className='max-w-xs truncate'>
                                  {warehouse.address}
                                </span>
                              )}
                            </div>

                            {/* Operational Capabilities Chips */}
                            <div className='flex flex-wrap items-center gap-1.5 pt-1.5'>
                              {item.allow_fulfillment && (
                                <Badge
                                  variant='outline'
                                  className='gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400'
                                >
                                  <Truck className='h-3 w-3' />
                                  {t(
                                    'stores.warehouses.caps.fulfillment',
                                    'Fulfillment'
                                  )}
                                </Badge>
                              )}
                              {item.allow_replenishment && (
                                <Badge
                                  variant='outline'
                                  className='gap-1 border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-600 dark:text-blue-400'
                                >
                                  <RefreshCw className='h-3 w-3' />
                                  {t(
                                    'stores.warehouses.caps.replenish',
                                    'Replenishment'
                                  )}
                                </Badge>
                              )}
                              {item.allow_returns && (
                                <Badge
                                  variant='outline'
                                  className='gap-1 border-purple-500/20 bg-purple-500/10 text-[10px] text-purple-600 dark:text-purple-400'
                                >
                                  <Undo2 className='h-3 w-3' />
                                  {t(
                                    'stores.warehouses.caps.returns',
                                    'Returns'
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Logistics SLA, Status & Action Menu */}
                        <div className='flex shrink-0 items-center gap-4'>
                          {/* SLA Metrics */}
                          <div className='space-y-1 text-right text-xs'>
                            {item.lead_time_days !== null &&
                              item.lead_time_days !== undefined && (
                                <div className='flex items-center justify-end gap-1 text-muted-foreground'>
                                  <Clock className='h-3 w-3' />
                                  <span>
                                    {item.lead_time_days}{' '}
                                    {t('common.days', 'd')} lead time
                                  </span>
                                </div>
                              )}
                            {item.distance_km && (
                              <div className='flex items-center justify-end gap-1 text-muted-foreground'>
                                <MapPin className='h-3 w-3' />
                                <span>{Number(item.distance_km)} km</span>
                              </div>
                            )}
                            {item.transit_cost && (
                              <div className='flex items-center justify-end gap-1 text-muted-foreground'>
                                <CircleDollarSign className='h-3 w-3' />
                                <span>
                                  {Number(item.transit_cost).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Active Switch */}
                          <div className='flex flex-col items-center gap-1'>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => handleToggleActive(item)}
                              title={item.is_active ? 'Active' : 'Inactive'}
                            />
                            <span className='text-[10px] text-muted-foreground'>
                              {item.is_active
                                ? t('common.active', 'Active')
                                : t('common.paused', 'Paused')}
                            </span>
                          </div>

                          {/* More Options */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8'
                              >
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingItem(item)
                                  setLinkDialogOpen(true)
                                }}
                              >
                                <Pencil className='me-2 h-3.5 w-3.5' />
                                {t('common.edit', 'Edit Settings')}
                              </DropdownMenuItem>

                              {!item.is_default && (
                                <DropdownMenuItem
                                  onClick={() => handleSetDefault(item)}
                                >
                                  <Star className='me-2 h-3.5 w-3.5 text-amber-500' />
                                  {t(
                                    'stores.warehouses.makeDefault',
                                    'Set as Default'
                                  )}
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className='text-destructive focus:text-destructive'
                              >
                                <Trash2 className='me-2 h-3.5 w-3.5' />
                                {t(
                                  'stores.warehouses.unlink',
                                  'Unlink Warehouse'
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {item.notes && (
                        <div className='mt-2.5 rounded border-t bg-muted/20 p-2 pt-2 text-xs text-muted-foreground italic'>
                          <span className='me-1.5 font-semibold text-foreground not-italic'>
                            {t('common.notes', 'Notes')}:
                          </span>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog to Link / Edit Warehouse */}
      <StoreWarehouseDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        storeId={storeId}
        storeName={storeName}
        existingItem={editingItem}
        existingWarehouses={warehouses}
      />

      {/* Unlink Confirmation */}
      <AlertDialog
        open={Boolean(deletingItem)}
        onOpenChange={(val) => !val && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('stores.warehouses.unlinkConfirm.title', 'Unlink Warehouse?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'stores.warehouses.unlinkConfirm.description',
                `Are you sure you want to unlink ${deletingItem?.warehouses?.name ?? 'this warehouse'} from ${storeName}? Inventory queries and replenishment transfers between this pair will stop.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('stores.warehouses.unlinkConfirm.button', 'Unlink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
