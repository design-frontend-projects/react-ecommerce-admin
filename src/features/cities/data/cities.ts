import { type City } from './schema'

export const cities: City[] = [
  {
    id: 1,
    name: 'New York',
    country_id: 1,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    countries: { name: 'United States' },
  },
  {
    id: 2,
    name: 'Ho Chi Minh City',
    country_id: 2,
    is_active: true,
    created_at: '2023-01-02T00:00:00Z',
    countries: { name: 'Vietnam' },
  },
  {
    id: 3,
    name: 'Singapore',
    country_id: 3,
    is_active: true,
    created_at: '2023-01-03T00:00:00Z',
    countries: { name: 'Singapore' },
  },
]
