import { eq } from 'drizzle-orm'
import { blob } from 'hub:blob'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const viewer = await requireUser(event)
  const userId = getQuery(event).userId

  if (typeof userId !== 'string' || !userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'userId is required.'
    })
  }

  if (viewer.role !== USER_ROLE.BFP && viewer.id !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { idPhotoPathname: true }
  })

  if (!row?.idPhotoPathname) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No ID photo on file.'
    })
  }

  return blob.serve(event, row.idPhotoPathname)
})
