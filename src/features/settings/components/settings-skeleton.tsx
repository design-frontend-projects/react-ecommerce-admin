import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for settings forms.
 * Mimics the layout of a typical settings form section.
 */
export function SettingsFormSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Field 1 */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-3 w-48' />
      </div>

      {/* Field 2 */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-3 w-56' />
      </div>

      {/* Field 3 */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-28' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-3 w-40' />
      </div>

      {/* Field 4 */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-3 w-52' />
      </div>

      {/* Save button */}
      <Skeleton className='h-10 w-36' />
    </div>
  )
}

/**
 * Loading skeleton for the tab list.
 */
export function SettingsTabsSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Tabs header */}
      <div className='flex gap-1 rounded-md bg-muted p-1'>
        <Skeleton className='h-8 flex-1 rounded-sm' />
        <Skeleton className='h-8 flex-1 rounded-sm' />
        <Skeleton className='h-8 flex-1 rounded-sm' />
      </div>

      {/* Form content */}
      <SettingsFormSkeleton />
    </div>
  )
}
