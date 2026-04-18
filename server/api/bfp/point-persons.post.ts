import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { createPasswordHash, normalizeEmail, requireCompleteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const body = await readBody<{ email?: string }>(event)
  const rawEmail = body.email?.trim()
  if (!rawEmail)
    throw createError({ statusCode: 400, statusMessage: 'Email is required.' })

  const email = normalizeEmail(rawEmail)

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email)
  })

  if (existing) {
    if (existing.role !== USER_ROLE.POINT_PERSON) {
      throw createError({ statusCode: 409, statusMessage: 'This email is already used by another account.' })
    }

    return {
      ok: true,
      pointPerson: {
        id: existing.id,
        email: existing.email,
        name: existing.profileComplete ? existing.name : 'Unregistered',
        mobile: existing.profileComplete ? existing.mobile : 'Unregistered',
        address: existing.profileComplete ? existing.address : 'Unregistered',
        registered: Boolean(existing.profileComplete)
      }
    }
  }

  const now = Date.now()
  const row: typeof schema.users.$inferInsert = {
    id: crypto.randomUUID(),
    role: USER_ROLE.POINT_PERSON,
    loginId: null,
    name: 'Unregistered',
    email,
    googleId: null,
    authProvider: 'google',
    mobile: null,
    address: null,
    profileComplete: 0,
    profileCompletedAt: null,
    registeredLat: null,
    registeredLng: null,
    passwordHash: await createPasswordHash(crypto.randomUUID()),
    createdAt: now
  }

  await db.insert(schema.users).values(row)

  return {
    ok: true,
    pointPerson: {
      id: row.id,
      email: row.email,
      name: 'Unregistered',
      mobile: 'Unregistered',
      address: 'Unregistered',
      registered: false
    }
  }
})
