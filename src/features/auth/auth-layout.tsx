import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative grid min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4 md:p-8'>
      {/* Premium Background Pattern/Gradient */}
      <div
        className='absolute inset-0 -z-10 h-full w-full'
        style={{
          backgroundImage:
            'radial-gradient(var(--auth-grid-dot) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          maskImage:
            'radial-gradient(ellipse 50% 50% at 50% 50%, black 70%, transparent 100%)',
        }}
      />
      <div
        className='absolute inset-0 -z-20 h-full w-full'
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--background), color-mix(in srgb, var(--background) 90%, transparent), color-mix(in srgb, var(--primary) 10%, var(--background)))',
        }}
      />

      <div className='relative mx-auto flex w-full max-w-[480px] flex-col justify-center space-y-4 py-6 sm:p-0'>
        <div className='mb-6 flex animate-in flex-col items-center justify-center space-y-2 duration-700 fade-in slide-in-from-top-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 p-2 text-primary shadow-sm backdrop-blur-md'>
            <Logo className='h-full w-full' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
            Bluewave POS
          </h1>
        </div>
        <div className='animate-in delay-150 duration-700 fade-in slide-in-from-bottom-4'>
          {children}
        </div>
      </div>
    </div>
  )
}
