import type { AuthUser } from '#shared/fyrush'

export function useAuthSession() {
  const user = useState<AuthUser | null>('fyrush-user', () => null)
  const loading = useState<boolean>('fyrush-user-loading', () => false)

  async function refreshUser() {
    loading.value = true

    try {
      const response = await $fetch<{ ok: boolean, user: AuthUser | null }>('/api/auth/me')
      user.value = response.user
      return response.user
    } finally {
      loading.value = false
    }
  }

  async function citizenSignup(payload: {
    name: string
    email: string
    password: string
  }) {
    const response = await $fetch<{ ok: boolean, user: AuthUser }>('/api/auth/citizen/signup', {
      method: 'POST',
      body: payload
    })
    user.value = response.user
    return response.user
  }

  async function citizenLogin(payload: { email: string, password: string }) {
    const response = await $fetch<{ ok: boolean, user: AuthUser }>('/api/auth/citizen/login', {
      method: 'POST',
      body: payload
    })
    user.value = response.user
    return response.user
  }

  async function bfpLogin(payload: { loginId: string, password: string }) {
    const response = await $fetch<{ ok: boolean, user: AuthUser }>('/api/auth/bfp/login', {
      method: 'POST',
      body: payload
    })
    user.value = response.user
    return response.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user,
    loading,
    refreshUser,
    citizenSignup,
    citizenLogin,
    bfpLogin,
    logout
  }
}
