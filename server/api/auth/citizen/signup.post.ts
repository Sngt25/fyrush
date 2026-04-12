import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { createPasswordHash, createSession, toAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    mobile?: string
    address?: string
    password?: string
    registeredLat?: number
    registeredLng?: number
  }>(event)

  if (!body.name || !body.mobile || !body.address || !body.password)
    throw createError({ statusCode: 400, statusMessage: 'Name, mobile, address, and password are required.' })

  const existing = await db.query.users.findFirst({
    where: and(eq(schema.users.role, USER_ROLE.CITIZEN), eq(schema.users.mobile, body.mobile))
  })

  if (existing)
    throw createError({ statusCode: 409, statusMessage: 'Mobile number is already registered.' })

  const now = Date.now()
  const row: typeof schema.users.$inferInsert = {
    id: crypto.randomUUID(),
    role: USER_ROLE.CITIZEN,
    loginId: null,
    name: body.name.trim(),
    mobile: body.mobile.trim(),
    address: body.address.trim(),
    registeredLat: typeof body.registeredLat === 'number' ? body.registeredLat : null,
    registeredLng: typeof body.registeredLng === 'number' ? body.registeredLng : null,
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
