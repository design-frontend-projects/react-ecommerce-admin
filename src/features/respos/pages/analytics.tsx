// ResPOS Analytics Dashboard
import { LineChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export function Analytics() {
  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <LineChart className='h-5 w-5 text-orange-500' />
          <h1 className='text-lg font-semibold'>Analytics</h1>
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className='flex min-h-[300px] items-center justify-center'>
              <p className='text-muted-foreground'>Sales charts coming soon.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Items</CardTitle>
            </CardHeader>
            <CardContent className='flex min-h-[300px] items-center justify-center'>
              <p className='text-muted-foreground'>
                Best selling items chart coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
