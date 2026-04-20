import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ endpoint?: string }>(event)
  const endpoint = body.endpoint?.trim()

  if (!endpoint) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Subscription endpoint is required.'
    })
  }

  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.endpoint, endpoint),
        eq(schema.pushSubscriptions.userId, user.id)
      )
    )

  return { ok: true }
})
