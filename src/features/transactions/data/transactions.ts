import { faker } from '@faker-js/faker'
import { TransactionRow } from './schema'

export const transactions: TransactionRow[] = Array.from(
  { length: 20 },
  () => ({
    id: faker.string.uuid(),
    transaction_number: `TRX-${faker.number.int({ min: 1000, max: 9999 })}`,
    type: faker.helpers.arrayElement([
      'sale',
      'purchase',
      'return',
      'adjustment',
    ]),
    status: faker.helpers.arrayElement([
      'pending',
      'completed',
      'refunded',
      'cancelled',
    ]),
    total: faker.finance.amount({ min: 10, max: 1000, dec: 2 }),
    date: faker.date.recent({ days: 30 }).toISOString(),
  })
)
