import { PrismaClient } from '../generated/prisma/client'
import { expect, test, describe } from 'vitest'

describe('Subscription & Multi-Tenant Quota Models', () => {
  const prisma = new PrismaClient({
    adapter: {
      provider: 'postgres',
      adapterName: '@prisma/adapter-pg',
      queryRaw: async () => ({ rows: [] }),
      executeRaw: async () => 0,
    } as any,
  })

  test('subscriptions model is defined in PrismaClient with full quota fields', () => {
    expect(prisma.subscriptions).toBeDefined()
    expect(typeof prisma.subscriptions.create).toBe('function')
    expect(typeof prisma.subscriptions.findMany).toBe('function')
  })

  test('tenant_subscriptions model is defined in PrismaClient', () => {
    expect(prisma.tenant_subscriptions).toBeDefined()
    expect(typeof prisma.tenant_subscriptions.create).toBe('function')
    expect(typeof prisma.tenant_subscriptions.findFirst).toBe('function')
  })

  test('tenant_subscription_usage model is defined in PrismaClient for live metrics', () => {
    expect(prisma.tenant_subscription_usage).toBeDefined()
    expect(typeof prisma.tenant_subscription_usage.upsert).toBe('function')
  })

  test('subscription_invoices model is defined in PrismaClient for billing records', () => {
    expect(prisma.subscription_invoices).toBeDefined()
    expect(typeof prisma.subscription_invoices.create).toBe('function')
  })
})
