import { USER_ROLE } from '#shared/fyrush'

const PUBLIC_PATHS = new Set(['/', '/auth'])

function roleHome(role: string) {
  return role === USER_ROLE.BFP ? '/bfp/dashboard' : '/citizen/report'
}

export default defineNuxtRouteMiddleware(async (to) => {
  const normalizedPath = to.path !== '/' && to.path.endsWith('/')
    ? to.path.slice(0, -1)
    : to.path

  const normalizePath = (path: string) => {
    if (path !== '/' && path.endsWith('/'))
      return path.slice(0, -1)

    return path
  }

  const redirectTo = (path: string) => {
    if (normalizedPath === normalizePath(path))
      return

    return navigateTo(path)
  }

  if (normalizedPath.startsWith('/api/'))
    return

  if (normalizedPath === '/bfp/login')
    return redirectTo('/')

  const { user, refreshUser } = useAuthSession()
  const isPublicPath = PUBLIC_PATHS.has(normalizedPath)

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
    if (normalizedPath !== '/citizen/profile')
      return redirectTo('/citizen/profile')

    return
  }

  if (normalizedPath === '/citizen/profile') {
    if (current.role !== USER_ROLE.CITIZEN)
      return redirectTo(roleHome(current.role))

    return
  }

  if (normalizedPath === '/auth' || normalizedPath === '/')
    return redirectTo(roleHome(current.role))

  if (normalizedPath.startsWith('/bfp') && current.role !== USER_ROLE.BFP)
    return redirectTo('/citizen/report')

  if (normalizedPath.startsWith('/citizen/report') && current.role === USER_ROLE.BFP)
    return redirectTo('/bfp/dashboard')
})
