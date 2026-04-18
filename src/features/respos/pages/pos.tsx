// ResPOS POS Screen - Main Point of Sale Interface
// Floor/table selection + order management
import { useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  History,
  Home,
  LayoutGrid,
  Loader2,
  Plus,
  Receipt,
  Search,
  Shield,
  ShoppingCart,
  Truck,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import { useResposStore } from '@/stores/respos-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
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
import { CartItem as CartItemComponent } from '../components/pos/cart-item'
import { OrderHistoryPanel } from '../components/pos/order-history-panel'
import { TABLE_STATUS_COLORS, TABLE_STATUS_TEXT_COLORS } from '../constants'
import { useResposRealtime } from '../hooks'
import { useOrderCalc } from '../hooks/use-order-calc'
import { formatCurrency } from '../lib/formatters'
import type {
  Cart,
  CartItem,
  ResMenuItem,
  ResOrderWithDetails,
  ResTable,
  SelectedProperty,
} from '../types'

type OrderMode = 'dine_in' | 'delivery'

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size='sm'
      onClick={onClick}
      className={cn(
        'h-10 gap-2 rounded-xl px-4 font-bold transition-all',
        active && 'bg-background shadow-sm ring-1 ring-border'
      )}
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}

export function POSScreen() {
  // Local State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [orderMode, setOrderMode] = useState<OrderMode>('dine_in')

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
  const { user: employee } = useUser()
  const { has, isLoaded, isSignedIn } = useAuth()

  // Real-time
  useResposRealtime({
    tables: ['res_tables', 'res_orders', 'res_order_items'],
    employeeId: employee?.id,
  })

  // Active Order
  const { data: activeOrder, isLoading: activeOrderLoading } =
    useActiveOrderByTable(
      orderMode === 'delivery' ? '' : (selectedTable?.id ?? '')
    )

  // Mutations
  const { mutate: createOrder, isPending: isCreating } = useCreateOrder()
  const { mutate: addItems, isPending: isAdding } = useAddOrderItems()

  const isLoadingData =
    floorsLoading ||
    tablesLoading ||
    categoriesLoading ||
    itemsLoading ||
    activeOrderLoading

  const showFloorView = orderMode === 'dine_in' && !selectedTable

  const switchOrderMode = (mode: OrderMode) => {
    if (mode === orderMode) return
    if (cart.items.length > 0) {
      toast.error('Complete the current order first!', {
        description: 'Place the order or clear the cart before switching mode.',
      })
      return
    }

    setOrderMode(mode)
    setSelectedCategory(null)
    if (mode === 'delivery') {
      setSelectedTable(null)
      setSelectedFloorId(null)
    }
  }

  // Table Selection Logic with Locking
  const handleTableSelect = (table: ResTable) => {
    if (orderMode === 'delivery') {
      return
    }
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
    if (cart.items.length === 0) return
    if (orderMode === 'dine_in' && !selectedTable) return

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
      createOrder(
        {
          tableId: orderMode === 'dine_in' ? selectedTable?.id : undefined,
          isDelivery: orderMode === 'delivery',
          items: orderItems,
        },
        callbacks
      )
    }
  }

  if (!isSignedIn) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Shield className='mx-auto h-12 w-12 text-red-500' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Shield className='mx-auto h-12 w-12 text-red-500' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
        </div>
      </div>
    )
  }

  if (
    !has({ role: 'admin' }) &&
    !has({ role: 'super_admin' }) &&
    !has({ role: 'captain' })
  ) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Shield className='mx-auto h-12 w-12 text-red-500' />
          <h2 className='mt-4 text-xl font-bold'>Access Denied</h2>
          <p className='text-muted-foreground'>
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingData) {
    return (
      <div className='flex h-screen items-center justify-center bg-muted/40'>
        <Loader2 className='h-10 w-10 animate-spin text-orange-500' />
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

      <div className='flex h-screen flex-col overflow-hidden bg-background font-sans'>
        {/* Top Header */}
        <Header className='z-20 h-16 border-b bg-background/50 px-6 backdrop-blur-xl'>
          <div className='flex items-center gap-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 shadow-lg shadow-orange-600/20'>
              <LayoutGrid className='h-6 w-6 text-white' />
            </div>
            <div>
              <h1 className='text-lg font-black tracking-tight uppercase'>
                ResPOS
              </h1>
              <p className='text-[10px] font-bold text-muted-foreground uppercase opacity-60'>
                V3.0 • Premium Edition
              </p>
            </div>
          </div>

          <div className='mx-auto flex items-center gap-2 rounded-2xl bg-muted/50 p-1.5 backdrop-blur-md'>
            <NavButton
              active={orderMode === 'dine_in' && !selectedTable}
              onClick={() => {
                switchOrderMode('dine_in')
                if (orderMode === 'dine_in') {
                  setSelectedTable(null)
                  setSelectedFloorId(null)
                  setSelectedCategory(null)
                }
              }}
              icon={<Home className='h-4 w-4' />}
              label='Floor'
            />
            <NavButton
              active={orderMode === 'delivery'}
              onClick={() => switchOrderMode('delivery')}
              icon={<Truck className='h-4 w-4' />}
              label='Delivery'
            />
            {selectedTable && (
              <div className='flex items-center gap-2'>
                <ChevronRight className='h-4 w-4 text-muted-foreground/40' />
                <NavButton
                  active={true}
                  onClick={() => {}}
                  icon={<UtensilsCrossed className='h-4 w-4' />}
                  label={`Table ${selectedTable.table_number}`}
                />
              </div>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              className='h-9 rounded-full border-orange-200 px-4 font-bold text-orange-600 hover:bg-orange-50'
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className='mr-2 h-4 w-4' />
              {showHistory ? 'Back to POS' : 'Order History'}
            </Button>
            <div className='hidden flex-col items-end sm:flex'>
              <span className='text-sm font-bold'>{employee?.fullName}</span>
              {/* <span className='text-[10px] font-bold text-orange-600 uppercase'>
                {roles.length > 0 ? roles.join(' • ') : 'No Role'}
              </span> */}
            </div>
            <div className='mx-2 h-8 w-px bg-border/50' />
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
        </Header>

        {/* Main Content Area */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Left Side: Navigation & Floor/Menu View */}
          <div className='flex flex-1 flex-col overflow-hidden bg-muted/5'>
            <AnimatePresence mode='wait'>
              {showFloorView ? (
                // Floor Manager Mode
                <motion.div
                  key='floor-view'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className='h-full'
                >
                  <FloorManagerView
                    floors={floors || []}
                    tables={tables || []}
                    selectedFloorId={selectedFloorId}
                    onSelectFloor={setSelectedFloorId}
                    onSelectTable={handleTableSelect}
                  />
                </motion.div>
              ) : (
                // Menu Mode
                <motion.div
                  key='menu-view'
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className='flex h-full flex-col'
                >
                  {/* Category Header */}
                  <div className='z-10 bg-background/80 px-4 py-3 backdrop-blur-md'>
                    <ScrollArea className='w-full whitespace-nowrap'>
                      <div className='flex gap-2 pb-1'>
                        <Button
                          variant={
                            selectedCategory === null ? 'default' : 'ghost'
                          }
                          size='sm'
                          onClick={() => setSelectedCategory(null)}
                          className={cn(
                            'rounded-full px-5 font-bold transition-all',
                            selectedCategory === null &&
                              'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                          )}
                        >
                          All Items
                        </Button>
                        {categories?.map((cat) => (
                          <Button
                            key={cat.id}
                            variant={
                              selectedCategory === cat.id ? 'default' : 'ghost'
                            }
                            size='sm'
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                              'rounded-full px-5 font-bold transition-all',
                              selectedCategory === cat.id &&
                                'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                            )}
                          >
                            {cat.name}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className='flex flex-1 flex-col overflow-hidden px-6 py-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        {orderMode === 'dine_in' && selectedTable ? (
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl border-2',
                              TABLE_STATUS_COLORS[selectedTable.status]
                            )}
                          >
                            <span className='font-black'>
                              {selectedTable.table_number}
                            </span>
                          </div>
                        ) : (
                          <div className='flex h-10 w-10 items-center justify-center rounded-xl border-2 border-orange-300 bg-orange-50 text-orange-600'>
                            <Truck className='h-5 w-5' />
                          </div>
                        )}
                        <div>
                          <h2 className='text-xl font-black tracking-tight uppercase'>
                            Menu Selection
                          </h2>
                          {orderMode === 'dine_in' && selectedTable ? (
                            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full bg-current',
                                  TABLE_STATUS_TEXT_COLORS[selectedTable.status]
                                )}
                              />
                              <span className='font-bold tracking-wider uppercase'>
                                {selectedTable.status}
                              </span>
                              <span className='mx-1 opacity-20'>|</span>
                              <span>{selectedTable.seats} Seats</span>
                            </div>
                          ) : (
                            <div className='text-xs font-bold tracking-wider text-orange-600 uppercase'>
                              Delivery Order (Tableless)
                            </div>
                          )}
                        </div>
                      </div>

                      <div className='relative w-64'>
                        <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50' />
                        <Input
                          placeholder='Search menu items...'
                          className='rounded-2xl border-none bg-background/50 pl-10 ring-1 ring-border focus-visible:ring-2 focus-visible:ring-orange-500'
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <ScrollArea className='flex-1 pb-10'>
                      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5'>
                        {filteredItems.map((item) => (
                          <MenuGridItem
                            key={item.id}
                            item={item}
                            onClick={() => handleItemClick(item)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side: Order Panel (Desktop) */}
          <div className='relative z-30 hidden w-[420px] flex-col overflow-y-scroll border-l bg-background shadow-[-10px_0_30px_rgba(0,0,0,0.05)] lg:flex'>
            {showHistory ? (
              <OrderHistoryPanel onClose={() => setShowHistory(false)} />
            ) : (
              <OrderPanel
                orderMode={orderMode}
                activeOrder={activeOrder || null}
                cart={cart}
                onPlaceOrder={handlePlaceOrder}
                isProcessing={isCreating || isAdding}
                onCheckout={() => setIsCheckoutOpen(true)}
                canCheckout={
                  has({ role: 'admin' }) || has({ role: 'super_admin' })
                }
                onClearCart={clearCart}
                onUpdateQuantity={updateCartItemQuantity}
                onRemoveItem={removeFromCart}
                selectedTable={selectedTable}
              />
            )}
          </div>
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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className='group relative flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-all hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-500/10 dark:hover:border-orange-700/50'
    >
      <div className='aspect-square w-full overflow-hidden bg-muted'>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-110'
          />
        ) : (
          <div className='flex h-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'>
            <UtensilsCrossed className='h-12 w-12 text-orange-200/50 dark:text-orange-900/50' />
          </div>
        )}
      </div>
      <div className='flex w-full flex-1 flex-col gap-1 p-4'>
        <h3 className='line-clamp-1 text-sm font-bold tracking-tight transition-colors group-hover:text-orange-600'>
          {item.name}
        </h3>
        <div className='mt-2 flex items-center justify-between'>
          <span className='rounded-full bg-orange-500/10 px-3 py-1 text-sm font-black text-orange-600 dark:text-orange-400'>
            {formatCurrency(item.base_price)}
          </span>
          <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-600/30 transition-all group-hover:scale-110'>
            <Plus className='h-4 w-4 stroke-[3px]' />
          </div>
        </div>
      </div>
    </motion.button>
  )
}

interface OrderPanelProps {
  orderMode: OrderMode
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
  orderMode,
  activeOrder,
  cart,
  onPlaceOrder,
  isProcessing,
  onClearCart,
  onUpdateQuantity,
  onRemoveItem,
  selectedTable,
}: OrderPanelProps) {
  const activeTotal = activeOrder?.total_amount || 0
  const orderCalc = useOrderCalc()

  // Cart breakdown
  const cartSubtotal = orderCalc.subtotal || 0
  const cartTax = orderCalc.taxAmount || 0
  const cartTotal = orderCalc.total || 0
  // const grandTotal = activeTotal + cartTotal

  if (orderMode === 'dine_in' && !selectedTable) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground'>
        <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 shadow-inner'>
          <Receipt className='h-10 w-10 opacity-20' />
        </div>
        <h3 className='text-lg font-black tracking-tight uppercase'>
          No Table Selected
        </h3>
        <p className='mt-2 max-w-[240px] text-xs leading-relaxed font-medium opacity-60'>
          Please select a table from the floor plan to start a new order or
          manage an existing one.
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col bg-card'>
      {/* Order Header */}
      <div className='z-10 bg-background/50 p-6 backdrop-blur-md'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-3'>
              {orderMode === 'dine_in' && selectedTable ? (
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20'>
                  <span className='text-xl font-black'>
                    {selectedTable.table_number}
                  </span>
                </div>
              ) : (
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20'>
                  <Truck className='h-6 w-6' />
                </div>
              )}
              <div>
                <h2 className='text-lg font-black tracking-tight uppercase'>
                  {orderMode === 'dine_in' ? 'Active Order' : 'Delivery Order'}
                </h2>
                <div className='flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase'>
                  {orderMode === 'dine_in' && selectedTable ? (
                    <>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full bg-current',
                          TABLE_STATUS_TEXT_COLORS[selectedTable.status]
                        )}
                      />
                      <span>Table {selectedTable.table_number}</span>
                    </>
                  ) : (
                    <span className='text-orange-600'>Tableless Delivery</span>
                  )}
                  {activeOrder && (
                    <>
                      <span className='opacity-30'>•</span>
                      <span className='text-orange-600'>
                        #{activeOrder.order_number}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {cart.items.length > 0 && (
            <Button
              variant='ghost'
              size='icon'
              onClick={onClearCart}
              className='h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20'
            >
              <Trash2 className='h-5 w-5' />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className='flex-1 px-6'>
        {/* Active Order Items (Sent to Kitchen) */}
        {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
          <div className='mb-8'>
            <div className='mb-4 flex items-center justify-between px-1'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
                Sent to Kitchen
              </span>
              <div className='flex h-6 items-center rounded-full bg-emerald-500/10 px-3 text-[10px] font-black text-emerald-600 uppercase dark:text-emerald-400'>
                {activeOrder.status.replace('_', ' ')}
              </div>
            </div>
            <div className='space-y-3'>
              {activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className='group relative flex gap-4 rounded-3xl border bg-muted/20 p-4 transition-all hover:bg-muted/30'
                >
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background text-[11px] font-black shadow-sm'>
                    {item.quantity}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-bold'>
                      {item.item.name}
                    </div>
                    {item.variant && (
                      <div className='text-[10px] font-bold text-muted-foreground uppercase opacity-60'>
                        {item.variant.name}
                      </div>
                    )}
                    {item.properties && item.properties.length > 0 && (
                      <div className='mt-1 flex flex-wrap gap-1'>
                        {item.properties.map((p) => (
                          <span
                            key={p.id}
                            className='rounded-md bg-background/50 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase'
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <div className='mt-2 rounded-xl bg-orange-500/5 px-3 py-1.5 text-[10px] font-medium text-orange-600 italic'>
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                  <div className='shrink-0 text-sm font-black'>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Cart Items */}
        {cart.items.length > 0 ? (
          <div className='mb-8'>
            <div className='mb-4 px-1'>
              <span className='text-[10px] font-black tracking-widest text-orange-600 uppercase'>
                New Selection
              </span>
            </div>
            <div className='space-y-3'>
              <AnimatePresence initial={false}>
                {cart.items.map((cartItem: CartItem, index: number) => (
                  <CartItemComponent
                    key={`${cartItem.item.id}-${index}`}
                    item={cartItem}
                    index={index}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemoveItem={onRemoveItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          !activeOrder && (
            <div className='flex flex-col items-center justify-center py-20 text-center opacity-40'>
              <ShoppingCart className='mb-4 h-12 w-12 stroke-[1.5]' />
              <p className='text-xs font-black tracking-widest uppercase'>
                Cart is empty
              </p>
            </div>
          )
        )}
      </ScrollArea>

      {/* Order Footer */}
      <div className='z-10 border-t bg-background/50 p-8 pt-6 backdrop-blur-xl'>
        {/* <div className='mb-6'>
          <PromoInput />
        </div> */}
        <div className='mb-6 space-y-2'>
          <div className='flex justify-between text-xs font-bold tracking-wider text-muted-foreground uppercase'>
            <span>Subtotal</span>
            <span>{formatCurrency(cartSubtotal + activeTotal)}</span>
          </div>
          <div className='flex justify-between text-xs font-bold tracking-wider text-muted-foreground uppercase'>
            <span>Service & Tax</span>
            <span>{formatCurrency(cartTax)}</span>
          </div>
          <Separator className='my-4 opacity-50' />
          <div className='flex items-baseline justify-between'>
            <span className='text-sm font-black tracking-tighter uppercase opacity-60'>
              Total Amount
            </span>
            <span className='text-3xl font-black tracking-tighter text-orange-600 dark:text-orange-400'>
              {formatCurrency(cartTotal + activeTotal)}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3'>
          <Button
            size='lg'
            className='h-14 w-full bg-orange-600 text-lg font-black tracking-tight uppercase shadow-2xl shadow-orange-600/30 transition-all hover:bg-orange-700 active:scale-[0.98]'
            onClick={onPlaceOrder}
            disabled={isProcessing || cart.items.length === 0}
          >
            {isProcessing ? (
              <Loader2 className='h-6 w-6 animate-spin' />
            ) : activeOrder ? (
              'Update Order'
            ) : orderMode === 'delivery' ? (
              'Create Delivery Order'
            ) : (
              'Send to Kitchen'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
