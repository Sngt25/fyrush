declare global {
  interface Window {
    __fyrushGoogleReadyDispatched?: boolean
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const clientId = String(config.public.googleAuth?.clientId || config.public.googleClientId || '').trim()

  if (!clientId)
    return

  const emitReady = () => {
    if (window.__fyrushGoogleReadyDispatched)
      return true

    const idApi = (window as Window & { google?: { accounts?: { id?: unknown } } }).google?.accounts?.id

    if (!idApi)
      return false

    window.__fyrushGoogleReadyDispatched = true
    window.dispatchEvent(new Event('nuxt-google-auth:ready'))
    return true
  }

  let attempts = 0
  const maxAttempts = 40

  const tryEmitReady = () => {
    if (emitReady())
      return

    attempts += 1

    if (attempts >= maxAttempts)
      return

    window.setTimeout(tryEmitReady, 100)
  }

  tryEmitReady()
})
