// ResPOS POS Screen - Main Point of Sale Interface
// Floor/table selection + order management
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Loader2,
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCreateOrder, useAddOrderItems } from '../api/mutations'
import {
  useFloors,
  useTables,
  useMenuCategories,
  useMenuItems,
  useActiveOrderByTable,
} from '../api/queries'
import { CheckoutDialog } from '../components/checkout-dialog'
import { TABLE_STATUS_COLORS } from '../constants'
import { useResposAuth } from '../hooks'
import { formatCurrency } from '../lib/formatters'
import type {
  ResTable,
  ResMenuItem,
  CartItem,
  ResOrderWithDetails,
} from '../types'

export function POSScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const { data: floors, isLoading: floorsLoading } = useFloors()
  const { data: tables, isLoading: tablesLoading } = useTables()
  const { data: categories, isLoading: categoriesLoading } = useMenuCategories()
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems()

  const {
    selectedFloorId,
    selectedTable,
    cart,
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

  // Filter tables by selected floor
  const floorTables =
    tables?.filter((t) => t.floor_id === selectedFloorId) ?? []

  // Filter menu items by search and category
  const filteredItems =
    menuItems?.filter((item: ResMenuItem) => {
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
      <Header>
        <div className='flex items-center gap-2'>
          <UtensilsCrossed className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>POS Screen</h1>
          {selectedTable && (
            <Badge variant='outline' className='ml-2'>
              Table {selectedTable.table_number}
            </Badge>
          )}
        </div>
        <div className='ml-auto flex items-center gap-4'>
          {/* Cart Button (Mobile) */}
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
            <SheetContent>
              <SheetHeader>
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
                  <div className='flex items-center gap-2 border-b p-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setSelectedTable(null)}
                    >
                      <ChevronLeft className='mr-1 h-4 w-4' />
                      Back
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
                    <TabsList className='mx-4 mt-2 flex-wrap justify-start'>
                      <TabsTrigger value='all'>All</TabsTrigger>
                      {categories?.map((cat) => (
                        <TabsTrigger key={cat.id} value={cat.id}>
                          {cat.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent
                      value={selectedCategory ?? 'all'}
                      className='flex-1 overflow-auto p-4'
                    >
                      <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'>
                        {filteredItems.map((item: ResMenuItem) => (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            onAdd={() => addToCart(item, undefined, [])}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                /* Tables View */
                <div className='flex h-full flex-col'>
                  {/* Floor Selector */}
                  <div className='border-b p-4'>
                    <div className='flex gap-2 overflow-x-auto'>
                      {floors?.map((floor) => (
                        <Button
                          key={floor.id}
                          variant={
                            selectedFloorId === floor.id ? 'default' : 'outline'
                          }
                          size='sm'
                          onClick={() => setSelectedFloorId(floor.id)}
                        >
                          {floor.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Tables Grid */}
                  <ScrollArea className='flex-1 p-4'>
                    <div className='grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5'>
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

            {/* Right Panel - Order (Desktop) */}
            <div className='hidden w-80 shrink-0 border-l lg:block'>
              <OrderPanel
                activeOrder={activeOrder || null}
                onPlaceOrder={handlePlaceOrder}
                isProcessing={isCreating || isAdding}
                onCheckout={() => setIsCheckoutOpen(true)}
                canCheckout={canAccessPayment}
              />
            </div>
          </div>
        )}
      </Main>
    </>
  )
}

// Table Card Component
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
        'flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors',
        statusColor,
        table.status === 'occupied' && 'border-orange-500',
        table.status === 'reserved' && 'border-purple-500',
        table.status === 'dirty' && 'border-yellow-500',
        table.status === 'free' && 'border-green-500 hover:border-green-600'
      )}
    >
      <span className='text-lg font-bold'>{table.table_number}</span>
      <span className='text-xs text-muted-foreground'>{table.seats} seats</span>
      <Badge variant='secondary' className='mt-1 text-xs capitalize'>
        {table.status}
      </Badge>
    </motion.button>
  )
}

// Menu Item Card Component
interface MenuItemCardProps {
  item: ResMenuItem
  onAdd: () => void
}

function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
  return (
    <Card
      className='cursor-pointer transition-all hover:shadow-md'
      onClick={onAdd}
    >
      <CardContent className='p-3'>
        {item.image_url && (
          <div className='mb-2 aspect-square overflow-hidden rounded-md'>
            <img
              src={item.image_url}
              alt={item.name}
              className='h-full w-full object-cover'
            />
          </div>
        )}
        <h4 className='line-clamp-2 font-medium'>{item.name}</h4>
        <p className='mt-1 text-sm font-bold text-orange-500'>
          {formatCurrency(item.base_price)}
        </p>
      </CardContent>
    </Card>
  )
}

// Order Panel Component
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
      <div className='border-b p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold'>
            {selectedTable
              ? `Table ${selectedTable.table_number}`
              : 'No Table Selected'}
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
            <Badge variant='secondary'>Order #{activeOrder.order_number}</Badge>
            <Badge variant='outline' className='capitalize'>
              {activeOrder.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Items */}
      <ScrollArea className='flex-1 p-4'>
        {/* Active Order Items */}
        {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
          <div className='mb-6 space-y-3 opacity-90'>
            <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
              <span>Sent to Kitchen</span>
            </div>
            {activeOrder.items.map((item) => (
              <div
                key={item.id}
                className='flex items-start gap-3 rounded-lg border bg-muted/30 p-3'
              >
                <div className='flex-1'>
                  <p className='font-medium'>{item.item.name}</p>
                  {item.variant && (
                    <p className='text-xs text-muted-foreground'>
                      {item.variant.name}
                    </p>
                  )}
                  <p className='text-sm font-semibold'>
                    {formatCurrency(item.unit_price * item.quantity)}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-bold'>x{item.quantity}</span>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Cart Items */}
        {cart.items.length === 0 && !activeOrder ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            No items in order. {!selectedTable && 'Select a table first.'}
          </p>
        ) : (
          <div className='space-y-3'>
            {cart.items.map((item: CartItem, index: number) => (
              <div
                key={index}
                className='flex items-start gap-3 rounded-lg border p-3 shadow-sm'
              >
                <div className='flex-1'>
                  <p className='font-medium'>{item.item.name}</p>
                  {item.variant && (
                    <p className='text-xs text-muted-foreground'>
                      {item.variant.name}
                    </p>
                  )}
                  <p className='text-sm text-orange-500'>
                    {formatCurrency(item.lineTotal)}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={() =>
                      updateCartItemQuantity(index, item.quantity - 1)
                    }
                  >
                    -
                  </Button>
                  <span className='w-6 text-center'>{item.quantity}</span>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-7 w-7'
                    onClick={() =>
                      updateCartItemQuantity(index, item.quantity + 1)
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals */}
      <div className='space-y-3 border-t bg-muted/10 p-4'>
        {cart.total > 0 && (
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>New Items</span>
            <span>{formatCurrency(cart.total)}</span>
          </div>
        )}
        <div className='flex justify-between text-lg font-bold'>
          <span>Grand Total</span>
          <span className='text-orange-500'>{formatCurrency(grandTotal)}</span>
        </div>

        <div className='grid gap-2 pt-2'>
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
