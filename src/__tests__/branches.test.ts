import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { createOnboardingBranches } from '@/server/fns/onboarding-branches'
import prisma from '@/lib/prisma'
import { resolveTenantId, resolveTenantUserId } from '@/server/utils/tenant'

const branchFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or fewer'),
  city_id: z.string().min(1, 'City is required'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .or(z.literal(''))
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20, 'Phone must be 20 characters or fewer')
    .optional()
    .nullable(),
  address: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

vi.mock('@/lib/prisma', () => ({
  default: {
    cities: {
      findMany: vi.fn(),
    },
    branches: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/server/utils/tenant', () => ({
  resolveTenantId: vi.fn(),
  resolveTenantUserId: vi.fn(),
}))

describe('Branch Form Schema & Onboarding Logic', () => {
  const mockTenantId = '11111111-1111-1111-1111-111111111111'
  const mockTenantUserId = '22222222-2222-2222-2222-222222222222'
  const mockCityId = '7f5dadbc-6b76-4559-8b46-0e9a4846b0b5'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveTenantId).mockResolvedValue(mockTenantId)
    vi.mocked(resolveTenantUserId).mockResolvedValue(mockTenantUserId)
  })

  describe('Form Validation', () => {
    it('validates a branch with valid email and city', () => {
      const result = branchFormSchema.safeParse({
        name: 'Main Branch',
        city_id: mockCityId,
        email: 'branch@restaurant.com',
        phone: '+1-555-0100',
        address: '123 Main St',
        is_active: true,
      })
      expect(result.success).toBe(true)
    })

    it('validates a branch with empty/optional email', () => {
      const result = branchFormSchema.safeParse({
        name: 'Secondary Branch',
        city_id: mockCityId,
        email: '',
        phone: '',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email formats', () => {
      const result = branchFormSchema.safeParse({
        name: 'Main Branch',
        city_id: mockCityId,
        email: 'not-an-email',
      })
      expect(result.success).toBe(false)
    })

    it('requires branch name and city_id', () => {
      const result = branchFormSchema.safeParse({
        name: '',
        city_id: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true)
        expect(result.error.issues.some((i) => i.path.includes('city_id'))).toBe(true)
      }
    })
  })

  describe('Onboarding Branch Creation with Email', () => {
    it('creates branches with email column in database transaction', async () => {
      vi.mocked(prisma.cities.findMany).mockResolvedValue(
        [{ id: mockCityId }] as unknown as Awaited<
          ReturnType<typeof prisma.cities.findMany>
        >
      )
      vi.mocked(prisma.$transaction).mockResolvedValue([
        {
          id: 'branch-1',
          name: 'Main Flagship',
          city_id: mockCityId,
          email: 'flagship@restaurant.com',
          address: '456 Avenue',
          phone: '01000000000',
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.$transaction>>)

      const result = await createOnboardingBranches(
        {
          branches: [
            {
              name: 'Main Flagship',
              cityId: mockCityId,
              email: 'flagship@restaurant.com',
              address: '456 Avenue',
              phone: '01000000000',
            },
          ],
        },
        { authUserId: 'auth-user-123' }
      )

      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('flagship@restaurant.com')
      expect(result[0].name).toBe('Main Flagship')
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})
