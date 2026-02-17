import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative grid min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4 md:p-8'>
      {/* Premium Background Pattern/Gradient */}
      <div className='absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]' />
      <div className='absolute inset-0 -z-20 h-full w-full bg-linear-to-br from-background via-background/90 to-primary/5' />

      <div className='relative mx-auto flex w-full max-w-[480px] flex-col justify-center space-y-4 py-6 sm:p-0'>
        <div className='mb-6 flex animate-in flex-col items-center justify-center space-y-2 duration-700 fade-in slide-in-from-top-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 p-2 text-primary shadow-sm backdrop-blur-md'>
            <Logo className='h-full w-full' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
            Ecommerce admin
          </h1>
        </div>
        <div className='animate-in delay-150 duration-700 fade-in slide-in-from-bottom-4'>
          {children}
        </div>
      </div>
    </div>
  )
}
