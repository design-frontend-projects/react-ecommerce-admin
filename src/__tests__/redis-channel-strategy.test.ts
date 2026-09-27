import { describe, it, expect } from 'vitest'
import { RedisChannelStrategy } from '@/server/redis/channel-strategy'

describe('RedisChannelStrategy Unit Tests', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const otherTenantId = '00000000-0000-0000-0000-000000000002'
  const userId = '11111111-1111-1111-1111-111111111111'
  const roleId = '22222222-2222-2222-2222-222222222222'
  const channelId = '33333333-3333-3333-3333-333333333333'
  const branchId = '44444444-4444-4444-4444-444444444444'
  const storeId = '55555555-5555-5555-5555-555555555555'
  const warehouseId = '66666666-6666-6666-6666-666666666666'

  it('generates strictly namespaced channel names incorporating the tenant ID', () => {
    expect(RedisChannelStrategy.getTenantAllChannel(tenantId)).toBe(
      `notify:${tenantId}:tenant:all`
    )
    expect(RedisChannelStrategy.getUserChannel(tenantId, userId)).toBe(
      `notify:${tenantId}:user:${userId}`
    )
    expect(RedisChannelStrategy.getRoleChannel(tenantId, roleId)).toBe(
      `notify:${tenantId}:role:${roleId}`
    )
    expect(RedisChannelStrategy.getChannelChannel(tenantId, channelId)).toBe(
      `notify:${tenantId}:channel:${channelId}`
    )
    expect(RedisChannelStrategy.getBranchChannel(tenantId, branchId)).toBe(
      `notify:${tenantId}:branch:${branchId}`
    )
    expect(RedisChannelStrategy.getStoreChannel(tenantId, storeId)).toBe(
      `notify:${tenantId}:store:${storeId}`
    )
    expect(RedisChannelStrategy.getWarehouseChannel(tenantId, warehouseId)).toBe(
      `notify:${tenantId}:warehouse:${warehouseId}`
    )
  })

  it('generates correct cache keys for unread counts, dedup, and connection tracking', () => {
    expect(RedisChannelStrategy.getUnreadCountKey(tenantId, userId)).toBe(
      `notif:count:${tenantId}:${userId}`
    )
    expect(RedisChannelStrategy.getUnreadSetKey(tenantId, userId)).toBe(
      `notif:unread:${tenantId}:${userId}`
    )
    expect(RedisChannelStrategy.getDedupKey(tenantId, 'event-123')).toBe(
      `notif:dedup:${tenantId}:event-123`
    )
    expect(RedisChannelStrategy.getTenantConnectionsKey(tenantId)).toBe(
      `ws:connections:${tenantId}`
    )
    expect(RedisChannelStrategy.getUserConnectionsKey(tenantId, userId)).toBe(
      `ws:user:${tenantId}:${userId}`
    )
  })

  it('validates tenant channel ownership and rejects unauthorized/cross-tenant channels', () => {
    const validChannel = `notify:${tenantId}:user:${userId}`
    expect(RedisChannelStrategy.isChannelOwnedByTenant(validChannel, tenantId)).toBe(true)

    // Different tenant
    expect(RedisChannelStrategy.isChannelOwnedByTenant(validChannel, otherTenantId)).toBe(false)

    // Wildcards are strictly rejected to prevent cross-tenant message snooping
    expect(RedisChannelStrategy.isChannelOwnedByTenant(`notify:${tenantId}:*`, tenantId)).toBe(false)
    expect(RedisChannelStrategy.isChannelOwnedByTenant(`notify:*`, tenantId)).toBe(false)
    expect(RedisChannelStrategy.isChannelOwnedByTenant(`notify:${tenantId}:user:?`, tenantId)).toBe(false)
  })

  it('throws an error if tenantId is missing or empty', () => {
    expect(() => RedisChannelStrategy.getTenantAllChannel('')).toThrow(
      'Tenant ID is required'
    )
    expect(() => RedisChannelStrategy.getUserChannel('   ', userId)).toThrow(
      'Tenant ID is required'
    )
  })
})
