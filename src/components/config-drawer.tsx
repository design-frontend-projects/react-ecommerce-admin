import React, { type SVGProps } from 'react'
import { RotateCcw, Settings, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { IconDir } from '@/assets/custom/icon-dir'
import { IconLayoutCompact } from '@/assets/custom/icon-layout-compact'
import { IconLayoutDefault } from '@/assets/custom/icon-layout-default'
import { IconLayoutFull } from '@/assets/custom/icon-layout-full'
import { IconSidebarFloating } from '@/assets/custom/icon-sidebar-floating'
import { IconSidebarInset } from '@/assets/custom/icon-sidebar-inset'
import { IconSidebarSidebar } from '@/assets/custom/icon-sidebar-sidebar'
import { IconThemeDark } from '@/assets/custom/icon-theme-dark'
import { IconThemeLight } from '@/assets/custom/icon-theme-light'
import { cn } from '@/lib/utils'
import { useDirection } from '@/context/direction-provider'
import { type Collapsible, useLayout } from '@/context/layout-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSidebar } from './ui/sidebar'

export function ConfigDrawer() {
  const { t } = useTranslation()
  const { setOpen } = useSidebar()
  const { resetDir } = useDirection()
  const { resetTheme } = useTheme()
  const { resetLayout } = useLayout()

  const handleReset = () => {
    setOpen(true)
    resetDir()
    resetTheme()
    resetLayout()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          aria-label={t('configDrawer.title')}
          aria-describedby='config-drawer-description'
          className='rounded-full'
        >
          <Settings aria-hidden='true' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='pb-0 text-start'>
          <SheetTitle>{t('configDrawer.title')}</SheetTitle>
          <SheetDescription id='config-drawer-description'>
            {t('configDrawer.description')}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className='h-full'>
          <div className='space-y-6 px-4'>
            <ThemeConfig />
            <Separator />
            <SidebarConfig />
            <Separator />
            <LayoutConfig />
            <Separator />
            <DirConfig />
          </div>
        </ScrollArea>
        <SheetFooter className='gap-2'>
          <Button
            variant='destructive'
            onClick={handleReset}
            aria-label={t('configDrawer.reset')}
          >
            {t('configDrawer.reset')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  className,
}: {
  title: string
  showReset?: boolean
  onReset?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          size='icon'
          variant='secondary'
          className='size-4 rounded-full'
          onClick={onReset}
        >
          <RotateCcw className='size-3' />
        </Button>
      )}
    </div>
  )
}

interface RadioGroupContextType {
  selectedValue: string
  onSelect: (value: string) => void
}

const RadioGroupContext = React.createContext<
  RadioGroupContextType | undefined
>(undefined)

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

function RadioGroup({
  value,
  onValueChange,
  children,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider
      value={{ selectedValue: value, onSelect: onValueChange }}
    >
      <div
        className={cn('grid gap-4', className)}
        role='radiogroup'
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  item: {
    value: string
    label: React.ReactNode
    icon: any
    ariaLabel?: string
  }
}

const RadioGroupItem = ({ item }: RadioGroupItemProps) => {
  const context = React.useContext(RadioGroupContext)
  if (!context) {
    throw new Error('RadioGroupItem must be used within a RadioGroup')
  }
  const { selectedValue, onSelect } = context

  const isSelected = selectedValue === item.value
  const Icon = item.icon

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 bg-card p-4 transition-all hover:bg-accent hover:text-accent-foreground',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-muted hover:border-primary/50'
      )}
      onClick={() => onSelect(item.value)}
      role='radio'
      aria-checked={isSelected}
      tabIndex={0}
      aria-label={
        item.ariaLabel || (typeof item.label === 'string' ? item.label : '')
      }
    >
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          isSelected && 'ring-primary'
        )}
        role='img'
        aria-hidden='false'
        aria-label={`${item.label} option preview`}
      >
        <Check
          className={cn(
            'size-6 fill-primary stroke-white',
            !isSelected && 'hidden',
            'absolute top-0 right-0 z-10 translate-x-1/2 -translate-y-1/2'
          )}
          aria-hidden='true'
        />
        {typeof Icon === 'function' ? <Icon className='h-auto w-full' /> : Icon}
      </div>
      <div
        className='mt-1 text-xs'
        id={`${item.value}-description`}
        aria-live='polite'
      >
        {item.label}
      </div>
    </div>
  )
}

