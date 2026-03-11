import { createFileRoute } from '@tanstack/react-router'
import { RestaurantList } from '@/features/system/restaurants/components/restaurant-list'

export const Route = createFileRoute(
  '/_authenticated/_system/restaurants/'
)({
  component: RestaurantsRoute,
})

function RestaurantsRoute() {
  return <RestaurantList />
}
