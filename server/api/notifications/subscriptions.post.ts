import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { requireUser } from '../../utils/auth'

interface PushSubscriptionPayload {
  endpoint: string
  expirationTime: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<PushSubscriptionPayload>(event)

  const endpoint = body.endpoint?.trim()
  const p256dh = body.keys?.p256dh?.trim()
  const auth = body.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid push subscription payload.'
    })
  }

  const now = Date.now()

  const existingForEndpoint = await db
    .select({ endpoint: schema.pushSubscriptions.endpoint })
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .limit(1)

  if (existingForEndpoint.length > 0) {
    await db
      .update(schema.pushSubscriptions)
      .set({
        userId: user.id,
        p256dh,
        auth,
        updatedAt: now
      })
      .where(eq(schema.pushSubscriptions.endpoint, endpoint))

    return { ok: true }
  }

  const existingForUserAndKey = await db
    .select({ endpoint: schema.pushSubscriptions.endpoint })
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, user.id),
        eq(schema.pushSubscriptions.p256dh, p256dh),
        eq(schema.pushSubscriptions.auth, auth)
      )
    )
    .limit(1)

  if (existingForUserAndKey.length > 0) {
    await db
      .update(schema.pushSubscriptions)
      .set({
        endpoint,
        updatedAt: now
      })
      .where(eq(schema.pushSubscriptions.endpoint, existingForUserAndKey[0]!.endpoint))

    return { ok: true }
  }

  await db.insert(schema.pushSubscriptions).values({
    endpoint,
    userId: user.id,
    p256dh,
    auth,
    createdAt: now,
    updatedAt: now
  })

  return { ok: true }
})