function ThemeConfig() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const items = [
    {
      value: 'light',
      label: t('theme.light'),
      icon: IconThemeLight,
    },
    {
      value: 'dark',
      label: t('theme.dark'),
      icon: IconThemeDark,
    },
  ]

  return (
    <div>
      <SectionTitle
        title={t('theme.title', 'Theme')}
        showReset={theme !== 'light'}
        onReset={() => setTheme('light')}
      />
      <RadioGroup
        value={theme}
        onValueChange={(val) => setTheme(val as any)}
        className='grid w-full max-w-md grid-cols-2 gap-4'
        aria-label={t('theme.title', 'Theme')}
      >
        {items.map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </RadioGroup>
    </div>
  )
}

function SidebarConfig() {
  const { t } = useTranslation()
  const { defaultVariant, variant, setVariant } = useLayout()
  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('sidebar.title', 'Sidebar')}
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
      />
      <RadioGroup
        value={variant}
        onValueChange={(v) => setVariant(v as any)}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('sidebar.title', 'Sidebar')}
        aria-describedby='sidebar-description'
      >
        {[
          {
            value: 'inset',
            label: t('sidebar.inset', 'Inset'),
            icon: IconSidebarInset,
          },
          {
            value: 'floating',
            label: t('sidebar.floating', 'Floating'),
            icon: IconSidebarFloating,
          },
          {
            value: 'sidebar',
            label: t('sidebar.sidebar', 'Sidebar'),
            icon: IconSidebarSidebar,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </RadioGroup>
      <div id='sidebar-description' className='sr-only'>
        {t(
          'sidebar.description',
          'Choose between inset, floating, or standard sidebar layout'
        )}
      </div>
    </div>
  )
}

function LayoutConfig() {
  const { t } = useTranslation()
  const { open, setOpen } = useSidebar()
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout()

  const radioState = open ? 'default' : collapsible

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('layout.title', 'Layout')}
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true)
          setCollapsible(defaultCollapsible)
        }}
      />
      <RadioGroup
        value={radioState}
        onValueChange={(v) => {
          if (v === 'default') {
            setOpen(true)
            return
          }
          setOpen(false)
          setCollapsible(v as Collapsible)
        }}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('layout.title', 'Layout')}
        aria-describedby='layout-description'
      >
        {[
          {
            value: 'default',
            label: t('layout.default', 'Default'),
            icon: IconLayoutDefault,
          },
          {
            value: 'icon',
            label: t('layout.compact', 'Compact'),
            icon: IconLayoutCompact,
          },
          {
            value: 'offcanvas',
            label: t('layout.full', 'Full'),
            icon: IconLayoutFull,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </RadioGroup>
      <div id='layout-description' className='sr-only'>
        {t(
          'layout.description',
          'Choose between default expanded, icon-only compact, or full-screen mode'
        )}
      </div>
    </div>
  )
}

function DirConfig() {
  const { t } = useTranslation()
  const { defaultDir, dir, setDir } = useDirection()
  return (
    <div>
      <SectionTitle
        title={t('direction.title', 'Direction')}
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
      />
      <RadioGroup
        value={dir}
        onValueChange={(v) => setDir(v as any)}
        className='grid w-full max-w-md grid-cols-2 gap-4'
        aria-label={t('direction.title', 'Direction')}
        aria-describedby='direction-description'
      >
        {[
          {
            value: 'ltr',
            label: 'Left to Right',
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='ltr' {...props} />
            ),
          },
          {
            value: 'rtl',
            label: 'Right to Left',
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='rtl' {...props} />
            ),
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </RadioGroup>
      <div id='direction-description' className='sr-only'>
        {t(
          'direction.description',
          'Choose between left-to-right or right-to-left direction'
        )}
      </div>
    </div>
  )
}
