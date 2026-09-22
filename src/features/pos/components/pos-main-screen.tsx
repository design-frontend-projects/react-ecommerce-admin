import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Ban,
  Building,
  Check,
  ChevronDown,
  ChevronsUpDown,
  DollarSign,
  Keyboard,
  Loader2,
  Lock,
  PauseCircle,
  RotateCcw,
  Scan,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { QRCodeScanner } from '@/components/custom-ui/qr-code-scanner'
import {
  usePosProductsQuery,
  usePosTerminals,
  usePosTerminalStatus,
} from '../hooks/use-pos-queries'
import { usePosStore } from '../store/use-pos-store'
import { BarcodeScannerListener } from './barcode-scanner-listener'
import { ManualSkuDialog } from './manual-sku-dialog'
import { PosCart } from './pos-cart'
import { PosCashMovementDialog } from './pos-cash-movement-dialog'
import { PosCheckoutDialog } from './pos-checkout-dialog'
import { PosHeldOrdersDialog } from './pos-held-orders-dialog'
import { PosReceiptDialog, type ReceiptData } from './pos-receipt-dialog'
import { PosReturnsDialog } from './pos-returns-dialog'
import { PosSessionDialog } from './pos-session-dialog'
import { VariantSelectionDialog } from './variant-selection-dialog'

