import { type Area } from './schema'

export const areas: Area[] = [
  {
    id: 1,
    name: 'Maadi',
    city_id: 1,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    cities: {
      name: 'Cairo',
      countries: { name: 'Egypt' },
    },
  },
  {
    id: 2,
    name: 'Heliopolis',
    city_id: 1,
    is_active: true,
    created_at: '2023-01-02T00:00:00Z',
    cities: {
      name: 'Cairo',
      countries: { name: 'Egypt' },
    },
  },
  {
    id: 3,
    name: 'Manhattan',
    city_id: 2,
    is_active: true,
    created_at: '2023-01-03T00:00:00Z',
    cities: {
      name: 'New York',
      countries: { name: 'United States' },
    },
  },
  {
    id: 4,
    name: 'Shibuya',
    city_id: 3,
    is_active: true,
    created_at: '2023-01-04T00:00:00Z',
    cities: {
      name: 'Tokyo',
      countries: { name: 'Japan' },
    },
  },
]
