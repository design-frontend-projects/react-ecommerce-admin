import { type City } from './schema'

export const cities: City[] = [
  {
    id: 1,
    name: 'Cairo',
    country_id: 1,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    countries: { name: 'Egypt' },
  },
  {
    id: 2,
    name: 'New York',
    country_id: 2,
    is_active: true,
    created_at: '2023-01-02T00:00:00Z',
    countries: { name: 'United States' },
  },
  {
    id: 3,
    name: 'Tokyo',
    country_id: 3,
    is_active: false,
    created_at: '2023-01-03T00:00:00Z',
    countries: { name: 'Japan' },
  },
  {
    id: 4,
    name: 'Paris',
    country_id: 4,
    is_active: true,
    created_at: '2023-01-04T00:00:00Z',
    countries: { name: 'France' },
  },
  {
    id: 5,
    name: 'London',
    country_id: 5,
    is_active: true,
    created_at: '2023-01-05T00:00:00Z',
    countries: { name: 'United Kingdom' },
  },
]
