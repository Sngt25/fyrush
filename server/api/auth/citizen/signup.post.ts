export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Citizen signup was replaced by Google Sign-In. Use /api/auth/google/login.'
  })
})
