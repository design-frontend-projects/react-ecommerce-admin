// ResPOS POS Screen - Main Point of Sale Interface
// Floor/table selection + order management
import { useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  LayoutGrid,
  Loader2,
  Lock,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
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
import { useAddOrderItems, useCreateOrder } from '../api/mutations'
import {
  useActiveOrderByTable,
  useFloors,
  useMenuCategories,
  useMenuItemsWithDetails,
  useTables,
} from '../api/queries'
import { CheckoutDialog } from '../components/checkout-dialog'
import { FloorManagerView } from '../components/floor-manager-view'
import { MenuItemDetailsDialog } from '../components/menu-item-details-dialog'
import { NotificationsDropdown } from '../components/notifications-dropdown'
import { useResposAuth, useResposRealtime } from '../hooks'
import { formatCurrency } from '../lib/formatters'
import type {
  Cart,
  CartItem,
  ResMenuItem,
  ResOrderWithDetails,
  ResTable,
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
  const { canAccessPayment, isLoading: authLoading, employee } = useResposAuth()

  const { has, isLoaded: isUserLoading, isSignedIn: isUserSignin } = useAuth()

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

  if (!isUserLoading) {
    if (!isUserSignin) {
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
  }

  if (isUserLoading && !has({ role: 'org:super_admin' })) {
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
      className='group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-lg dark:hover:border-orange-700'
    >
      <div className='aspect-[4/3] w-full overflow-hidden bg-muted'>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-110'
          />
        ) : (
          <div className='flex h-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30'>
            <UtensilsCrossed className='h-10 w-10 text-orange-300 dark:text-orange-700' />
          </div>
        )}
      </div>
      <div className='flex w-full flex-1 flex-col gap-1 p-3'>
        <h3 className='line-clamp-1 text-left text-sm font-semibold transition-colors group-hover:text-orange-600'>
          {item.name}
        </h3>
        <div className='mt-auto flex w-full items-center justify-between pt-1'>
          <span className='rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'>
            {formatCurrency(item.base_price)}
          </span>
          <div className='flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white opacity-0 shadow-md transition-all group-hover:opacity-100'>
            <Plus className='h-4 w-4' />
          </div>
        </div>
      </div>
    </motion.button>
  )
}

interface OrderPanelProps {
  activeOrder: ResOrderWithDetails | null
  cart: Cart
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
  const activeTotal = activeOrder?.total_amount || 0

  // Cart breakdown
  const cartSubtotal = cart.subtotal || 0
  const cartTax = cart.taxAmount || 0
  const cartDiscount = cart.discountAmount || 0
  const cartTip = cart.tipAmount || 0
  const cartTotal = cart.total || 0
  const grandTotal = activeTotal + cartTotal

  const totalItemsInCart = useMemo(
    () =>
      cart.items.reduce((sum: number, ci: CartItem) => sum + ci.quantity, 0),
    [cart.items]
  )

