import { USER_ROLE } from '#shared/fyrush'

const PUBLIC_PATHS = new Set(['/', '/auth'])

function roleHome(role: string) {
  return role === USER_ROLE.BFP ? '/bfp/dashboard' : '/citizen/report'
}

export default defineNuxtRouteMiddleware(async (to) => {
  const redirectTo = (path: string) => {
    if (to.path === path)
      return

    return navigateTo(path)
  }

  if (to.path.startsWith('/api/'))
    return

  if (to.path === '/bfp/login')
    return redirectTo('/')

  const { user, refreshUser } = useAuthSession()
  const isPublicPath = PUBLIC_PATHS.has(to.path)

  if (isPublicPath && !user.value)
    return

  let current = user.value
  if ((isPublicPath && current) || !current)
    current = await refreshUser().catch(() => null)

  if (!current) {
    if (isPublicPath)
      return

    return redirectTo('/')
  }

  if (!current.profileComplete) {
    if (to.path !== '/citizen/profile')
      return redirectTo('/citizen/profile')

    return
  }

  if (to.path === '/citizen/profile' || to.path === '/auth' || to.path === '/')
    return redirectTo(roleHome(current.role))

  if (to.path.startsWith('/bfp') && current.role !== USER_ROLE.BFP)
    return redirectTo('/citizen/report')

  if (to.path.startsWith('/citizen/report') && current.role === USER_ROLE.BFP)
    return redirectTo('/bfp/dashboard')
})
