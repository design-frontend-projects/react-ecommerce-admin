// ResPOS Menu Management - Admin CRUD for menu items
import { useState } from 'react'
import { Loader2, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDeleteMenuCategory, useDeleteMenuItem } from '../api/mutations'
import { useMenuCategories, useMenuItem, useMenuItems } from '../api/queries'
import { MenuCategoryDialog } from '../components/menu-category-dialog'
import { MenuItemDialog } from '../components/menu-item-dialog'
import { formatCurrency } from '../lib/formatters'
import type { ResMenuCategory, ResMenuItem } from '../types'

export function MenuManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('items')

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] =
    useState<ResMenuCategory | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Queries
  const { data: categories, isLoading: categoriesLoading } = useMenuCategories()
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems()
  const { data: selectedItem } = useMenuItem(selectedItemId || '')

  // Mutations
  const deleteCategory = useDeleteMenuCategory()
  const deleteItem = useDeleteMenuItem()

  const isLoading = categoriesLoading || itemsLoading

  const filteredItems =
    menuItems?.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []

  // Handlers
  const handleEditCategory = (category: ResMenuCategory) => {
    setSelectedCategory(category)
    setIsCategoryDialogOpen(true)
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setIsCategoryDialogOpen(true)
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory.mutateAsync(id)
        toast.success('Category deleted')
      } catch (error) {
        toast.error('Failed to delete category')
      }
    }
  }

  const handleEditItem = (id: string) => {
    setSelectedItemId(id)
    setIsItemDialogOpen(true)
  }

  const handleCreateItem = () => {
    setSelectedItemId(null)
    setIsItemDialogOpen(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem.mutateAsync(id)
        toast.success('Item deleted')
      } catch (error) {
        toast.error('Failed to delete item')
      }
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <UtensilsCrossed className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Menu Management</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {isLoading ? (
          <div className='flex h-[50vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Header Actions */}
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <h2 className='text-2xl font-bold'>
                  {activeTab === 'items' ? 'Menu Items' : 'Categories'}
                </h2>
                <p className='text-muted-foreground'>
                  {menuItems?.length ?? 0} items across{' '}
                  {categories?.length ?? 0} categories
                </p>
              </div>
              <Button
                className='bg-gradient-to-r from-orange-500 to-red-500'
                onClick={
                  activeTab === 'items'
                    ? handleCreateItem
                    : handleCreateCategory
                }
              >
                <Plus className='mr-2 h-4 w-4' />
                Add {activeTab === 'items' ? 'Item' : 'Category'}
              </Button>
            </div>

            {/* Search */}
            <div className='relative max-w-sm'>
              <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search menu items...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>

            {/* Tabs */}
            <Tabs
              defaultValue='items'
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList>
                <TabsTrigger value='items'>Menu Items</TabsTrigger>
                <TabsTrigger value='categories'>Categories</TabsTrigger>
              </TabsList>

              <TabsContent value='items' className='mt-6'>
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onEdit={() => handleEditItem(item.id)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value='categories' className='mt-6'>
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {categories?.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      itemCount={
                        menuItems?.filter((i) => i.category_id === category.id)
                          .length ?? 0
                      }
                      onEdit={() => handleEditCategory(category)}
                      onDelete={() => handleDeleteCategory(category.id)}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Dialogs */}
        <MenuCategoryDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
          category={selectedCategory}
        />

        <MenuItemDialog
          open={isItemDialogOpen}
          onOpenChange={(open) => {
            setIsItemDialogOpen(open)
            if (!open) setSelectedItemId(null)
          }}
          item={selectedItemId ? selectedItem : null}
        />
      </Main>
    </>
  )
}

// Menu Item Card
function MenuItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ResMenuItem
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className='overflow-hidden transition-all hover:shadow-md'>
      {item.image_url && (
        <div className='aspect-video overflow-hidden'>
          <img
            src={item.image_url}
            alt={item.name}
            className='h-full w-full object-cover transition-transform duration-300 hover:scale-105'
          />
        </div>
      )}
      <CardHeader className='pb-2'>
        <div className='flex justify-between'>
          <CardTitle className='line-clamp-1 text-lg'>{item.name}</CardTitle>
          <span className='font-bold text-orange-500'>
            {formatCurrency(item.base_price)}
          </span>
        </div>
        {item.description && (
          <CardDescription className='line-clamp-2'>
            {item.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className='flex items-center justify-end gap-2 pt-2'>
        <Button variant='outline' size='sm' onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
          onClick={onDelete}
        >
          Delete
        </Button>
      </CardContent>
    </Card>
  )
}

// Category Card
function CategoryCard({
  category,
  itemCount,
  onEdit,
  onDelete,
}: {
  category: ResMenuCategory
  itemCount: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className='transition-all hover:shadow-md'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-xl font-medium'>{category.name}</CardTitle>
        <div className='text-2xl text-muted-foreground'>{category.icon}</div>
      </CardHeader>
      <CardContent>
        <div className='text-xs text-muted-foreground'>
          {itemCount} items in this category
        </div>
        <div className='mt-4 flex justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
