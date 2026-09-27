/**
 * Redis Channel & Key Naming Strategy
 * Enforces strict multi-tenant isolation across Pub/Sub channels and caching keys.
 */

export class RedisChannelStrategy {
  /**
   * Channel for tenant-wide broadcasts.
   */
  static getTenantAllChannel(tenantId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:tenant:all`
  }

  /**
   * Channel for a specific notification channel topic.
   */
  static getChannelChannel(tenantId: string, channelId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:channel:${channelId}`
  }

  /**
   * Channel for users holding a specific role.
   */
  static getRoleChannel(tenantId: string, roleId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:role:${roleId}`
  }

  /**
   * Channel for direct delivery to an individual tenant user.
   */
  static getUserChannel(tenantId: string, userId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:user:${userId}`
  }

  /**
   * Channel for branch-scoped members.
   */
  static getBranchChannel(tenantId: string, branchId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:branch:${branchId}`
  }

  /**
   * Channel for store-scoped members.
   */
  static getStoreChannel(tenantId: string, storeId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:store:${storeId}`
  }

  /**
   * Channel for warehouse-scoped members.
   */
  static getWarehouseChannel(tenantId: string, warehouseId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:warehouse:${warehouseId}`
  }

  /**
   * Channel for an individual customer.
   */
  static getCustomerChannel(tenantId: string, customerId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:customer:${customerId}`
  }

  /**
   * Channel for an individual supplier.
   */
  static getSupplierChannel(tenantId: string, supplierId: string): string {
    this.assertTenantId(tenantId)
    return `notify:${tenantId}:supplier:${supplierId}`
  }

  // ── Redis Cache & Tracking Keys ──────────────────────────────────────────

  /**
   * Redis Sorted Set key for user's unread notification IDs (scored by timestamp).
   */
  static getUnreadSetKey(tenantId: string, userId: string): string {
    this.assertTenantId(tenantId)
    return `notif:unread:${tenantId}:${userId}`
  }

  /**
   * Redis String key caching the unread notification count.
   */
  static getUnreadCountKey(tenantId: string, userId: string): string {
    this.assertTenantId(tenantId)
    return `notif:count:${tenantId}:${userId}`
  }

  /**
   * Redis String key for deduplicating incoming business events.
   */
  static getDedupKey(tenantId: string, idempotencyKey: string): string {
    this.assertTenantId(tenantId)
    return `notif:dedup:${tenantId}:${idempotencyKey}`
  }

  /**
   * Redis Hash key for tracking delivery state.
   */
  static getDeliveryKey(notificationId: string): string {
    return `notif:delivery:${notificationId}`
  }

  /**
   * Redis Set key for active WebSocket connection IDs within a tenant.
   */
  static getTenantConnectionsKey(tenantId: string): string {
    this.assertTenantId(tenantId)
    return `ws:connections:${tenantId}`
  }

  /**
   * Redis Set key for active connection IDs of a specific user.
   */
  static getUserConnectionsKey(tenantId: string, userId: string): string {
    this.assertTenantId(tenantId)
    return `ws:user:${tenantId}:${userId}`
  }

  /**
   * Validates that the channel name belongs to the expected tenant.
   * Prevents cross-tenant message injection or interception.
   */
  static isChannelOwnedByTenant(channelName: string, tenantId: string): boolean {
    if (!channelName.startsWith(`notify:${tenantId}:`)) {
      return false
    }
    // Disallow wildcard or pattern subscriptions
    if (channelName.includes('*') || channelName.includes('?')) {
      return false
    }
    return true
  }

  private static assertTenantId(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new Error('Tenant ID is required for Redis channel and key operations.')
    }
  }
}
