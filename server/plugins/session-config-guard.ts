export default defineNitroPlugin(() => {
  if (import.meta.dev)
    return

  const config = useRuntimeConfig()
  const password = String(config.session?.password || '').trim()

  if (password.length >= 32)
    return

  throw new Error(
    '[auth] Missing or weak NUXT_SESSION_PASSWORD. Set a value with at least 32 characters in production.'
  )
})
