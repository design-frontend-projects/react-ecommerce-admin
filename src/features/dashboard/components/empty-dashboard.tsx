import { Link } from '@tanstack/react-router'
import { PackagePlus, ShoppingCart, RefreshCw, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyDashboardProps {
  onRefresh?: () => void
  isRefetching?: boolean
}

export function EmptyDashboard({ onRefresh, isRefetching }: EmptyDashboardProps) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in-50 zoom-in-95 duration-500'>
      <div className='relative mb-6'>
        <div className='absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse' />
        <div className='relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/10 via-primary/20 to-primary/5 border border-primary/30 text-primary shadow-lg'>
          <Sparkles className='w-10 h-10' />
        </div>
      </div>

      <h2 className='text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2'>
        Welcome to your Inventory Command Center
      </h2>
      <p className='text-muted-foreground max-w-lg mb-8 text-sm md:text-base leading-relaxed'>
        No stock or sales data has been recorded for this view yet. Start by populating your product catalog, receiving purchase orders, or logging your initial stock balances.
      </p>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mb-8'>
        <Card className='border-border/60 hover:border-primary/50 transition-all hover:shadow-md bg-card/60 backdrop-blur-xs'>
          <CardContent className='p-5 flex flex-col items-center text-center'>
            <div className='w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3'>
              <PackagePlus className='w-5 h-5' />
            </div>
            <h4 className='font-semibold text-sm mb-1 text-foreground'>1. Add Products</h4>
            <p className='text-xs text-muted-foreground mb-4'>Define SKUs, categories, and inventory minimum levels.</p>
            <Button variant='outline' size='sm' asChild className='w-full mt-auto text-xs'>
              <Link to='/dashboard/products'>
                Create Product <ArrowRight className='w-3 h-3 ml-1' />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className='border-border/60 hover:border-primary/50 transition-all hover:shadow-md bg-card/60 backdrop-blur-xs'>
          <CardContent className='p-5 flex flex-col items-center text-center'>
            <div className='w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3'>
              <ShoppingCart className='w-5 h-5' />
            </div>
            <h4 className='font-semibold text-sm mb-1 text-foreground'>2. Purchase Orders</h4>
            <p className='text-xs text-muted-foreground mb-4'>Order inventory from suppliers to populate your stock.</p>
            <Button variant='outline' size='sm' asChild className='w-full mt-auto text-xs'>
              <Link to='/purchase-orders'>
                New Purchase Order <ArrowRight className='w-3 h-3 ml-1' />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className='border-border/60 hover:border-primary/50 transition-all hover:shadow-md bg-card/60 backdrop-blur-xs'>
          <CardContent className='p-5 flex flex-col items-center text-center'>
            <div className='w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3'>
              <RefreshCw className='w-5 h-5' />
            </div>
            <h4 className='font-semibold text-sm mb-1 text-foreground'>3. Initial Stock</h4>
            <p className='text-xs text-muted-foreground mb-4'>Directly import or adjust opening physical inventory.</p>
            <Button variant='outline' size='sm' asChild className='w-full mt-auto text-xs'>
              <Link to='/inventory-movements'>
                Adjust Stock <ArrowRight className='w-3 h-3 ml-1' />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {onRefresh && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onRefresh}
          disabled={isRefetching}
          className='text-muted-foreground hover:text-foreground text-xs'
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Checking for updates...' : 'Re-check database'}
        </Button>
      )}
    </div>
  )
}
