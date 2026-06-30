import type { Country } from './schema'

export const countries: Country[] = [
  {
    id: '',
    name: 'United States',
    code: 'US',
    phone_code: '+1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '',
    name: 'Vietnam',
    code: 'VN',
    phone_code: '+84',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '',
    name: 'Singapore',
    code: 'SG',
    phone_code: '+65',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
