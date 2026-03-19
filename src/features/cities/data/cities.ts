import { type City } from './schema'

export const cities: City[] = [
  {
    id: '1',
    name: 'New York',
    countryId: '1', // US
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    state: 'NY',
    population: 8419000,
  },
  {
    id: '2',
    name: 'Ho Chi Minh City',
    countryId: '2', // Vietnam
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    state: 'HCMC',
    population: 8993000,
  },
  {
    id: '3',
    name: 'Singapore',
    countryId: '3', // Singapore
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    population: 5686000,
  },
]
