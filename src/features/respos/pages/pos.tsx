// ResPOS POS Screen - Main Point of Sale Interface
// Floor/table selection + order management
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  Loader2,
  Minus,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCreateOrder, useAddOrderItems } from '../api/mutations'
import {
  useFloors,
  useTables,
  useMenuCategories,
  useMenuItemsWithDetails,
  useActiveOrderByTable,
} from '../api/queries'
import { CheckoutDialog } from '../components/checkout-dialog'
import { TABLE_STATUS_COLORS } from '../constants'
import { useResposAuth } from '../hooks'
import { formatCurrency } from '../lib/formatters'
import type {
  ResTable,
  ResMenuItemWithDetails,
  ResItemVariant,
  CartItem,
  ResOrderWithDetails,
} from '../types'

export function POSScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [variantDialogItem, setVariantDialogItem] =
    useState<ResMenuItemWithDetails | null>(null)

  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { data: categories, isLoading: categoriesLoading } = useMenuCategories()
  const { data: menuItems, isLoading: itemsLoading } = useMenuItemsWithDetails()

  const {
    selectedFloorId,
    selectedTable,
    cart,
    isSidebarOpen,
    toggleSidebar,
    setSelectedFloorId,
    setSelectedTable,
    addToCart,
    clearCart,
  } = useResposStore()

  // Fetch active order for selected table (if any)
  const { data: activeOrder, isLoading: activeOrderLoading } =
    useActiveOrderByTable(selectedTable?.id || '')

  const { canAccessPayment } = useResposAuth()
  const { mutate: createOrder, isPending: isCreating } = useCreateOrder()
  const { mutate: addItems, isPending: isAdding } = useAddOrderItems()

  const isLoading =
    floorsLoading ||
    tablesLoading ||
    categoriesLoading ||
    itemsLoading ||
    activeOrderLoading

  // Handlers
  const handlePlaceOrder = () => {
    if (!selectedTable || cart.items.length === 0) return

    const orderItems = cart.items.map((item) => ({
      item_id: item.item.id,
      variant_id: item.variant?.id,
      quantity: item.quantity,
      unit_price: item.lineTotal / item.quantity,
      properties: item.selectedProperties,
      notes: item.notes,
    }))

    if (activeOrder) {
      addItems(
        { orderId: activeOrder.id, items: orderItems },
        {
          onSuccess: () => {
            toast.success('Order updated')
            clearCart()
          },
          onError: () => toast.error('Failed to update order'),
        }
      )
    } else {
      createOrder(
        { tableId: selectedTable.id, items: orderItems },
        {
          onSuccess: () => {
            toast.success('Order placed')
            clearCart()
          },
          onError: () => toast.error('Failed to place order'),
        }
      )
    }
  }

  const handleMenuItemClick = (item: ResMenuItemWithDetails) => {
    if (item.variants && item.variants.length > 0) {
      setVariantDialogItem(item)
    } else {
      addToCart(item, undefined, [])
    }
  }

  const handleVariantSelect = (
    item: ResMenuItemWithDetails,
    variant: ResItemVariant
  ) => {
    addToCart(item, variant, [])
    setVariantDialogItem(null)
  }

  // Filter tables by selected floor
  const floorTables =
    tables?.filter((t) => t.floor_id === selectedFloorId) ?? []

  // Filter menu items by search and category
  const filteredItems =
    menuItems?.filter((item: ResMenuItemWithDetails) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        !selectedCategory || item.category_id === selectedCategory
      return matchesSearch && matchesCategory && item.is_available
    }) ?? []

  const cartItemCount = cart.items.reduce(
    (sum, item: CartItem) => sum + item.quantity,
    0
  )

  return (
    <>
      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        order={activeOrder || null}
        onSuccess={() => {
          // refresh tables/orders
        }}
      />

      {/* Variant Selection Dialog */}
      <VariantSelectionDialog
        item={variantDialogItem}
        open={!!variantDialogItem}
        onClose={() => setVariantDialogItem(null)}
        onSelect={handleVariantSelect}
      />

      <Header>
        <div className='flex items-center gap-2'>
          <UtensilsCrossed className='h-5 w-5 text-orange-500' />
          <h1 className='text-base font-semibold sm:text-lg'>POS</h1>
          {selectedTable && (
            <Badge variant='outline' className='ml-1 sm:ml-2'>
              Table {selectedTable.table_number}
            </Badge>
          )}
        </div>
        <div className='ml-auto flex items-center gap-2 sm:gap-4'>
          {/* Cart Button (Mobile/Tablet) */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                className='relative lg:hidden'
              >
                <ShoppingCart className='h-5 w-5' />
                {cartItemCount > 0 && (
                  <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white'>
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-full p-0 sm:w-96'>
              <SheetHeader className='p-4 pb-0'>
                <SheetTitle>Current Order</SheetTitle>
              </SheetHeader>
              <OrderPanel
                activeOrder={activeOrder || null}
                onPlaceOrder={handlePlaceOrder}
                isProcessing={isCreating || isAdding}
                onCheckout={() => setIsCheckoutOpen(true)}
                canCheckout={canAccessPayment}
              />
            </SheetContent>
          </Sheet>

          {/* Sidebar Toggle (Desktop) */}
          <Button
            variant='ghost'
            size='icon'
            className='hidden lg:flex'
            onClick={toggleSidebar}
            title={
              isSidebarOpen ? 'Collapse order panel' : 'Expand order panel'
            }
          >
            {isSidebarOpen ? (
              <PanelRightClose className='h-5 w-5' />
            ) : (
              <PanelRightOpen className='h-5 w-5' />
            )}
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='p-0 lg:p-4'>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='flex h-[calc(100vh-4rem)] flex-col lg:flex-row lg:gap-4'>
            {/* Left Panel - Tables or Menu */}
            <div className='flex-1 overflow-hidden'>
              {selectedTable ? (
                /* Menu View */
                <div className='flex h-full flex-col'>
                  {/* Back Button + Search */}
                  <div className='flex items-center gap-2 border-b p-3 sm:p-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setSelectedTable(null)}
                      className='shrink-0'
                    >
                      <ChevronLeft className='mr-1 h-4 w-4' />
                      <span className='hidden sm:inline'>Back</span>
                    </Button>
                    <div className='relative flex-1'>
                      <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        placeholder='Search menu...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-9'
                      />
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <Tabs
                    value={selectedCategory ?? 'all'}
                    onValueChange={(v) =>
                      setSelectedCategory(v === 'all' ? null : v)
                    }
                    className='flex flex-1 flex-col overflow-hidden'
                  >
                    <ScrollArea className='w-full'>
                      <TabsList className='mx-3 mt-2 inline-flex w-max gap-1 sm:mx-4'>
                        <TabsTrigger value='all' className='shrink-0'>
                          All
                        </TabsTrigger>
                        {categories?.map((cat) => (
                          <TabsTrigger
                            key={cat.id}
                            value={cat.id}
                            className='shrink-0'
                          >
                            {cat.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </ScrollArea>

                    <TabsContent
                      value={selectedCategory ?? 'all'}
                      className='flex-1 overflow-auto p-3 sm:p-4'
                    >
                      <div className='grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'>
                        {filteredItems.map((item: ResMenuItemWithDetails) => (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            onAdd={() => handleMenuItemClick(item)}
                          />
                        ))}
                      </div>
                      {filteredItems.length === 0 && (
                        <div className='flex h-40 items-center justify-center text-muted-foreground'>
                          No items found
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                /* Tables View */
                <div className='flex h-full flex-col'>
                  {/* Floor Selector */}
                  <div className='border-b p-3 sm:p-4'>
                    <ScrollArea className='w-full'>
                      <div className='flex gap-2'>
                        {floors?.map((floor) => (
                          <Button
                            key={floor.id}
                            variant={
                              selectedFloorId === floor.id
                                ? 'default'
                                : 'outline'
                            }
                            size='sm'
                            onClick={() => setSelectedFloorId(floor.id)}
                            className='shrink-0'
                          >
                            {floor.name}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Tables Grid */}
                  <ScrollArea className='flex-1 p-3 sm:p-4'>
                    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5'>
                      {floorTables.map((table) => (
                        <TableCard
                          key={table.id}
                          table={table}
                          onClick={() => setSelectedTable(table)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Right Panel - Order (Desktop) — Collapsible */}
            <AnimatePresence mode='wait'>
              {isSidebarOpen && (
                <motion.div
                  key='order-panel'
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className='hidden shrink-0 overflow-hidden border-l lg:block'
                >
                  <OrderPanel
                    activeOrder={activeOrder || null}
                    onPlaceOrder={handlePlaceOrder}
                    isProcessing={isCreating || isAdding}
                    onCheckout={() => setIsCheckoutOpen(true)}
                    canCheckout={canAccessPayment}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed Sidebar Mini Bar (Desktop) */}
            {!isSidebarOpen && (
              <div className='hidden w-14 shrink-0 flex-col items-center border-l py-4 lg:flex'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='mb-4'
                  onClick={toggleSidebar}
                >
                  <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='flex flex-col items-center gap-2'>
                  <div className='relative'>
                    <ShoppingCart className='h-5 w-5 text-muted-foreground' />
                    {cartItemCount > 0 && (
                      <span className='absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white'>
                        {cartItemCount}
                      </span>
                    )}
                  </div>
                  <Separator className='my-2 w-8' />
                  <span className='text-xs font-bold text-orange-500'>
                    {formatCurrency(cart.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Main>
    </>
  )
}

// ============================================================
// Table Card Component
// ============================================================
interface TableCardProps {
  table: ResTable
  onClick: () => void
}

function TableCard({ table, onClick }: TableCardProps) {
  const statusColor = TABLE_STATUS_COLORS[table.status] || 'bg-gray-100'

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-colors sm:p-4',
        statusColor,
        table.status === 'occupied' && 'border-orange-500',
        table.status === 'reserved' && 'border-purple-500',
        table.status === 'dirty' && 'border-yellow-500',
        table.status === 'free' && 'border-green-500 hover:border-green-600'
      )}
    >
      <span className='text-base font-bold sm:text-lg'>
        {table.table_number}
      </span>
      <span className='text-[11px] text-muted-foreground sm:text-xs'>
        {table.seats} seats
      </span>
      <Badge
        variant='secondary'
        className='mt-1 text-[10px] capitalize sm:text-xs'
      >
        {table.status}
      </Badge>
    </motion.button>
  )
}

// ============================================================
// Menu Item Card Component
// ============================================================
interface MenuItemCardProps {
  item: ResMenuItemWithDetails
  onAdd: () => void
}

function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  const hasVariants = item.variants && item.variants.length > 0

  return (
    <Card
      className='group cursor-pointer transition-all hover:shadow-md active:scale-[0.98]'
      onClick={onAdd}
    >
      <CardContent className='p-2 sm:p-3'>
        {item.image_url && (
          <div className='mb-2 aspect-square overflow-hidden rounded-md'>
            <img
              src={item.image_url}
              alt={item.name}
              className='h-full w-full object-cover transition-transform group-hover:scale-105'
            />
          </div>
        )}
        <h4 className='line-clamp-2 text-sm font-medium sm:text-base'>
          {item.name}
        </h4>
        <div className='mt-1 flex items-center justify-between gap-1'>
          <p className='text-sm font-bold text-orange-500'>
            {formatCurrency(item.base_price)}
          </p>
          {hasVariants && (
            <Badge
              variant='outline'
              className='shrink-0 border-orange-200 bg-orange-50 text-[10px] text-orange-600 dark:bg-orange-950/30'
            >
              {item.variants.length} options
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Variant Selection Dialog
// ============================================================
interface VariantSelectionDialogProps {
  item: ResMenuItemWithDetails | null
  open: boolean
  onClose: () => void
  onSelect: (item: ResMenuItemWithDetails, variant: ResItemVariant) => void
}

function VariantSelectionDialog({
  item,
  open,
  onClose,
  onSelect,
}: VariantSelectionDialogProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')

  // Reset selection when item changes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setSelectedVariantId('')
    }
  }

  // Auto-select default variant when dialog opens
  const defaultVariant = item?.variants?.find((v) => v.is_default)
  const currentVariantId = selectedVariantId || defaultVariant?.id || ''

  if (!item) return null

  const selectedVariant = item.variants.find((v) => v.id === currentVariantId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-sm sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className='h-12 w-12 rounded-lg object-cover'
              />
            )}
            <div>
              <p>{item.name}</p>
              <p className='text-sm font-normal text-muted-foreground'>
                Base: {formatCurrency(item.base_price)}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Choose your preferred option below
          </DialogDescription>
        </DialogHeader>

        <div className='py-2'>
          <RadioGroup
            value={currentVariantId}
            onValueChange={setSelectedVariantId}
            className='space-y-2'
          >
            {item.variants.map((variant) => {
              const totalPrice = item.base_price + variant.price_adjustment
              return (
                <Label
                  key={variant.id}
                  htmlFor={`variant-${variant.id}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:bg-accent',
                    currentVariantId === variant.id &&
                      'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                  )}
                >
                  <RadioGroupItem
                    value={variant.id}
                    id={`variant-${variant.id}`}
                  />
                  <div className='flex-1'>
                    <p className='font-medium'>{variant.name}</p>
                    {variant.is_default && (
                      <span className='text-xs text-muted-foreground'>
                        Default
                      </span>
                    )}
                  </div>
                  <div className='text-right'>
                    <p className='font-bold text-orange-500'>
                      {formatCurrency(totalPrice)}
                    </p>
                    {variant.price_adjustment !== 0 && (
                      <p className='text-xs text-muted-foreground'>
                        {variant.price_adjustment > 0 ? '+' : ''}
                        {formatCurrency(variant.price_adjustment)}
                      </p>
                    )}
                  </div>
                </Label>
              )
            })}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedVariant) {
                onSelect(item, selectedVariant)
                setSelectedVariantId('')
              }
            }}
            disabled={!selectedVariant}
            className='bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          >
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Order Panel Component
// ============================================================
interface OrderPanelProps {
  activeOrder: ResOrderWithDetails | null
  onPlaceOrder: () => void
  isProcessing: boolean
  onCheckout: () => void
  canCheckout: boolean
}

function OrderPanel({
  activeOrder,
  onPlaceOrder,
  isProcessing,
  onCheckout,
  canCheckout,
}: OrderPanelProps) {
  const { cart, selectedTable, updateCartItemQuantity, clearCart } =
    useResposStore()

  const activeTotal = activeOrder?.total_amount || 0
  const cartTotal = cart.total
  const grandTotal = activeTotal + cartTotal

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='border-b p-3 sm:p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold'>
            {selectedTable ? `Table ${selectedTable.table_number}` : 'No Table'}
          </h3>
          {cart.items.length > 0 && (
            <Button variant='ghost' size='sm' onClick={clearCart}>
              <X className='mr-1 h-4 w-4' />
              Clear
            </Button>
          )}
        </div>
        {activeOrder && (
          <div className='mt-2 flex items-center gap-2'>
            <Badge variant='secondary'>#{activeOrder.order_number}</Badge>
            <Badge variant='outline' className='capitalize'>
              {activeOrder.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Items */}
      <ScrollArea className='flex-1 p-3 sm:p-4'>
        {/* Active Order Items */}
        {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
          <div className='mb-4 space-y-2 opacity-90'>
            <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm'>
              <span>Sent to Kitchen</span>
            </div>
            {activeOrder.items.map((item) => (
              <div
                key={item.id}
                className='flex items-start gap-2 rounded-lg border bg-muted/30 p-2 sm:gap-3 sm:p-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>
                    {item.item.name}
                  </p>
                  {item.variant && (
                    <p className='truncate text-xs text-muted-foreground'>
                      {item.variant.name}
                    </p>
                  )}
                  <p className='text-sm font-semibold'>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </p>
                </div>
                <div className='flex shrink-0 items-center'>
                  <span className='text-sm font-bold'>x{item.quantity}</span>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Cart Items */}
        {cart.items.length === 0 && !activeOrder ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <ShoppingCart className='mb-3 h-10 w-10 text-muted-foreground/40' />
            <p className='text-sm text-muted-foreground'>
              {!selectedTable ? 'Select a table first' : 'No items in order'}
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            {cart.items.length > 0 && (
              <p className='mb-1 text-xs font-medium text-muted-foreground'>
                New Items
              </p>
            )}
            {cart.items.map((item: CartItem, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-start gap-2 rounded-lg border p-2 shadow-sm sm:gap-3 sm:p-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>
                    {item.item.name}
                  </p>
                  {item.variant && (
                    <p className='truncate text-xs text-muted-foreground'>
                      {item.variant.name}
                    </p>
                  )}
                  <p className='text-sm text-orange-500'>
                    {formatCurrency(item.lineTotal)}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-6 w-6 sm:h-7 sm:w-7'
                    onClick={(e) => {
                      e.stopPropagation()
                      updateCartItemQuantity(index, item.quantity - 1)
                    }}
                  >
                    <Minus className='h-3 w-3' />
                  </Button>
                  <span className='w-5 text-center text-sm sm:w-6'>
                    {item.quantity}
                  </span>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-6 w-6 sm:h-7 sm:w-7'
                    onClick={(e) => {
                      e.stopPropagation()
                      updateCartItemQuantity(index, item.quantity + 1)
                    }}
                  >
                    <Plus className='h-3 w-3' />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals */}
      <div className='space-y-2 border-t bg-muted/10 p-3 sm:space-y-3 sm:p-4'>
        {cart.total > 0 && (
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>New Items</span>
            <span>{formatCurrency(cart.total)}</span>
          </div>
        )}
        <div className='flex justify-between text-base font-bold sm:text-lg'>
          <span>Total</span>
          <span className='text-orange-500'>{formatCurrency(grandTotal)}</span>
        </div>

        <div className='grid gap-2 pt-1 sm:pt-2'>
          <Button
            onClick={onPlaceOrder}
            disabled={isProcessing || !selectedTable || cart.items.length === 0}
            className='w-full bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
          >
            {isProcessing ? (
              <Loader2 className='animate-spin' />
            ) : activeOrder ? (
              'Update Order'
            ) : (
              'Place Order'
            )}
          </Button>

          {activeOrder && canCheckout && (
            <Button
              variant='secondary'
              onClick={onCheckout}
              disabled={isProcessing}
              className='w-full border-orange-200 bg-orange-100 text-orange-900 hover:bg-orange-200'
            >
              Checkout & Pay
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
