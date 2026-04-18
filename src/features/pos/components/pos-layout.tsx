import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, useUser } from '@clerk/clerk-react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import {
  Search,
  Keyboard,
  Loader2,
  LayoutDashboard,
  ShoppingCart,
  Scan,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import {
  getPosProducts,
  type PosProduct,
  type PosProductVariant,
} from '../data/api'
import {
  useCreatePosReorderRequest,
  usePosReorderRealtime,
} from '../hooks/use-pos-reorder-requests'
import { useBasket } from '../store/use-basket'
import { getProductStockFlags, isVariantSellable } from '../utils/stock'
import { BarcodeScannerListener } from './barcode-scanner-listener'
import { BasketView } from './basket-view'
import { ManualSkuDialog } from './manual-sku-dialog'
import { ReorderNotificationsBell } from './reorder-notifications-bell'
import { ShiftDashboard } from './shift-dashboard'
import { VariantSelectionDialog } from './variant-selection-dialog'
import { NonRestaurantShipmentsBoard } from './non-restaurant-shipments-board'

export function PosLayout() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('checkout')
  const [isManualSkuOpen, setIsManualSkuOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isBasketOpen, setIsBasketOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] =
    useState<PosProduct | null>(null)
  const acknowledgedRequestIdsRef = useRef<Set<string>>(new Set())

  const { isLoaded: authLoaded, isSignedIn, has } = useAuth()
  const { user } = useUser()
  const { addItem, items } = useBasket()
  const createReorderRequest = useCreatePosReorderRequest()

  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products'],
    queryFn: getPosProducts,
  })

  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!searchQuery) return products
    const lowerQ = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQ) ||
        p.sku.toLowerCase().includes(lowerQ)
    )
  }, [products, searchQuery])

  const requesterRole = useMemo(() => {
    const metadataRole = (user?.publicMetadata as { role?: unknown } | null)
      ?.role

    if (typeof metadataRole === 'string' && metadataRole.length > 0) {
      return metadataRole
    }

    if (!authLoaded || !isSignedIn) return 'employee'
    if (has({ role: 'super_admin' }) || has({ role: 'org:super_admin' })) {
      return 'super_admin'
    }
    if (has({ role: 'admin' }) || has({ role: 'org:admin' })) return 'admin'

    return 'employee'
  }, [authLoaded, has, isSignedIn, user?.publicMetadata])

  const handleEmployeeRequestRead = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const nextRow = payload.new ?? {}
      const previousRow = payload.old ?? {}
      const requestId = String(nextRow.id ?? '')
      const nextStatus = String(nextRow.status ?? '')
      const previousStatus = String(previousRow.status ?? '')

      if (!requestId || nextStatus !== 'read' || previousStatus === 'read') {
        return
      }

      if (acknowledgedRequestIdsRef.current.has(requestId)) return
      acknowledgedRequestIdsRef.current.add(requestId)

      toast.success('Admin acknowledged your reorder request.')
    },
    []
  )

  usePosReorderRealtime({
    enabled: !!user?.id,
    employeeClerkUserId: user?.id,
    onEmployeeRequestRead: handleEmployeeRequestRead,
  })

  const handleNotifyAdmin = useCallback(
    (product: PosProduct, variant: PosProductVariant | null) => {
      if (!user?.id) {
        toast.error('Please sign in before sending a reorder request.')
        return
      }

      createReorderRequest.mutate(
        {
          product_id: product.product_id,
          product_variant_id: variant?.id ?? null,
          requested_by_clerk_user_id: user.id,
          requested_by_name:
            user.fullName || user.primaryEmailAddress?.emailAddress || user.id,
          requested_by_role: requesterRole,
          requested_quantity: variant?.stock_quantity ?? null,
          requested_min_stock: variant?.min_stock ?? null,
        },
        {
          onSuccess: (result) => {
            if (result.duplicate) {
              toast.info('A pending reorder request already exists.')
              return
            }
            toast.success('Admin has been notified to reorder this item.')
          },
          onError: (error: Error) => {
            toast.error(`Failed to notify admin: ${error.message}`)
          },
        }
      )
    },
    [createReorderRequest, requesterRole, user]
  )

  const handleProductClick = (product: PosProduct) => {
    const hasVariants = (product.product_variants?.length ?? 0) > 0
    const { hasSellableVariants } = getProductStockFlags(product.product_variants)

    if (hasVariants && !hasSellableVariants) {
      toast.error(`${product.name} is low stock and currently unavailable.`)
      return
    }

    if (hasVariants) {
      setSelectedProductForVariant(product)
      setIsVariantDialogOpen(true)
      return
    }

    addItem({
      productId: product.product_id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitPrice: product.base_price,
      quantity: 1,
    })
    toast.success(`Added ${product.name}`)
  }

  const handleScan = (barcodeOrSku: string) => {
    if (!products) return

    // Priority 1: Check variants first (as requested)
    for (const p of products) {
      if (p.product_variants?.length > 0) {
        const variant = p.product_variants.find(
          (v) =>
            v.barcode === barcodeOrSku ||
            v.sku.toLowerCase() === barcodeOrSku.toLowerCase()
        )
        if (variant) {
          if (!isVariantSellable(variant)) {
            toast.error(
              `Cannot add ${p.name} (${variant.dimensions || variant.sku}): low stock.`
            )
            return
          }

          const price = Number(variant.price ?? p.base_price)

          addItem({
            productId: p.product_id,
            productVariantId: variant.id,
            name: `${p.name} - ${variant.dimensions || variant.sku}`,
            sku: variant.sku,
            barcode: variant.barcode,
            unitPrice: price,
            quantity: 1,
          })
          toast.success(
            `Added ${p.name} (${variant.dimensions || variant.sku})`
          )
          return
        }
      }
    }

    // Priority 2: Check main product if no variant matched
    const product = products.find(
      (p) =>
        p.barcode === barcodeOrSku ||
        p.sku.toLowerCase() === barcodeOrSku.toLowerCase()
    )

    if (product) {
      handleProductClick(product)
      return
    }

    toast.error(`Product not found: ${barcodeOrSku}`)
  }

  return (
    <div className='flex h-[calc(100vh-4rem)] flex-col bg-muted/20 p-4'>
      <BarcodeScannerListener onScan={handleScan} />
      <QRCodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
        allowMultiple
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex flex-1 flex-col'
      >
        <div className='mb-4 flex items-center justify-between gap-4'>
          <TabsList className='grid w-full max-w-xl grid-cols-3'>
            <TabsTrigger value='checkout' className='gap-2'>
              <ShoppingCart className='h-4 w-4' />
              Checkout
            </TabsTrigger>
            <TabsTrigger value='dashboard' className='gap-2'>
              <LayoutDashboard className='h-4 w-4' />
              Shift Dashboard
            </TabsTrigger>
            <TabsTrigger value='shipments' className='gap-2'>
              <Truck className='h-4 w-4' />
              Shipments
            </TabsTrigger>
          </TabsList>

          {activeTab === 'checkout' && (
            <div className='flex flex-1 items-center justify-end gap-2 sm:gap-4'>
              <ReorderNotificationsBell />

              <div
                className={`relative flex transition-all duration-300 ${
                  isSearchExpanded
                    ? 'absolute inset-x-0 z-10 flex-1 px-4 sm:relative sm:inset-auto sm:px-0'
                    : 'w-10 sm:flex-1'
                }`}
              >
                {isSearchExpanded ? (
                  <div className='flex w-full items-center gap-2 rounded-md bg-background py-1 sm:bg-transparent sm:py-0'>
                    <div className='relative flex-1'>
                      <Search className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        autoFocus
                        placeholder='Search products...'
                        className='h-10 pl-10'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() =>
                          !searchQuery && setIsSearchExpanded(false)
                        }
                      />
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='sm:hidden'
                      onClick={() => setIsSearchExpanded(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant='outline'
                      size='icon'
                      className='h-10 w-10 sm:hidden'
                      onClick={() => setIsSearchExpanded(true)}
                    >
                      <Search className='h-4 w-4' />
                    </Button>
                    <div className='relative hidden flex-1 sm:block'>
                      <Search className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
                      <Input
                        placeholder='Search products...'
                        className='h-10 pl-10'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {!isSearchExpanded && (
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-10 w-10 sm:hidden'
                    onClick={() => setIsManualSkuOpen(true)}
                    title='Manual SKU'
                  >
                    <Keyboard className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    className='hidden h-10 px-4 sm:flex'
                    onClick={() => setIsManualSkuOpen(true)}
                  >
                    <Keyboard className='mr-2 h-4 w-4' />
                    Manual SKU
                  </Button>

                  <Button
                    variant='outline'
                    size='icon'
                    className='h-10 w-10 sm:hidden'
                    onClick={() => setIsScannerOpen(true)}
                    title='Scan'
                  >
                    <Scan className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    className='hidden h-10 px-4 sm:flex'
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <Scan className='mr-2 h-4 w-4' />
                    Scan
                  </Button>

                  <Sheet open={isBasketOpen} onOpenChange={setIsBasketOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        className='relative h-10 w-10 md:hidden'
                        title='View Basket'
                      >
                        <ShoppingCart className='h-4 w-4' />
                        {items.length > 0 && (
                          <span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground'>
                            {items.length}
                          </span>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side='right'
                      className='w-full p-0 sm:max-w-md'
                    >
                      <SheetHeader className='sr-only'>
                        <SheetTitle>Current Basket</SheetTitle>
                      </SheetHeader>
                      <BasketView />
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>
          )}
        </div>

        <TabsContent value='checkout' className='mt-0 flex-1 outline-none'>
          <div className='flex h-full gap-4 overflow-hidden'>
            {/* Main Catalog Area */}
            <div className='flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm'>
              <div className='flex-1 overflow-y-auto p-4'>
                {isLoading ? (
                  <div className='flex h-full items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                  </div>
                ) : (
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                    {filteredProducts.map((product) => (
                      (() => {
                        const hasVariants =
                          (product.product_variants?.length ?? 0) > 0
                        const { hasLowStockVariants, hasSellableVariants } =
                          hasVariants
                            ? getProductStockFlags(product.product_variants)
                            : {
                                hasLowStockVariants: false,
                                hasSellableVariants: true,
                              }
                        const firstLowVariant =
                          product.product_variants.find(
                            (variant) => !isVariantSellable(variant)
                          ) ?? null

                        return (
                          <Card
                            key={product.product_id}
                            className={cn(
                              'relative transition-colors',
                              hasSellableVariants
                                ? 'cursor-pointer hover:border-primary active:scale-95'
                                : 'cursor-not-allowed border-destructive/50 opacity-70'
                            )}
                            onClick={() => handleProductClick(product)}
                          >
                            {hasLowStockVariants && (
                              <span className='absolute top-0 right-0 left-0 h-1 rounded-t-lg bg-destructive' />
                            )}
                            <CardContent className='flex aspect-square flex-col justify-between gap-2 p-4'>
                              <div className='line-clamp-2 font-semibold'>
                                {product.name}
                              </div>
                              <div>
                                <div className='mb-1 text-sm text-muted-foreground'>
                                  {product.sku}
                                </div>
                                <div className='text-lg font-bold'>
                                  {product.has_variants &&
                                  product.product_variants &&
                                  product.product_variants.length > 0
                                    ? formatCurrency(
                                        Math.min(
                                          ...product.product_variants.map((v) =>
                                            Number(v.price)
                                          )
                                        )
                                      )
                                    : formatCurrency(product.base_price)}
                                </div>
                              </div>
                              {hasLowStockVariants && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='h-7 border-destructive/50 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive'
                                  disabled={createReorderRequest.isPending}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleNotifyAdmin(product, firstLowVariant)
                                  }}
                                >
                                  Notify Admin
                                </Button>
                              )}
                              {!hasSellableVariants && (
                                <p className='text-xs font-medium text-destructive'>
                                  Low stock - unavailable
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar: Basket (Desktop only) */}
            <div className='hidden w-full max-w-sm md:block'>
              <BasketView />
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value='dashboard'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card shadow-sm outline-none'
        >
          <ShiftDashboard />
        </TabsContent>

        <TabsContent
          value='shipments'
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-card p-4 shadow-sm outline-none'
        >
          <NonRestaurantShipmentsBoard variant='embedded' context='pos' />
        </TabsContent>
      </Tabs>

      <ManualSkuDialog
        open={isManualSkuOpen}
        onOpenChange={setIsManualSkuOpen}
        onSearch={handleScan}
      />

      {selectedProductForVariant && (
        <VariantSelectionDialog
          open={isVariantDialogOpen}
          onOpenChange={setIsVariantDialogOpen}
          productName={selectedProductForVariant.name}
          variants={selectedProductForVariant.product_variants}
          isVariantDisabled={(variant) => !isVariantSellable(variant)}
          onSelect={(variantId, variant) => {
            if (!isVariantSellable(variant)) {
              toast.error('This variant is low stock and unavailable.')
              return
            }

            addItem({
              productId: selectedProductForVariant.product_id,
              productVariantId: variantId,
              name: `${selectedProductForVariant.name} - ${variant.dimensions || variant.sku}`,
              sku: variant.sku,
              barcode: variant.barcode,
              unitPrice: Number(
                variant.price ?? selectedProductForVariant.base_price
              ),
              quantity: 1,
            })
            toast.success(
              `Added ${selectedProductForVariant.name} (${variant.dimensions || variant.sku})`
            )
          }}
        />
      )}
    </div>
  )
}
