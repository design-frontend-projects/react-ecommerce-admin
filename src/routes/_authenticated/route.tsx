import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

const AuthenticatedRoute = () => {
  // const { isLoaded, userId, isSignedIn } = useAuth()
  // const navigate = useNavigate()
  // const hasToasted = useRef(false)

  // useEffect(() => {
  //   if (!isSignedIn && !isLoaded) {
  //     toast.error('You must be logged in to access this page.')
  //     hasToasted.current = true
  //     navigate({ to: '/sign-in' })
  //   }
  //   if (!userId) {
  //     toast.error('You must be logged in to access this page.')
  //     hasToasted.current = true
  //     navigate({ to: '/sign-in' })
  //   }
  // }, [isLoaded, userId, navigate])

  // if (!isLoaded || !userId) {
  //   return null
  // }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
