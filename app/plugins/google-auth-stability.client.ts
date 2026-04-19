export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const clientId = String(config.public.googleAuth?.clientId || config.public.googleClientId || '').trim()

  if (!clientId)
    return

  const promptOneTap = Boolean(config.public.googleAuth?.promptOneTap)
  const useFedCMForPrompt = Boolean(config.public.googleUseFedCMForPrompt)

  const initializeGoogleIdentity = () => {
    const googleApi = (window as Window & {
      google?: {
        accounts?: {
          id?: {
            initialize: (config: {
              client_id: string
              use_fedcm_for_prompt?: boolean
              callback: (response: unknown) => void
            }) => void
            prompt: () => void
          }
        }
      }
    }).google

    const idApi = googleApi?.accounts?.id

    if (!idApi)
      return false

    idApi.initialize({
      client_id: clientId,
      use_fedcm_for_prompt: useFedCMForPrompt,
      callback: (response) => {
        window.dispatchEvent(new CustomEvent('nuxt-google-auth:credential', { detail: response }))
      }
    })

    window.dispatchEvent(new Event('nuxt-google-auth:ready'))

    if (promptOneTap)
      idApi.prompt()

    return true
  }

  let attempts = 0
  const maxAttempts = 40

  const tryInitialize = () => {
    if (initializeGoogleIdentity())
      return

    attempts += 1

    if (attempts >= maxAttempts)
      return

    window.setTimeout(tryInitialize, 100)
  }

  tryInitialize()
})
