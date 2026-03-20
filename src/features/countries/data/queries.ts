import { useQuery } from '@tanstack/react-query'
import { countries } from './countries'

export const useCountries = (search?: string) => {
  return useQuery({
    queryKey: ['countries', search],
    queryFn: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      if (!search) return countries
      
      return countries.filter((country) =>
        country.name.toLowerCase().includes(search.toLowerCase()) ||
        country.countryCode.toLowerCase().includes(search.toLowerCase())
      )
    },
  })
}
