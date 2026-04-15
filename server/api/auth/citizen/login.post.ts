import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { createSession, toAuthUser, verifyPassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)

  if (!body.email || !body.password)
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required.' })

  const row = await db.query.users.findFirst({
    where: and(eq(schema.users.role, USER_ROLE.CITIZEN), eq(schema.users.email, body.email.trim().toLowerCase()))
  })

  if (!row || !verifyPassword(body.password, row.passwordHash))
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials.' })

  const authUser = toAuthUser(row)
  await createSession(event, authUser)

  return {
    ok: true,
    user: authUser
  }
})
