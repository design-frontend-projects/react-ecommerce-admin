import type { Country } from './schema'

export const countries: Country[] = [
  {
    id: 1,
    name: 'United States',
    code: 'US',
    phone_code: '+1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Vietnam',
    code: 'VN',
    phone_code: '+84',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Singapore',
    code: 'SG',
    phone_code: '+65',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
