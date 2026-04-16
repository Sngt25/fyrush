export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Citizen password login was replaced by Google Sign-In. Use /api/auth/google/login.'
  })
})
