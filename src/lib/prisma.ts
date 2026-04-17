/**
 * Prisma client utility.
 * This file is environment-aware and will safely return a proxy in the browser
 * to prevent compilation/runtime errors while allowing server-side execution.
 */

let prisma: any

if (typeof window === 'undefined') {
  // Use dynamic import to prevent browser bundlers from resolving this statically
  const { PrismaClient } = await import('../generated/prisma/index.js')
  const { Pool } = await import('pg')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  
  const connectionString = process.env.DATABASE_URL!
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({ adapter })
  } else {
    // Prevent multiple instances in development
    if (!(global as any).prisma) {
      ;(global as any).prisma = new PrismaClient({ adapter })
    }
    prisma = (global as any).prisma
  }
} else {
  // Browser fallback
  prisma = new Proxy({}, {
    get() {
      throw new Error('PrismaClient cannot be used in the browser. Please use an API route or server function.')
    }
  })
}

export default prisma
