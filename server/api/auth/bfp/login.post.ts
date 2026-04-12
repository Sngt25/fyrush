import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { createSession, ensureBfpUser, toAuthUser, verifyPassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await ensureBfpUser()

  const body = await readBody<{ loginId?: string, password?: string }>(event)

  if (!body.loginId || !body.password)
    throw createError({ statusCode: 400, statusMessage: 'Department ID and password are required.' })

  const row = await db.query.users.findFirst({
    where: and(eq(schema.users.role, USER_ROLE.BFP), eq(schema.users.loginId, body.loginId.trim()))
  })

  if (!row || !verifyPassword(body.password, row.passwordHash))
    throw createError({ statusCode: 401, statusMessage: 'Invalid BFP credentials.' })

  const authUser = toAuthUser(row)
  await createSession(event, authUser)

  return {
    ok: true,
    user: authUser
  }
})
