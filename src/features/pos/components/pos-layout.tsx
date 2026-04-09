import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Keyboard,
  Loader2,
  LayoutDashboard,
  ShoppingCart,
  Scan,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
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
import { getPosProducts } from '../data/api'
import { useBasket } from '../store/use-basket'
import { BarcodeScannerListener } from './barcode-scanner-listener'
import { BasketView } from './basket-view'
import { ManualSkuDialog } from './manual-sku-dialog'
import { ShiftDashboard } from './shift-dashboard'
import { VariantSelectionDialog } from './variant-selection-dialog'

export function PosLayout() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('checkout')
  const [isManualSkuOpen, setIsManualSkuOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isBasketOpen, setIsBasketOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<
    NonNullable<typeof products>[number] | null
  >(null)

  const { addItem, items } = useBasket()

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

  const handleProductClick = (
    product: NonNullable<typeof products>[number]
  ) => {
    if (product.has_variants && product.product_variants?.length > 0) {
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
  }

  const handleScan = (barcodeOrSku: string) => {
    if (!products) return

    // Priority 1: Check variants first (as requested)
    for (const p of products) {
      if (p.has_variants && p.product_variants) {
        const variant = p.product_variants.find(
          (v) =>
            v.barcode === barcodeOrSku ||
            v.sku.toLowerCase() === barcodeOrSku.toLowerCase()
        )
        if (variant) {
          const price = variant.price

          addItem({
            productId: p.product_id,
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

    if (
      product &&
      (!product.has_variants || product.product_variants.length === 0)
    ) {
      handleProductClick(product)
      toast.success(`Added ${product.name}`)
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
          <TabsList className='grid w-full max-w-md grid-cols-2'>
            <TabsTrigger value='checkout' className='gap-2'>
              <ShoppingCart className='h-4 w-4' />
              Checkout
            </TabsTrigger>
            <TabsTrigger value='dashboard' className='gap-2'>
              <LayoutDashboard className='h-4 w-4' />
              Shift Dashboard
            </TabsTrigger>
          </TabsList>

          {activeTab === 'checkout' && (
            <div className='flex flex-1 items-center justify-end gap-2 sm:gap-4'>
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
            <div className='flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm'>
              <div className='flex-1 overflow-y-auto p-4'>
                {isLoading ? (
                  <div className='flex h-full items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                  </div>
                ) : (
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.product_id}
                        className='cursor-pointer transition-colors hover:border-primary active:scale-95'
                        onClick={() => handleProductClick(product)}
                      >
                        <CardContent className='flex aspect-square flex-col justify-between p-4'>
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
                        </CardContent>
                      </Card>
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
          className='mt-0 flex-1 overflow-y-auto rounded-lg border bg-white shadow-sm outline-none'
        >
          <ShiftDashboard />
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
          onSelect={(variant, priceToUse) => {
            addItem({
              productId: selectedProductForVariant.product_id,
              name: `${selectedProductForVariant.name} - ${variant.dimensions || variant.sku}`,
              sku: variant.sku,
              barcode: variant.barcode,
              unitPrice: priceToUse,
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
