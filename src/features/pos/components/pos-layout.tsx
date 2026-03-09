import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Keyboard,
  Loader2,
  LayoutDashboard,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPosProducts } from '../data/api'
import { useBasket } from '../store/use-basket'
import { BarcodeScannerListener } from './barcode-scanner-listener'
import { BasketView } from './basket-view'
import { ManualSkuDialog } from './manual-sku-dialog'
import { ShiftDashboard } from './shift-dashboard'

export function PosLayout() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('checkout')
  const [isManualSkuOpen, setIsManualSkuOpen] = useState(false)
  const { addItem } = useBasket()

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

    const product = products.find(
      (p) =>
        p.barcode === barcodeOrSku ||
        p.sku.toLowerCase() === barcodeOrSku.toLowerCase()
    )

    if (product) {
      handleProductClick(product)
      toast.success(`Added ${product.name}`)
    } else {
      toast.error(`Product not found: ${barcodeOrSku}`)
    }
  }

  return (
    <div className='flex h-[calc(100vh-4rem)] flex-col bg-muted/20 p-4'>
      <BarcodeScannerListener onScan={handleScan} />

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
            <div className='flex flex-1 items-center gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Search products or scan...'
                  className='h-10 pl-10'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant='outline'
                className='h-10 px-4'
                onClick={() => setIsManualSkuOpen(true)}
              >
                <Keyboard className='mr-2 h-4 w-4' />
                Manual SKU
              </Button>
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
                              {formatCurrency(product.base_price)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar: Basket */}
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
    </div>
  )
}