export function PosMainScreen() {
  const { t } = useTranslation()
  const {
    terminal,
    session,
    setTerminal,
    setSession,
    items,
    addItem,
    heldOrders,
    getTotalAmount,
    getItemCount,
  } = usePosStore()

  // Queries
  const { data: terminals = [], isLoading: isLoadingTerminals } =
    usePosTerminals()
  const { data: terminalStatus, refetch: refetchStatus } = usePosTerminalStatus(
    terminal?.id
  )

  // Catalog search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Dialog visibility states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [sessionModalMode, setSessionModalMode] = useState<'open' | 'close'>(
    'open'
  )
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false)
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false)
  const [heldOrdersMode, setHeldOrdersMode] = useState<'view' | 'hold'>('view')
  const [isReturnsOpen, setIsReturnsOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isManualSkuOpen, setIsManualSkuOpen] = useState(false)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

  // Multi-variant dialog state
  const [isVariantOpen, setIsVariantOpen] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] =
    useState<any>(null)

  // Auto-select first terminal if none active
  useEffect(() => {
    if (!terminal && terminals.length > 0) {
      const defaultTerm = terminals[0]
      setTerminal({
        id: defaultTerm.id,
        name: defaultTerm.name,
        code: defaultTerm.code,
        storeId: defaultTerm.storeId,
        branchId: defaultTerm.branchId,
        warehouseId: defaultTerm.warehouseId,
        defaultPriceListId: defaultTerm.defaultPriceListId,
      })
    }
  }, [terminal, terminals, setTerminal])

  // Sync active session from backend status
  useEffect(() => {
    if (terminalStatus?.activeSession) {
      if (session?.id !== terminalStatus.activeSession.id) {
        setSession({
          id: terminalStatus.activeSession.id,
          status: 'open',
          openedAt: terminalStatus.activeSession.opened_at,
          openingCash: Number(terminalStatus.activeSession.opening_cash || 0),
          cashierName: terminalStatus.activeSession.cashier_name || 'Cashier',
        })
      }
    } else if (terminalStatus && !terminalStatus.activeSession && session !== null) {
      setSession(null)
    }
  }, [terminalStatus, session, setSession])

  // Query products with live warehouse stock (store-aware)
  const { data: catalogData, isLoading: isLoadingProducts } =
    usePosProductsQuery({
      q: searchQuery,
      categoryId: selectedCategory ?? undefined,
      warehouseId: terminal?.warehouseId ?? undefined,
      storeId: terminal?.storeId ?? undefined,
      pageSize: 60,
    })

  const catalogItems = catalogData?.items
  const rawItems = useMemo(
    () => catalogItems ?? [],
    [catalogItems]
  )

  // Group variants by product for card grid display
  const groupedProducts = useMemo(() => {
    const map = new Map<string, any>()

    for (const item of rawItems) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          categoryName: item.categoryName,
          brandName: item.brandName,
          imageUrl: item.imageUrl,
          variants: [],
          minPrice: Number(item.basePrice),
          maxPrice: Number(item.basePrice),
          totalStock: 0,
        })
      }

      const p = map.get(item.productId)!
      const price = Number(item.basePrice)
      const stock = Number(item.stockAvailable || item.stockOnHand || 0)

      p.minPrice = Math.min(p.minPrice, price)
      p.maxPrice = Math.max(p.maxPrice, price)
      p.totalStock += stock

      p.variants.push({
        id: item.productVariantId,
        sku: item.sku,
        barcode: item.barcode,
        price,
        stock_quantity: stock,
        stockAvailable: Number(item.stockAvailable || 0),
        stockOnHand: Number(item.stockOnHand || 0),
        variantName: item.variantName,
        taxRateId: item.taxRateId,
        taxRate: Number(item.taxRate || 0),
        taxInclusive: item.taxInclusive,
        dimensions: item.variantAttributes,
      })
    }

    return Array.from(map.values())
  }, [rawItems])

  // Category pills: prefer server-returned catalog categories, fallback to current items
  const catalogCategories = catalogData?.categories
  const categories = useMemo(() => {
    if (catalogCategories && catalogCategories.length > 0) {
      return catalogCategories.map((c) => c.name)
    }
    const set = new Set<string>()
    for (const item of rawItems) {
      if (item.categoryName) set.add(item.categoryName)
    }
    return Array.from(set)
  }, [catalogCategories, rawItems])

  // Keyboard shortcuts (F2: Search, F4: Hold, F8: Cash In/Out, F9: Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts inside open modals
      if (
        isCheckoutOpen ||
        isReceiptOpen ||
        isSessionOpen ||
        isCashMovementOpen ||
        isHeldOrdersOpen ||
        isReturnsOpen
      ) {
        return
      }

      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (items.length > 0) {
          setHeldOrdersMode('hold')
          setIsHeldOrdersOpen(true)
        }
      } else if (e.key === 'F8') {
        e.preventDefault()
        setIsCashMovementOpen(true)
      } else if (e.key === 'F9') {
        e.preventDefault()
        if (items.length > 0) {
          setIsCheckoutOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    items.length,
    isCheckoutOpen,
    isReceiptOpen,
    isSessionOpen,
    isCashMovementOpen,
    isHeldOrdersOpen,
    isReturnsOpen,
  ])

  // Add line item directly
  const handleAddVariant = useCallback(
    (product: any, variant: any) => {
      const stockAvail = variant.stockAvailable ?? variant.stock_quantity ?? 0
      if (stockAvail <= 0) {
        toast.error(
          t('pos.main.outOfStockToast', '{{name}} is out of stock', {
            name: product.productName,
          })
        )
        return
      }

      addItem({
        productId: product.productId,
        productVariantId: variant.id,
        name:
          variant.variantName && variant.variantName !== 'Default'
            ? `${product.productName} (${variant.variantName})`
            : product.productName,
        sku: variant.sku,
        barcode: variant.barcode,
        unitPrice: variant.price,
        quantity: 1,
        availableQuantity: stockAvail,
        taxRateId: variant.taxRateId,
        taxRate: variant.taxRate,
        taxInclusive: variant.taxInclusive,
      })
      toast.success(
        t('pos.main.addedToast', 'Added {{name}}', {
          name: product.productName,
        })
      )
    },
    [addItem, t]
  )

  // Category combobox state
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)

  // Card click handler
  const handleProductCardClick = (product: any) => {
    // Block clicks on out-of-stock items
    if (product.totalStock <= 0) return

    if (product.variants.length === 1) {
      handleAddVariant(product, product.variants[0])
    } else {
      setSelectedProductForVariant(product)
      setIsVariantOpen(true)
    }
  }

  // Handle hardware or camera barcode scan
  const handleBarcodeScan = (barcodeOrSku: string) => {
    if (!barcodeOrSku) return
    const code = barcodeOrSku.trim().toLowerCase()

    // 1. Look for variant match
    for (const p of groupedProducts) {
      const match = p.variants.find(
        (v: any) =>
          v.barcode?.toLowerCase() === code || v.sku.toLowerCase() === code
      )
      if (match) {
        handleAddVariant(p, match)
        return
      }
    }

    // 2. Search query fallback
    setSearchQuery(barcodeOrSku)
    toast.info(
      t('pos.main.filteredCatalogToast', 'Filtered catalog for: {{query}}', {
        query: barcodeOrSku,
      })
    )
  }

  const handleCheckoutSuccess = (receipt: ReceiptData) => {
    setLastReceipt(receipt)
    setIsReceiptOpen(true)
    refetchStatus()
  }

  return (
    <div className='flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background'>
      {/* Scanner & Shortcut Listeners */}
      <BarcodeScannerListener onScan={handleBarcodeScan} />
      <QRCodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleBarcodeScan}
        allowMultiple
      />

      {/* ── Top POS Control Bar ── */}
      <header className='flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-2 shadow-xs'>
        {/* Terminal & Store Badge */}
        <div className='flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                disabled={isLoadingTerminals}
                className='h-8 gap-2 border-primary/20 text-xs font-semibold hover:border-primary'
              >
                {isLoadingTerminals ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                ) : (
                  <Building className='h-3.5 w-3.5 text-primary' />
                )}
                <span className='max-w-[140px] truncate sm:max-w-[200px]'>
                  {isLoadingTerminals
                    ? t('pos.main.loadingTerminals', 'Loading...')
                    : terminal
                      ? `${terminal.code} • ${terminal.name}`
                      : t('pos.main.selectTerminal', 'Select Terminal')}
                </span>
                <ChevronDown className='h-3.5 w-3.5 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-64'>
              <DropdownMenuLabel className='text-xs'>
                {t('pos.main.assignedTerminals', 'Assigned Terminals')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {terminals.map((tItem) => (
                <DropdownMenuItem
                  key={tItem.id}
                  onClick={() =>
                    setTerminal({
                      id: tItem.id,
                      name: tItem.name,
                      code: tItem.code,
                      storeId: tItem.storeId,
                      branchId: tItem.branchId,
                      warehouseId: tItem.warehouseId,
                      defaultPriceListId: tItem.defaultPriceListId,
                    })
                  }
                  className='flex cursor-pointer items-center justify-between text-xs'
                >
                  <span className='font-semibold'>
                    {tItem.code} - {tItem.name}
                  </span>
                  {tItem.hasActiveSession && (
                    <Badge
                      variant='outline'
                      className='border-emerald-500/40 text-[9px] text-emerald-600'
                    >
                      {t('pos.main.active', 'Active')}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Session Status Pill */}
          {session ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setSessionModalMode('close')
                setIsSessionOpen(true)
              }}
              className='h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'
            >
              <span className='h-2 w-2 animate-pulse rounded-full bg-emerald-500' />
              <span className='hidden sm:inline'>{t('pos.main.shiftOpen', 'Shift: Open •')}</span>
              <span>{session.cashierName || 'Cashier'}</span>
            </Button>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setSessionModalMode('open')
                setIsSessionOpen(true)
              }}
              className='h-8 gap-1.5 border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400'
            >
              <Lock className='h-3.5 w-3.5' />
              <span>{t('pos.main.shiftClosed', 'Shift Closed (Click to Open)')}</span>
            </Button>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className='flex items-center gap-1.5 sm:gap-2'>
          {/* Cash Movement */}
          <Button
            variant='outline'
            size='sm'
            disabled={!session}
            onClick={() => setIsCashMovementOpen(true)}
            className='h-8 gap-1.5 text-xs'
            title={t('pos.main.cashInOutShort', 'Cash In / Out (F8)')}
          >
            <DollarSign className='h-3.5 w-3.5 text-emerald-600' />
            <span className='hidden md:inline'>{t('pos.main.cashInOut', 'Cash In/Out')}</span>
          </Button>

          {/* Suspended / Held Orders */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setHeldOrdersMode('view')
              setIsHeldOrdersOpen(true)
            }}
            className='relative h-8 gap-1.5 text-xs'
            title={t('pos.main.viewHeldCarts', 'View Held Carts')}
          >
            <PauseCircle className='h-3.5 w-3.5 text-amber-500' />
            <span className='hidden md:inline'>{t('pos.main.heldOrders', 'Held Orders')}</span>
            {heldOrders.length > 0 && (
              <span className='flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white'>
                {heldOrders.length}
              </span>
            )}
          </Button>

          {/* Returns & Refunds */}
          <Button
            variant='outline'
            size='sm'
            disabled={!session}
            onClick={() => setIsReturnsOpen(true)}
            className='h-8 gap-1.5 border-rose-500/30 text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
            title={t('pos.main.returnsRefunds', 'Returns & Refunds')}
          >
            <RotateCcw className='h-3.5 w-3.5' />
            <span className='hidden md:inline'>{t('pos.main.returns', 'Returns')}</span>
          </Button>

          {/* Barcode & Manual SKU Tools */}
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 sm:hidden'
            onClick={() => setIsManualSkuOpen(true)}
            title={t('pos.main.manualSku', 'Manual SKU')}
          >
            <Keyboard className='h-3.5 w-3.5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 sm:hidden'
            onClick={() => setIsScannerOpen(true)}
            title={t('pos.main.cameraScan', 'Camera Scan')}
          >
            <Scan className='h-3.5 w-3.5' />
          </Button>

          {/* Mobile Cart Trigger Sheet */}
          <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
            <SheetTrigger asChild>
              <Button
                size='sm'
                className='relative h-8 gap-1.5 bg-primary px-2.5 font-bold text-primary-foreground lg:hidden'
              >
                <ShoppingCart className='h-4 w-4' />
                <span>{formatCurrency(getTotalAmount())}</span>
                {items.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-0.5 h-4 px-1 text-[10px]'
                  >
                    {getItemCount()}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-full p-0 sm:max-w-md'>
              <SheetHeader className='sr-only'>
                <SheetTitle>{t('pos.main.shoppingCart', 'Shopping Cart')}</SheetTitle>
              </SheetHeader>
              <PosCart
                onOpenCheckout={() => {
                  setIsMobileCartOpen(false)
                  setIsCheckoutOpen(true)
                }}
                onOpenHold={() => {
                  setIsMobileCartOpen(false)
                  setHeldOrdersMode('hold')
                  setIsHeldOrdersOpen(true)
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Main Catalog & Cart Layout ── */}
      <div className='flex flex-1 gap-3 overflow-hidden p-3'>
        {/* Left / Center: Catalog, Search & Categories */}
        <div className='flex flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-xs'>
          {/* Search bar & Action triggers */}
          <div className='space-y-2 border-b bg-muted/10 p-3'>
            <div className='flex items-center gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  ref={searchInputRef}
                  placeholder={t('pos.main.searchPlaceholder', 'Search by item name, SKU, or barcode (F2)...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='h-10 pl-9 text-sm font-medium'
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='absolute top-1/2 right-1 h-7 -translate-y-1/2 px-2 text-xs'
                    onClick={() => setSearchQuery('')}
                  >
                    {t('pos.main.clear', 'Clear')}
                  </Button>
                )}
              </div>

              <Button
                variant='outline'
                className='hidden h-10 gap-1.5 px-3 text-xs sm:flex'
                onClick={() => setIsManualSkuOpen(true)}
              >
                <Keyboard className='h-4 w-4' /> {t('pos.main.manualSku', 'Manual SKU')}
              </Button>

              <Button
                variant='outline'
                className='hidden h-10 gap-1.5 px-3 text-xs sm:flex'
                onClick={() => setIsScannerOpen(true)}
              >
                <Scan className='h-4 w-4' /> {t('pos.main.cameraScan', 'Camera')}
              </Button>
            </div>

            {/* Category Dropdown with Filter */}
            {categories.length > 0 && (
              <div className='flex items-center gap-2 py-1'>
                <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      role='combobox'
                      aria-expanded={isCategoryOpen}
                      size='sm'
                      className='h-8 w-[220px] justify-between text-xs font-medium'
                    >
                      <span className='truncate'>
                        {selectedCategory ?? t('pos.main.allCategories', 'All Categories')}
                      </span>
                      <ChevronsUpDown className='ml-1 h-3.5 w-3.5 shrink-0 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-[220px] p-0' align='start'>
                    <Command>
                      <CommandInput placeholder={t('pos.main.filterCategories', 'Filter categories...')} className='h-8 text-xs' />
                      <CommandList>
                        <CommandEmpty>{t('pos.main.noCategoryFound', 'No category found.')}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value='__all__'
                            onSelect={() => {
                              setSelectedCategory(null)
                              setIsCategoryOpen(false)
                            }}
                            className='text-xs'
                          >
                            <Check
                              className={cn(
                                'mr-2 h-3.5 w-3.5',
                                selectedCategory === null ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {t('pos.main.allCategories', 'All Categories')}
                          </CommandItem>
                          {categories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                setSelectedCategory(
                                  selectedCategory === cat ? null : cat
                                )
                                setIsCategoryOpen(false)
                              }}
                              className='text-xs'
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3.5 w-3.5',
                                  selectedCategory === cat ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {cat}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCategory && (
                  <Badge
                    variant='secondary'
                    className='h-6 gap-1 px-2 text-[10px] cursor-pointer hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => setSelectedCategory(null)}
                  >
                    {selectedCategory}
                    <span className='text-xs'>×</span>
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Product Cards Grid */}
          <div className='relative flex-1 overflow-y-auto p-3'>
            {/* Shift-closed overlay — blocks interaction until shift is opened */}
            {!session && (
              <div className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-2 ring-amber-500/30'>
                  <Lock className='h-8 w-8 text-amber-600 dark:text-amber-400' />
                </div>
                <div className='text-center space-y-1'>
                  <h3 className='text-lg font-bold tracking-tight'>{t('pos.main.shiftNotOpen', 'Shift Not Open')}</h3>
                  <p className='text-sm text-muted-foreground max-w-xs'>
                    {t('pos.main.shiftNotOpenDesc', 'You must open a shift before you can create orders or add items to the cart.')}
                  </p>
                </div>
                <Button
                  size='sm'
                  className='gap-2 font-semibold'
                  onClick={() => {
                    setSessionModalMode('open')
                    setIsSessionOpen(true)
                  }}
                >
                  <Lock className='h-4 w-4' />
                  {t('pos.main.openShiftNow', 'Open Shift Now')}
                </Button>
              </div>
            )}

            {isLoadingProducts ? (
              <div className='flex h-full items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : groupedProducts.length === 0 ? (
              <div className='flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground'>
                <AlertTriangle className='mb-2 h-10 w-10 opacity-30' />
                <p className='text-sm font-semibold'>{t('pos.main.noProductsFound', 'No products found')}</p>
                <p className='mt-1 text-xs'>
                  {t('pos.main.noProductsFoundDesc', 'Try a different search term or select another category.')}
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
                {groupedProducts.map((p) => {
                  const hasStock = p.totalStock > 0
                  const isLowStock = p.totalStock > 0 && p.totalStock <= 5

                  return (
                    <Card
                      key={p.productId}
                      onClick={() => handleProductCardClick(p)}
                      className={cn(
                        'group relative flex flex-col justify-between overflow-hidden transition-all select-none',
                        hasStock
                          ? 'cursor-pointer hover:border-primary hover:shadow-md active:scale-[0.98]'
                          : 'pointer-events-none cursor-not-allowed opacity-50 grayscale'
                      )}
                    >
                      {/* Stock status indicator stripe */}
                      <span
                        className={cn(
                          'absolute top-0 right-0 left-0 h-1',
                          !hasStock
                            ? 'bg-rose-500'
                            : isLowStock
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        )}
                      />

                      {/* Out-of-stock overlay badge */}
                      {!hasStock && (
                        <div className='absolute inset-0 z-10 flex items-center justify-center'>
                          <Badge
                            variant='destructive'
                            className='gap-1 px-2 py-1 text-[10px] font-bold uppercase shadow-lg'
                          >
                            <Ban className='h-3 w-3' />
                            {t('pos.main.outOfStockBadge', 'Out of Stock')}
                          </Badge>
                        </div>
                      )}

                      <CardContent className='flex h-full flex-col justify-between space-y-2 p-3'>
                        <div>
                          {p.categoryName && (
                            <span className='mb-0.5 line-clamp-1 block text-[10px] font-bold tracking-wider text-muted-foreground uppercase'>
                              {p.categoryName}
                            </span>
                          )}
                          <h4 className='line-clamp-2 text-xs leading-snug font-bold transition-colors group-hover:text-primary'>
                            {p.productName}
                          </h4>
                        </div>

                        <div className='space-y-1.5 border-t border-muted/50 pt-2'>
                          <div className='flex items-baseline justify-between'>
                            <span className='text-sm font-extrabold text-foreground'>
                              {p.variants.length > 1 &&
                              p.minPrice !== p.maxPrice
                                ? `${formatCurrency(p.minPrice)} - ${formatCurrency(p.maxPrice)}`
                                : formatCurrency(p.minPrice)}
                            </span>
                          </div>

                          <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                            {p.variants.length > 1 ? (
                              <Badge
                                variant='outline'
                                className='h-4 border-primary/30 px-1 text-[9px] font-semibold text-primary'
                              >
                                {t('pos.main.variantCount', '{{count}} Variants', { count: p.variants.length })}
                              </Badge>
                            ) : (
                              <span className='truncate'>
                                {p.variants[0]?.sku}
                              </span>
                            )}

                            <span
                              className={cn(
                                'font-semibold',
                                !hasStock
                                  ? 'text-rose-500'
                                  : isLowStock
                                    ? 'text-amber-500'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              )}
                            >
                              {hasStock && (isLowStock
                                ? t('pos.main.lowStockBadge', 'Low Stock ({{count}} left)', { count: p.totalStock })
                                : t('pos.main.inStockBadge', '{{count}} in stock', { count: p.totalStock })
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Desktop Cart Pane */}
        <aside className='hidden w-96 shrink-0 flex-col overflow-hidden lg:flex'>
          <PosCart
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            onOpenHold={() => {
              setHeldOrdersMode('hold')
              setIsHeldOrdersOpen(true)
            }}
          />
        </aside>
      </div>

      {/* ── Dialog Modals ── */}
      <PosCheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      <PosReceiptDialog
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        receipt={lastReceipt}
      />

      <PosSessionDialog
        open={isSessionOpen}
        onOpenChange={setIsSessionOpen}
        mode={sessionModalMode}
        onSuccess={refetchStatus}
      />

      <PosCashMovementDialog
        open={isCashMovementOpen}
        onOpenChange={setIsCashMovementOpen}
      />

      <PosHeldOrdersDialog
        open={isHeldOrdersOpen}
        onOpenChange={setIsHeldOrdersOpen}
        mode={heldOrdersMode}
      />

      <PosReturnsDialog open={isReturnsOpen} onOpenChange={setIsReturnsOpen} />

      <ManualSkuDialog
        open={isManualSkuOpen}
        onOpenChange={setIsManualSkuOpen}
        onSearch={handleBarcodeScan}
      />

      {/* Multi-variant selection modal */}
      {selectedProductForVariant && (
        <VariantSelectionDialog
          open={isVariantOpen}
          onOpenChange={setIsVariantOpen}
          productName={selectedProductForVariant.productName}
          variants={selectedProductForVariant.variants}
          onSelect={(_variantId, variant) => {
            handleAddVariant(selectedProductForVariant, variant)
          }}
          isVariantDisabled={(v) => {
            const avail = v.stockAvailable ?? v.stock_quantity ?? 0
            return avail <= 0
          }}
        />
      )}
    </div>
  )
}
