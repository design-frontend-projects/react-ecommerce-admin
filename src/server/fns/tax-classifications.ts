import { prisma } from '@/server/db'
import { toNumeric } from '@/lib/decimal'

/**
 * Server function using Prisma 7 to query all active tax classifications with rates.
 */
export async function listTaxClassifications() {
  const classifications = await prisma.tax_classifications.findMany({
    where: { is_active: true },
    orderBy: [{ rate: 'desc' }, { name: 'asc' }],
  })

  return classifications.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    name_ar: item.name_ar,
    rate: toNumeric(item.rate, 0),
    description: item.description,
    is_active: item.is_active,
  }))
}
