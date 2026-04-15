import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { createPasswordHash, createSession, toAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    email?: string
    password?: string
  }>(event)

  if (!body.name || !body.email || !body.password)
    throw createError({ statusCode: 400, statusMessage: 'Name, email, and password are required.' })

  const existing = await db.query.users.findFirst({
    where: and(eq(schema.users.role, USER_ROLE.CITIZEN), eq(schema.users.email, body.email.trim()))
  })

  if (existing)
    throw createError({ statusCode: 409, statusMessage: 'Email address is already registered.' })

  const now = Date.now()
  const row: typeof schema.users.$inferInsert = {
    id: crypto.randomUUID(),
    role: USER_ROLE.CITIZEN,
    loginId: null,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    mobile: null,
    address: null,
    registeredLat: null,
    registeredLng: null,
    passwordHash: createPasswordHash(body.password),
    createdAt: now
  }

  await db.insert(schema.users).values(row)

  const authUser = toAuthUser(row as typeof schema.users.$inferSelect)
  await createSession(event, authUser)

  return {
    ok: true,
    user: authUser
  }
})
