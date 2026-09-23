/**
 * Prisma client utility.
 * This file is environment-aware and will safely return a proxy in the browser
 * to prevent compilation/runtime errors while allowing server-side execution.
 */

import type { PrismaClient as PrismaClientType } from '@/generated/prisma/client'

let prisma: PrismaClientType

const globalForPrisma = globalThis as unknown as {
  __prismaClient?: PrismaClientType
}

if (typeof window === 'undefined') {
  if (globalForPrisma.__prismaClient) {
    prisma = globalForPrisma.__prismaClient
  } else {
    // Use dynamic import to prevent browser bundlers from resolving this statically
    const { PrismaClient } = await import('../generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres.qihgtllyfkoynorwazfn:qinuIGJW49YV2MHa@aws-1-eu-west-2.pooler.supabase.com:5432/postgres'
    const adapter = new PrismaPg({
      connectionString,
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 15000,
    })

    const { createTenantExtendedPrisma } = await import('@/server/db/tenant-prisma')
    const rawClient = new PrismaClient({ adapter })
    const client = createTenantExtendedPrisma(rawClient) as unknown as PrismaClientType
    globalForPrisma.__prismaClient = client
    prisma = client
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

// Allow HMR to clear cached client during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    delete globalForPrisma.__prismaClient
  })
}

export default prisma
