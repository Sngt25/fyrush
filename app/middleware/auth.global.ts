import { USER_ROLE } from '#shared/fyrush'

const PUBLIC_PATHS = new Set(['/', '/auth'])

function roleHome(role: string) {
  return role === USER_ROLE.BFP ? '/bfp/dashboard' : '/citizen/report'
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/api/'))
    return

  if (to.path === '/bfp/login')
    return navigateTo('/')

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

    return navigateTo('/')
  }

  if (!current.profileComplete) {
    if (to.path !== '/citizen/profile')
      return navigateTo('/citizen/profile')

    return
  }

  if (to.path === '/citizen/profile' || to.path === '/auth' || to.path === '/')
    return navigateTo(roleHome(current.role))

  if (to.path.startsWith('/bfp') && current.role !== USER_ROLE.BFP)
    return navigateTo('/citizen/report')

  if (to.path.startsWith('/citizen/report') && current.role === USER_ROLE.BFP)
    return navigateTo('/bfp/dashboard')
})
