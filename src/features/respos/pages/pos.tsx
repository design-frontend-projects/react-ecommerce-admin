// ResPOS POS Screen - Main Point of Sale Interface
// Floor/table selection + order management
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  LayoutGrid,
  Loader2,
  Lock,
  Search,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Header } from '@/components/layout/header'
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
import { FloorManagerView } from '../components/floor-manager-view'
import { MenuItemDetailsDialog } from '../components/menu-item-details-dialog'
import { NotificationsDropdown } from '../components/notifications-dropdown'
import { useResposAuth, useResposRealtime } from '../hooks'
import { formatCurrency } from '../lib/formatters'
import type {
  ResTable,
  ResMenuItem,
  CartItem,
  ResOrderWithDetails,
  SelectedProperty,
} from '../types'

export function POSScreen() {
  // Local State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Item Details Dialog State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isItemDetailsOpen, setIsItemDetailsOpen] = useState(false)

  // Queries
  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { data: categories, isLoading: categoriesLoading } = useMenuCategories()
  const { data: menuItems, isLoading: itemsLoading } = useMenuItemsWithDetails()

  // Store
  const {
    selectedFloorId,
    selectedTable,
    cart,
    setSelectedFloorId,
    setSelectedTable,
    addToCart,
    clearCart,
    updateCartItemQuantity,
    removeFromCart,
  } = useResposStore()

  // Auth & Permissions
  const {
    canAccessPayment,
    hasAnyRole,
    isLoading: authLoading,
    employee,
  } = useResposAuth()

  // Real-time
  useResposRealtime({
    tables: ['res_tables', 'res_orders', 'res_order_items'],
    employeeId: employee?.id,
  })

  // Active Order
  const { data: activeOrder, isLoading: activeOrderLoading } =
    useActiveOrderByTable(selectedTable?.id || '')

  // Mutations
  const { mutate: createOrder, isPending: isCreating } = useCreateOrder()
  const { mutate: addItems, isPending: isAdding } = useAddOrderItems()

  // Role Access Check
  const hasAccess = hasAnyRole([
    'super_admin',
    'res_manager',
    'captain',
    'cashier',
  ])

  const isLoading =
    floorsLoading ||
    tablesLoading ||
    categoriesLoading ||
    itemsLoading ||
    activeOrderLoading ||
    authLoading

  // Table Selection Logic with Locking
  const handleTableSelect = (table: ResTable) => {
    // If we have items in cart for a different table, prevent switching
    if (cart.items.length > 0 && selectedTable?.id !== table.id) {
      toast.error('Complete the current order first!', {
        description: `You have unsaved items for Table ${selectedTable?.table_number}. Place order or clear cart.`,
      })
      return
    }
    setSelectedTable(table)
  }

  // Item Selection Logic
  const handleItemClick = (item: ResMenuItem) => {
    setSelectedItemId(item.id)
    setIsItemDetailsOpen(true)
  }

  const handleAddItemToCart = (
    item: ResMenuItem,
    variantId?: string,
    properties?: SelectedProperty[],
    quantity: number = 1,
    notes?: string
  ) => {
    // Find full variant object if ID exists
    const variant = variantId
      ? menuItems
          ?.find((i) => i.id === item.id)
          ?.variants.find((v) => v.id === variantId)
      : undefined

    // Loop to add multiple quantities since store adds 1 at a time
    for (let i = 0; i < quantity; i++) {
      addToCart(item, variant, properties, notes)
    }

    toast.success('Item added to cart')
  }

  // Order Placement Logic
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

    const callbacks = {
      onSuccess: () => {
        toast.success(activeOrder ? 'Order updated' : 'Order placed')
        clearCart()
      },
      onError: () => toast.error('Failed to process order'),
    }

    if (activeOrder) {
      addItems({ orderId: activeOrder.id, items: orderItems }, callbacks)
    } else {
      createOrder({ tableId: selectedTable.id, items: orderItems }, callbacks)
    }
  }

  if (!isLoading && !hasAccess) {
    return (
      <div className='flex h-screen flex-col items-center justify-center gap-4 bg-muted/40'>
        <div className='rounded-full bg-red-100 p-4 text-red-600'>
          <Lock className='h-8 w-8' />
        </div>
        <h2 className='text-xl font-bold'>Access Restricted</h2>
        <p className='max-w-md text-center text-muted-foreground'>
          This terminal is restricted to authorized staff only.
        </p>
        <Button onClick={() => (window.location.href = '/')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const filteredItems =
    menuItems?.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        !selectedCategory || item.category_id === selectedCategory
      return matchesSearch && matchesCategory && item.is_available
    }) ?? []

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        order={activeOrder || null}
        onSuccess={() => {}}
      />

      <MenuItemDetailsDialog
        itemId={selectedItemId}
        open={isItemDetailsOpen}
        onOpenChange={setIsItemDetailsOpen}
        onAddToOrder={handleAddItemToCart}
      />

      <div className='flex h-screen flex-col overflow-hidden bg-background'>
        {/* Top Header */}
        <Header className='h-14 border-b px-4'>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-orange-600 text-white shadow-sm'>
              <UtensilsCrossed className='h-5 w-5' />
            </div>
            <span className='hidden text-lg font-bold md:inline-block'>
              ResPOS
            </span>
            <Separator orientation='vertical' className='mx-2 h-6' />

            {/* Current Context Badge */}
            {selectedTable ? (
              <Badge
                variant='outline'
                className='gap-1 bg-background px-3 py-1 text-base'
              >
                <LayoutGrid className='h-3 w-3' />
                Table {selectedTable.table_number}
              </Badge>
            ) : (
              <Badge variant='secondary' className='gap-1 px-3 py-1 text-base'>
                Select Table
              </Badge>
            )}
          </div>

          <div className='ml-auto flex items-center gap-3'>
            {/* Mobile Cart Trigger */}
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
              <SheetContent side='right' className='w-full p-0 sm:max-w-md'>
                <SheetHeader className='border-b p-4'>
                  <SheetTitle>Current Order</SheetTitle>
                </SheetHeader>
                <div className='h-[calc(100vh-5rem)]'>
                  <OrderPanel
                    activeOrder={activeOrder || null}
                    cart={cart}
                    onPlaceOrder={handlePlaceOrder}
                    isProcessing={isCreating || isAdding}
                    onCheckout={() => setIsCheckoutOpen(true)}
                    canCheckout={canAccessPayment}
                    onClearCart={clearCart}
                    onUpdateQuantity={updateCartItemQuantity}
                    onRemoveItem={removeFromCart}
                    selectedTable={selectedTable}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <NotificationsDropdown />
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>

        {/* Main Content Area */}
        <div className='flex flex-1 overflow-hidden'>
          {isLoading ? (
            <div className='flex w-full items-center justify-center'>
              <Loader2 className='h-10 w-10 animate-spin text-orange-500' />
            </div>
          ) : (
            <>
              {/* Left Side: Navigation & Floor/Menu View */}
              <div className='flex flex-1 flex-col overflow-hidden'>
                {!selectedTable ? (
                  // Floor Manager Mode
                  <FloorManagerView
                    floors={floors || []}
                    tables={tables || []}
                    selectedFloorId={selectedFloorId}
                    onSelectFloor={setSelectedFloorId}
                    onSelectTable={handleTableSelect}
                  />
                ) : (
                  // Menu Mode
                  <div className='flex h-full flex-col'>
                    {/* Menu Header / Navigation */}
                    <div className='flex items-center gap-3 border-b bg-muted/5 p-3'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='outline'
                              size='icon'
                              onClick={() => setSelectedTable(null)}
                            >
                              <ChevronLeft className='h-5 w-5' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Back to Floors</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className='relative max-w-md flex-1'>
                        <Search className='absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                        <Input
                          placeholder='Search menu...'
                          className='bg-background pl-9'
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Categories & Items Grid */}
                    <Tabs
                      value={selectedCategory ?? 'all'}
                      onValueChange={(v) =>
                        setSelectedCategory(v === 'all' ? null : v)
                      }
                      className='flex flex-1 flex-col overflow-hidden'
                    >
                      <div className='border-b bg-background'>
                        <TabsList className='h-12 w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-2'>
                          <TabsTrigger
                            value='all'
                            className='rounded-full border px-4 data-[state=active]:bg-orange-600 data-[state=active]:text-white'
                          >
                            All Items
                          </TabsTrigger>
                          {categories?.map((cat) => (
                            <TabsTrigger
                              key={cat.id}
                              value={cat.id}
                              className='rounded-full border px-4 data-[state=active]:bg-orange-600 data-[state=active]:text-white'
                            >
                              {cat.name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>

                      <TabsContent
                        value={selectedCategory ?? 'all'}
                        className='flex-1 overflow-auto bg-muted/5 p-4 text-left data-[state=inactive]:hidden'
                      >
                        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                          {filteredItems.map((item) => (
                            <MenuGridItem
                              key={item.id}
                              item={item}
                              onClick={() => handleItemClick(item)}
                            />
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>

              {/* Right Side: Order Panel (Desktop) */}
              <div className='z-10 hidden w-[400px] flex-col border-l bg-background shadow-2xl lg:flex'>
                <OrderPanel
                  activeOrder={activeOrder || null}
                  cart={cart}
                  onPlaceOrder={handlePlaceOrder}
                  isProcessing={isCreating || isAdding}
                  onCheckout={() => setIsCheckoutOpen(true)}
                  canCheckout={canAccessPayment}
                  onClearCart={clearCart}
                  onUpdateQuantity={updateCartItemQuantity}
                  onRemoveItem={removeFromCart}
                  selectedTable={selectedTable}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// --- Subcomponents ---

function MenuGridItem({
  item,
  onClick,
}: {
  item: ResMenuItem
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className='group relative flex flex-col overflow-hidden rounded-xl border bg-background text-left shadow-sm transition-all hover:border-orange-200 hover:shadow-md'
    >
      <div className='aspect-[4/3] w-full overflow-hidden bg-muted'>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className='h-full w-full object-cover transition-transform group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-muted-foreground/20'>
            <UtensilsCrossed className='h-12 w-12' />
          </div>
        )}
      </div>
      <div className='flex w-full flex-1 flex-col p-3'>
        <h3 className='line-clamp-1 text-left font-semibold group-hover:text-orange-600'>
          {item.name}
        </h3>
        <div className='mt-auto flex w-full items-center justify-between pt-2'>
          <span className='font-bold text-orange-600'>
            {formatCurrency(item.base_price)}
          </span>
          <Button
            size='icon'
            variant='secondary'
            className='h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100'
          >
            <LayoutGrid className='h-3 w-3' />
          </Button>
        </div>
      </div>
    </motion.button>
  )
}

interface OrderPanelProps {
  activeOrder: ResOrderWithDetails | null
  cart: any // Typed in store
  onPlaceOrder: () => void
  isProcessing: boolean
  onCheckout: () => void
  canCheckout: boolean
  onClearCart: () => void
  onUpdateQuantity: (index: number, qty: number) => void
  onRemoveItem: (index: number) => void
  selectedTable: ResTable | null
}

function OrderPanel({
  activeOrder,
  cart,
  onPlaceOrder,
  isProcessing,
  onCheckout,
  canCheckout,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  selectedTable,
}: OrderPanelProps) {
  const cartTotal = cart.total || 0
  const activeTotal = activeOrder?.total_amount || 0
  const grandTotal = activeTotal + cartTotal

  if (!selectedTable) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground'>
        <div className='mb-4 rounded-full bg-muted p-4'>
          <LayoutGrid className='h-8 w-8 opacity-50' />
        </div>
        <h3 className='font-semibold'>No Table Selected</h3>
        <p className='mt-1 text-sm'>
          Select a table from the floor plan to start an order.
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='z-10 flex items-center justify-between border-b p-4 shadow-xs'>
        <div>
          <h2 className='text-lg font-bold'>Order Details</h2>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span>Table {selectedTable.table_number}</span>
            {activeOrder && <span>• Order #{activeOrder.order_number}</span>}
          </div>
        </div>
        {cart.items.length > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClearCart}
            className='text-red-500 hover:bg-red-50 hover:text-red-600'
          >
            <X className='mr-1 h-3 w-3' /> Clear
          </Button>
        )}
      </div>

      <ScrollArea className='flex-1 bg-muted/5 p-4'>
        {/* Active Order Items (Sent to Kitchen) */}
        {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
          <div className='mb-6'>
            <div className='mb-2 flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
              <span>Sent to Kitchen</span>
              <Badge variant='outline' className='text-[10px]'>
                {activeOrder.status}
              </Badge>
            </div>
            <div className='space-y-1'>
              {activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className='mb-2 flex gap-3 rounded-lg border bg-white px-3 py-2 opacity-80'
                >
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600'>
                    {item.quantity}
                  </div>
                  <div className='flex-1'>
                    <div className='text-sm font-medium'>{item.item.name}</div>
                    {item.variant && (
                      <div className='text-xs text-muted-foreground'>
                        {item.variant.name}
                      </div>
                    )}
                    {item.properties && item.properties.length > 0 && (
                      <div className='mt-0.5 text-xs text-muted-foreground'>
                        {item.properties.map((p) => p.option_name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className='mt-0.5 text-xs text-orange-600 italic'>
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                  <div className='text-sm font-medium text-slate-600'>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <Separator className='my-4' />
          </div>
        )}

        {/* New Cart Items */}
        {cart.items.length > 0 ? (
          <div>
            <div className='mb-2 flex items-center justify-between text-xs font-semibold tracking-wider text-orange-600 uppercase'>
              <span>New Items</span>
            </div>
            <div className='space-y-2'>
              <AnimatePresence initial={false}>
                {cart.items.map((cartItem: CartItem, index: number) => (
                  <motion.div
                    key={`${cartItem.item.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className='group relative flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 pr-2'>
                        <span className='text-sm font-medium'>
                          {cartItem.item.name}
                        </span>
                        {cartItem.variant && (
                          <span className='ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-muted-foreground'>
                            {cartItem.variant.name}
                          </span>
                        )}
                        <div className='mt-0.5 text-xs font-bold text-orange-600'>
                          {formatCurrency(cartItem.lineTotal)}
                        </div>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500'
                        onClick={() => onRemoveItem(index)}
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </div>

                    {/* Properties & Notes */}
                    {(cartItem.selectedProperties.length > 0 ||
                      cartItem.notes) && (
                      <div className='rounded bg-slate-50 p-2 text-xs text-muted-foreground'>
                        {cartItem.selectedProperties.map((p) => (
                          <span key={p.id} className='block'>
                            • {p.name} (+{formatCurrency(p.price)})
                          </span>
                        ))}
                        {cartItem.notes && (
                          <span className='block text-orange-700 italic'>
                            Note: {cartItem.notes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div className='mt-1 flex items-center gap-3 self-end'>
                      <Button
                        size='icon'
                        variant='outline'
                        className='h-6 w-6'
                        onClick={() =>
                          onUpdateQuantity(index, cartItem.quantity - 1)
                        }
                      >
                        <span className='text-xs font-bold'>-</span>
                      </Button>
                      <span className='w-4 text-center text-sm font-semibold'>
                        {cartItem.quantity}
                      </span>
                      <Button
                        size='icon'
                        variant='outline'
                        className='h-6 w-6'
                        onClick={() =>
                          onUpdateQuantity(index, cartItem.quantity + 1)
                        }
                      >
                        <span className='text-xs font-bold'>+</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          !activeOrder && (
            <div className='flex flex-col items-center justify-center py-10 text-sm text-muted-foreground opacity-60'>
              <ShoppingCart className='mb-2 h-10 w-10' />
              <p>Cart is empty</p>
            </div>
          )
        )}
      </ScrollArea>

      <div className='space-y-4 border-t bg-background p-4 shadow-inner'>
        <div className='space-y-2 text-sm'>
          {cart.total > 0 && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Current Order</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          )}
          {activeOrder && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Previous Orders</span>
              <span>{formatCurrency(activeTotal)}</span>
            </div>
          )}
          <div className='flex justify-between border-t pt-2 text-lg font-black'>
            <span>Total</span>
            <span className='text-orange-600'>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        <div className='grid gap-3'>
          <Button
            size='lg'
            className='w-full bg-orange-600 text-lg font-bold shadow-lg shadow-orange-200 hover:bg-orange-700'
            title='Place Order'
            onClick={onPlaceOrder}
            disabled={isProcessing || cart.items.length === 0}
          >
            {isProcessing ? (
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            ) : activeOrder ? (
              'Update Order'
            ) : (
              'Place Order'
            )}
          </Button>

          {activeOrder && canCheckout && (
            <Button
              variant='secondary'
              size='lg'
              className='w-full border-2 border-orange-100 bg-orange-50 text-orange-900 hover:border-orange-200 hover:bg-orange-100'
              onClick={onCheckout}
              disabled={isProcessing}
            >
              Checkout & Pay
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
