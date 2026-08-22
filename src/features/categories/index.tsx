import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from '@/components/language-switch'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CategoriesDialogs } from './components/categories-dialogs'
import { CategoriesPrimaryButtons } from './components/categories-primary-buttons'
import { CategoriesProvider } from './components/categories-provider'
import { CategoriesTable } from './components/categories-table'
import { useCategories } from './hooks/use-categories'

export function Categories() {
  const { t } = useTranslation()
  const { data: categories, isLoading, error } = useCategories()

  return (
    <CategoriesProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('categories.title')}</h2>
            <p className='text-muted-foreground'>
              {t('categories.description')}
            </p>
          </div>
          <CategoriesPrimaryButtons />
        </div>

        {isLoading ? (
          <div className='flex flex-1 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : error ? (
          <div className='text-destructive'>{t('common.error', { defaultValue: 'Error loading categories' })}</div>
        ) : (
          <CategoriesTable data={categories || []} />
        )}
      </Main>

      <CategoriesDialogs />
    </CategoriesProvider>
  )
}