  if (!selectedTable) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground'>
        <div className='mb-4 rounded-full bg-muted p-5'>
          <Receipt className='h-8 w-8 opacity-40' />
        </div>
        <h3 className='text-base font-semibold'>No Table Selected</h3>
        <p className='mt-1 max-w-[200px] text-xs leading-relaxed'>
          Select a table from the floor plan to start taking orders.
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Order Header */}
      <div className='z-10 flex items-center justify-between border-b bg-card p-4'>
        <div>
          <div className='flex items-center gap-2'>
            <h2 className='text-base font-bold'>Order</h2>
            {totalItemsInCart > 0 && (
              <Badge className='h-5 min-w-5 justify-center rounded-full bg-orange-600 px-1.5 text-[10px] font-bold text-white'>
                {totalItemsInCart}
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span className='font-medium'>T-{selectedTable.table_number}</span>
            {activeOrder && (
              <>
                <span className='text-muted-foreground/40'>•</span>
                <span>#{activeOrder.order_number}</span>
              </>
            )}
          </div>
        </div>
        {cart.items.length > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClearCart}
            className='h-8 gap-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30'
          >
            <Trash2 className='h-3 w-3' />
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className='flex-1 p-3'>
        {/* Active Order Items (Sent to Kitchen) */}
        {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
          <div className='mb-4'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-[11px] font-semibold tracking-wider text-muted-foreground uppercase'>
                Sent to Kitchen
              </span>
              <Badge
                variant='outline'
                className='h-5 text-[10px] font-medium capitalize'
              >
                {activeOrder.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className='space-y-1.5'>
              {activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className='flex gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 dark:bg-muted/20'
                >
                  <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-bold text-muted-foreground'>
                    {item.quantity}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium'>
                      {item.item.name}
                    </div>
                    {item.variant && (
                      <div className='text-xs text-muted-foreground'>
                        {item.variant.name}
                      </div>
                    )}
                    {item.properties && item.properties.length > 0 && (
                      <div className='mt-0.5 text-xs text-muted-foreground'>
                        {item.properties.map((p) => p.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className='mt-0.5 text-[11px] text-orange-600 italic'>
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                  <div className='shrink-0 text-sm font-semibold'>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <Separator className='my-3' />
          </div>
        )}

        {/* New Cart Items */}
        {cart.items.length > 0 ? (
          <div>
            <div className='mb-2'>
              <span className='text-[11px] font-semibold tracking-wider text-orange-600 uppercase'>
                New Items
              </span>
            </div>
            <div className='space-y-1.5'>
              <AnimatePresence initial={false}>
                {cart.items.map((cartItem: CartItem, index: number) => (
                  <motion.div
                    key={`${cartItem.item.id}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className='group rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-orange-200 dark:hover:border-orange-800'
                  >
                    {/* Item name + remove */}
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='truncate text-sm font-medium'>
                            {cartItem.item.name}
                          </span>
                          {cartItem.variant && (
                            <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
                              {cartItem.variant.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500'
                        onClick={() => onRemoveItem(index)}
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </div>

                    {/* Properties & Notes */}
                    {(cartItem.selectedProperties.length > 0 ||
                      cartItem.notes) && (
                      <div className='mt-1.5 rounded bg-muted/50 px-2 py-1.5 text-xs dark:bg-muted/20'>
                        {cartItem.selectedProperties.map((p) => (
                          <span
                            key={p.id}
                            className='flex items-center justify-between'
                          >
                            <span className='text-muted-foreground'>
                              • {p.name}
                            </span>
                            <span className='font-medium text-foreground'>
                              +{formatCurrency(p.price)}
                            </span>
                          </span>
                        ))}
                        {cartItem.notes && (
                          <span className='mt-0.5 block text-orange-600 italic dark:text-orange-400'>
                            "{cartItem.notes}"
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quantity + Line Total */}
                    <div className='mt-2 flex items-center justify-between'>
                      <div className='flex items-center gap-1'>
                        <Button
                          size='icon'
                          variant='outline'
                          className='h-6 w-6 rounded-md'
                          onClick={() =>
                            onUpdateQuantity(index, cartItem.quantity - 1)
                          }
                        >
                          <Minus className='h-3 w-3' />
                        </Button>
                        <span className='min-w-[28px] text-center text-sm font-semibold'>
                          {cartItem.quantity}
                        </span>
                        <Button
                          size='icon'
                          variant='outline'
                          className='h-6 w-6 rounded-md'
                          onClick={() =>
                            onUpdateQuantity(index, cartItem.quantity + 1)
                          }
                        >
                          <Plus className='h-3 w-3' />
                        </Button>
                      </div>
                      <span className='text-sm font-bold text-orange-600 dark:text-orange-400'>
                        {formatCurrency(cartItem.lineTotal)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          !activeOrder && (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <div className='mb-3 rounded-full bg-muted/50 p-4'>
                <ShoppingCart className='h-8 w-8 opacity-40' />
              </div>
              <p className='text-sm font-medium'>No items yet</p>
              <p className='mt-0.5 text-xs opacity-60'>
                Tap a menu item to add it
              </p>
            </div>
          )
        )}
      </ScrollArea>

      {/* Order Footer — Totals Breakdown */}
      <div className='border-t bg-card p-4'>
        <div className='space-y-1.5 text-sm'>
          {/* Cart subtotal */}
          {cartSubtotal > 0 && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Subtotal</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
          )}
          {/* Discount */}
          {cartDiscount > 0 && (
            <div className='flex justify-between text-emerald-600 dark:text-emerald-400'>
              <span>Discount</span>
              <span>−{formatCurrency(cartDiscount)}</span>
            </div>
          )}
          {/* Tax */}
          {cartTax > 0 && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Tax (14%)</span>
              <span>{formatCurrency(cartTax)}</span>
            </div>
          )}
          {/* Tip */}
          {cartTip > 0 && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Tip</span>
              <span>{formatCurrency(cartTip)}</span>
            </div>
          )}
          {/* New items total */}
          {cartTotal > 0 && (
            <div className='flex justify-between font-medium'>
              <span>New Items</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
          )}
          {/* Active order total */}
          {activeOrder && (
            <div className='flex justify-between text-muted-foreground'>
              <span>Previous</span>
              <span>{formatCurrency(activeTotal)}</span>
            </div>
          )}
          {/* Grand total */}
          <Separator />
          <div className='flex justify-between pt-1 text-lg font-black'>
            <span>Total</span>
            <span className='text-orange-600 dark:text-orange-400'>
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        <div className='mt-3 grid gap-2'>
          <Button
            size='lg'
            className='w-full bg-orange-600 text-base font-bold shadow-lg shadow-orange-600/20 hover:bg-orange-700 dark:shadow-orange-900/30'
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
              variant='outline'
              size='lg'
              className='w-full border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30'
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
