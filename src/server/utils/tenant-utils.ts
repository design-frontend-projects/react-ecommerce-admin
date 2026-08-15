import prisma from '@/lib/prisma'
import type { tenant_type } from '@/generated/prisma/enums'

/**
 * Generate a unique tenant code e.g. TNT-8A2F9B1C
 */
export async function generateTenantCode(): Promise<string> {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  let exists = true
  let attempts = 0

  while (exists && attempts < 10) {
    attempts++
    let randomPart = ''
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    code = `TNT-${randomPart}`
    try {
      const found = await prisma.tenants.findFirst({
        where: { tenant_code: code },
        select: { id: true },
      })
      exists = !!found
    } catch {
      // If DB probe fails, attach a millisecond timestamp to guarantee uniqueness
      const timestampPart = Date.now().toString(36).toUpperCase().slice(-4)
      code = `TNT-${timestampPart}${randomPart.slice(0, 4)}`
      exists = false
    }
  }

  return code
}

/**
 * Generate a unique URL slug from business name e.g. "my-restaurant-2"
 */
export async function generateTenantSlug(name: string): Promise<string> {
  const baseSlug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tenant'

  let slug = baseSlug
  let count = 1
  let exists = true

  while (exists && count < 50) {
    try {
      const found = await prisma.tenants.findFirst({
        where: { slug },
        select: { id: true },
      })
      if (!found) {
        exists = false
      } else {
        count++
        slug = `${baseSlug}-${count}`
      }
    } catch {
      slug = `${baseSlug}-${Date.now().toString(36)}`
      exists = false
    }
  }

  return slug
}

/**
 * Map frontend activity selection to tenant_type enum
 */
export function mapActivityToTenantType(activity: string): tenant_type {
  switch (activity.toLowerCase()) {
    case 'res':
    case 'restuarant':
    case 'restaurant':
      return 'restaurant'
    case 'market':
    case 'pharmacy':
    case 'clothes':
    case 'electronic':
    case 'electronic_shop':
    case 'electronics':
    case 'retail':
      return 'retail'
    default:
      return 'company'
  }
}
