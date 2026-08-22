/**
 * Prisma client utility.
 * This file is environment-aware and will safely return a proxy in the browser
 * to prevent compilation/runtime errors while allowing server-side execution.
 */

import type { PrismaClient as PrismaClientType } from '@/generated/prisma/client'

let prisma: PrismaClientType

if (typeof window === 'undefined') {
  // Use dynamic import to prevent browser bundlers from resolving this statically
  const { PrismaClient } = await import('../generated/prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres'
  const adapter = new PrismaPg({ connectionString })

  const { createTenantExtendedPrisma } = await import('@/server/db/tenant-prisma')

  if (process.env.NODE_ENV === 'production') {
    const rawClient = new PrismaClient({ adapter })
    prisma = createTenantExtendedPrisma(rawClient) as unknown as PrismaClientType
  } else {
    // Force refresh or initialize singleton on globalThis
    if (!(globalThis as any).prisma) {
      const rawClient = new PrismaClient({ adapter })
      ;(globalThis as any).prisma = createTenantExtendedPrisma(rawClient)
    }
    prisma = (globalThis as any).prisma
  }
} else {
  // Browser fallback
  prisma = new Proxy(
    {},
    {
      get() {
        throw new Error(
          'PrismaClient cannot be used in the browser. Please use an API route or server function.'
        )
      },
    }
  ) as unknown as PrismaClientType
}

export default prisma
