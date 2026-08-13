import { describe, expect, test } from 'vitest'
import { mapActivityToTenantType } from '@/server/utils/tenant-utils'

describe('Tenant Onboarding Utilities', () => {
  test('mapActivityToTenantType correctly maps UI business activities to tenant_type enum', () => {
    expect(mapActivityToTenantType('restuarant')).toBe('restaurant')
    expect(mapActivityToTenantType('restaurant')).toBe('restaurant')
    expect(mapActivityToTenantType('market')).toBe('retail')
    expect(mapActivityToTenantType('pharmacy')).toBe('retail')
    expect(mapActivityToTenantType('clothes')).toBe('retail')
    expect(mapActivityToTenantType('electronic')).toBe('retail')
    expect(mapActivityToTenantType('unknown')).toBe('company')
  })
})
