import type { AuthUser } from '#shared/fyrush'

export function useAuthSession() {
  const userCookie = useCookie<AuthUser | null>('fyrush_user', {
    default: () => null,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/'
  })

  const user = useState<AuthUser | null>('fyrush-user', () => userCookie.value)
  const loading = useState<boolean>('fyrush-user-loading', () => false)

  watch(user, (value) => {
    userCookie.value = value
  }, { deep: false })

  async function refreshUser() {
    loading.value = true

    try {
      const requestFetch = import.meta.server ? useRequestFetch() : $fetch
      const response = await requestFetch<{ ok: boolean, user: AuthUser | null }>('/api/auth/me')
      user.value = response.user
      return response.user
    } finally {
      loading.value = false
    }
  }

  async function googleLogin(credential: string) {
    const response = await $fetch<{ ok: boolean, user: AuthUser, nextPath: string }>('/api/auth/google/login', {
      method: 'POST',
      body: { credential }
    })
    user.value = response.user
    return response
  }

  async function completeProfile(payload: { name: string, mobile: string, address: string }) {
    const response = await $fetch<{ ok: boolean, user: AuthUser, nextPath: string }>('/api/auth/profile', {
      method: 'POST',
      body: payload
    })
    user.value = response.user
    return response
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user,
    loading,
    refreshUser,
    googleLogin,
    completeProfile,
    logout
  }
}
