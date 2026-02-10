// Public Digital Menu - Customer-facing menu display
// No authentication required
import { useState } from 'react'
import {
  Clock,
  Flame,
  Leaf,
  Loader2,
  Search,
  Star,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useMenuCategories, useMenuItems } from '../api/queries'
import { formatCurrency } from '../lib/formatters'
import type { ResMenuItem } from '../types'

export function DigitalMenu() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ResMenuItem | null>(null)

  const { data: categories, isLoading: categoriesLoading } = useMenuCategories()
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems()

  const isLoading = categoriesLoading || itemsLoading

  // Filter menu items by search and category
  const filteredItems =
    menuItems?.filter((menuItem) => {
      const matchesSearch =
        !searchQuery ||
        menuItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menuItem.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        !selectedCategory || menuItem.category_id === selectedCategory
      return matchesSearch && matchesCategory && menuItem.is_available
    }) ?? []

  // Group items by category
  const groupedItems =
    categories?.reduce(
      (acc, cat) => {
        const items = filteredItems.filter(
          (item) => item.category_id === cat.id
        )
        if (items.length > 0) {
          acc[cat.id] = { category: cat, items }
        }
        return acc
      },
      {} as Record<
        string,
        { category: (typeof categories)[0]; items: typeof filteredItems }
      >
    ) ?? {}

  return (
    <div className='min-h-screen bg-linear-to-b from-zinc-900 via-zinc-900 to-black text-white'>
      {/* Header */}
      <header className='sticky top-0 z-50 border-b border-white/10 bg-zinc-900/80 backdrop-blur-lg'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-orange-500 to-red-500'>
                <UtensilsCrossed className='h-5 w-5' />
              </div>
              <div>
                <h1 className='text-xl font-bold'>Digital Menu</h1>
                <p className='text-xs text-zinc-400'>Scan. Browse. Enjoy.</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className='relative mt-4'>
            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400' />
            <Input
              placeholder='Search dishes...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500'
            />
            {searchQuery && (
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2'
                onClick={() => setSearchQuery('')}
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>

          {/* Category Pills */}
          <ScrollArea className='-mx-4 mt-4 px-4'>
            <div className='flex gap-2 pb-2'>
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size='sm'
                className={cn(
                  'rounded-full whitespace-nowrap',
                  !selectedCategory
                    ? 'bg-linear-to-r from-orange-500 to-red-500'
                    : 'border-zinc-700 text-zinc-300'
                )}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size='sm'
                  className={cn(
                    'rounded-full whitespace-nowrap',
                    selectedCategory === cat.id
                      ? 'bg-linear-to-r from-orange-500 to-red-500'
                      : 'border-zinc-700 text-zinc-300'
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon && <span className='mr-1'>{cat.icon}</span>}
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
      </header>

      {/* Main Content */}
      <main className='container mx-auto px-4 py-6'>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-orange-500' />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='flex h-[50vh] flex-col items-center justify-center text-center'>
            <UtensilsCrossed className='h-12 w-12 text-zinc-600' />
            <p className='mt-4 text-lg text-zinc-400'>No dishes found</p>
            {searchQuery && (
              <Button
                variant='ghost'
                className='mt-2 text-orange-500'
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : selectedCategory ? (
          // Single Category View
          <div className='grid animate-in gap-4 duration-500 fade-in slide-in-from-bottom-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredItems.map((menuItem) => (
              <MenuItemCard
                key={menuItem.id}
                item={menuItem}
                onClick={() => setSelectedItem(menuItem)}
              />
            ))}
          </div>
        ) : (
          // All Categories View
          <div className='space-y-8'>
            {Object.values(groupedItems).map(({ category, items }) => (
              <section key={category.id}>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold'>{category.name}</h2>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-orange-500'
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    View all
                  </Button>
                </div>
                <div className='grid animate-in gap-4 duration-500 fade-in slide-in-from-bottom-4 md:grid-cols-2 lg:grid-cols-3'>
                  {items.slice(0, 6).map((menuItem) => (
                    <MenuItemCard
                      key={menuItem.id}
                      item={menuItem}
                      onClick={() => setSelectedItem(menuItem)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      <ItemDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Footer */}
      <footer className='border-t border-white/10 py-6 text-center'>
        <p className='text-sm text-zinc-500'>
          Powered by ResPOS • Digital Menu
        </p>
      </footer>
    </div>
  )
}

// Menu Item Card
interface MenuItemCardProps {
  item: ResMenuItem
  onClick: () => void
}

function MenuItemCard({ item, onClick }: MenuItemCardProps) {
  const tags = (item.tags as string[]) || []
  const isSpicy = tags.includes('spicy')
  const isVegan = tags.includes('vegan') || tags.includes('vegetarian')
  const isPopular = tags.includes('popular') || tags.includes('bestseller')

  return (
    <div className='animate-in duration-300 fade-in slide-in-from-bottom-2'>
      <Card
        className='cursor-pointer overflow-hidden border-zinc-700 bg-zinc-800/50 transition-all hover:border-zinc-600 hover:bg-zinc-800'
        onClick={onClick}
      >
        <CardContent className='p-0'>
          <div className='flex gap-4 p-4'>
            <div className='flex-1'>
              <div className='flex items-start gap-2'>
                <h3 className='line-clamp-1 font-semibold text-white'>
                  {item.name}
                </h3>
                {isPopular && (
                  <Star className='h-4 w-4 shrink-0 text-yellow-500' />
                )}
              </div>
              {item.description && (
                <p className='mt-1 line-clamp-2 text-sm text-zinc-400'>
                  {item.description}
                </p>
              )}
              <div className='mt-2 flex items-center gap-2'>
                {isSpicy && (
                  <Badge
                    variant='outline'
                    className='border-red-500/50 text-red-400'
                  >
                    <Flame className='mr-1 h-3 w-3' /> Spicy
                  </Badge>
                )}
                {isVegan && (
                  <Badge
                    variant='outline'
                    className='border-green-500/50 text-green-400'
                  >
                    <Leaf className='mr-1 h-3 w-3' /> Vegan
                  </Badge>
                )}
              </div>
              <div className='mt-3 flex items-center justify-between'>
                <span className='text-lg font-bold text-orange-500'>
                  {formatCurrency(item.base_price)}
                </span>
                {item.preparation_time && (
                  <span className='flex items-center gap-1 text-xs text-zinc-500'>
                    <Clock className='h-3 w-3' />
                    {item.preparation_time} min
                  </span>
                )}
              </div>
            </div>
            {item.image_url && (
              <div className='h-24 w-24 shrink-0 overflow-hidden rounded-lg'>
                <img
                  src={item.image_url}
                  alt={item.name}
                  className='h-full w-full object-cover'
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Item Detail Dialog
interface ItemDetailDialogProps {
  item: ResMenuItem | null
  onClose: () => void
}

function ItemDetailDialog({ item, onClose }: ItemDetailDialogProps) {
  if (!item) return null

  const allergens = (item.allergens as string[]) || []
  const tags = (item.tags as string[]) || []

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className='max-w-md border-zinc-700 bg-zinc-900 text-white'>
        {item.image_url && (
          <div className='-mx-6 -mt-6 mb-4 h-48 overflow-hidden rounded-t-lg'>
            <img
              src={item.image_url}
              alt={item.name}
              className='h-full w-full object-cover'
            />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className='text-xl'>{item.name}</DialogTitle>
          {item.name_ar && (
            <p className='text-right text-lg text-zinc-400' dir='rtl'>
              {item.name_ar}
            </p>
          )}
          <DialogDescription className='text-zinc-400'>
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Price */}
          <div className='flex items-center justify-between'>
            <span className='text-2xl font-bold text-orange-500'>
              {formatCurrency(item.base_price)}
            </span>
            {item.preparation_time && (
              <span className='flex items-center gap-1 text-sm text-zinc-500'>
                <Clock className='h-4 w-4' />~{item.preparation_time} min
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {tags.map((tag) => (
                <Badge key={tag} variant='secondary' className='capitalize'>
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Allergens Warning */}
          {allergens.length > 0 && (
            <div className='rounded-lg bg-yellow-500/10 p-3 text-sm'>
              <p className='font-medium text-yellow-500'>
                Allergen Information
              </p>
              <p className='mt-1 text-zinc-400'>
                Contains: {allergens.join(', ')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
