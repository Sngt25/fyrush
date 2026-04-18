import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, statusMessage: 'Point person id is required.' })

  const target = await db.query.users.findFirst({
    where: and(eq(schema.users.id, id), eq(schema.users.role, USER_ROLE.POINT_PERSON))
  })

  if (!target)
    throw createError({ statusCode: 404, statusMessage: 'Point person not found.' })

  await db.delete(schema.users).where(eq(schema.users.id, id))

  return {
    ok: true
  }
})
