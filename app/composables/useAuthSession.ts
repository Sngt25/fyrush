import type { AuthUser } from '#shared/fyrush'

export function useAuthSession() {
  const user = useState<AuthUser | null>('fyrush-user', () => null)
  const loading = useState<boolean>('fyrush-user-loading', () => false)

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
    completeProfile,
    logout
  }
}
