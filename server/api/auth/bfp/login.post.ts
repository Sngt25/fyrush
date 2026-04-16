export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: 'BFP credential login was replaced by Google Sign-In with BFP_EMAIL role detection.'
  })
})
