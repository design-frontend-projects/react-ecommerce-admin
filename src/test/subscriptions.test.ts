import { PrismaClient } from '../generated/prisma/client'
import { expect, test, describe } from 'vitest'

describe('Subscription Models', () => {
  const prisma = new PrismaClient({
    adapter: {
      provider: 'postgres',
      adapterName: '@prisma/adapter-pg',
      queryRaw: async () => ({ rows: [] }),
      executeRaw: async () => 0,
    } as any,
  })

  test('subscriptions model is defined in PrismaClient', () => {
    expect(prisma.subscriptions).toBeDefined()
  })

  test('tenant_subscriptions model is defined in PrismaClient', () => {
    expect(prisma.tenant_subscriptions).toBeDefined()
  })
})
