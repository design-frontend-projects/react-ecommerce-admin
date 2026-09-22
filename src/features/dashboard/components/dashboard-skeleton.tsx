import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function DashboardSkeleton() {
  return (
    <div className='flex flex-col gap-6 p-4 md:p-6 lg:p-8 animate-in fade-in-50 duration-500'>
      {/* Header Skeleton */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40'>
        <div className='space-y-2'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-8 w-64 rounded-lg' />
            <Skeleton className='h-6 w-20 rounded-full' />
          </div>
          <Skeleton className='h-4 w-48' />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-10 w-44 rounded-md' />
          <Skeleton className='h-10 w-32 rounded-md' />
          <Skeleton className='h-10 w-10 rounded-md' />
        </div>
      </div>

      {/* Critical Alerts Banner Skeleton */}
      <Skeleton className='h-14 w-full rounded-xl' />

      {/* 6 KPI Cards Grid Skeleton */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className='bg-card/40 backdrop-blur-md border-border/60 shadow-xs'>
            <CardHeader className='p-4 pb-2 flex flex-row items-center justify-between space-y-0'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-8 w-8 rounded-lg' />
            </CardHeader>
            <CardContent className='p-4 pt-1 space-y-2'>
              <Skeleton className='h-7 w-28' />
              <div className='flex items-center justify-between pt-1'>
                <Skeleton className='h-4 w-16 rounded-sm' />
                <Skeleton className='h-3 w-12' />
              </div>
              <Skeleton className='h-1.5 w-full rounded-full mt-2' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2 Charts Row Skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        <Card className='lg:col-span-8 bg-card/40 backdrop-blur-md border-border/60'>
          <CardHeader className='p-5 pb-3 flex flex-row items-center justify-between'>
            <div className='space-y-1.5'>
              <Skeleton className='h-5 w-48' />
              <Skeleton className='h-3 w-64' />
            </div>
            <Skeleton className='h-8 w-32 rounded-md' />
          </CardHeader>
          <CardContent className='p-5 pt-2'>
            <Skeleton className='h-[320px] w-full rounded-lg' />
          </CardContent>
        </Card>

        <Card className='lg:col-span-4 bg-card/40 backdrop-blur-md border-border/60'>
          <CardHeader className='p-5 pb-3'>
            <Skeleton className='h-5 w-40' />
            <Skeleton className='h-3 w-48' />
          </CardHeader>
          <CardContent className='p-5 pt-2 flex flex-col items-center justify-center'>
            <Skeleton className='h-[220px] w-[220px] rounded-full my-4' />
            <div className='grid grid-cols-2 gap-2 w-full pt-2'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-full' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Tables Skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
        <Card className='lg:col-span-8 bg-card/40 backdrop-blur-md border-border/60'>
          <CardHeader className='p-5 pb-3 flex flex-row items-center justify-between'>
            <div className='space-y-1'>
              <Skeleton className='h-5 w-40' />
              <Skeleton className='h-3 w-52' />
            </div>
            <Skeleton className='h-8 w-44 rounded-md' />
          </CardHeader>
          <CardContent className='p-5 pt-0 space-y-3'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between py-2 border-b border-border/30'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-9 w-9 rounded-md' />
                  <div className='space-y-1'>
                    <Skeleton className='h-4 w-40' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <Skeleton className='h-5 w-20 rounded-full' />
                  <Skeleton className='h-8 w-20 rounded-md' />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className='lg:col-span-4 bg-card/40 backdrop-blur-md border-border/60'>
          <CardHeader className='p-5 pb-3'>
            <Skeleton className='h-5 w-36' />
            <Skeleton className='h-3 w-44' />
          </CardHeader>
          <CardContent className='p-5 pt-0 space-y-3'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between py-2 border-b border-border/30'>
                <div className='space-y-1'>
                  <Skeleton className='h-4 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
                <Skeleton className='h-6 w-16 rounded-full' />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
