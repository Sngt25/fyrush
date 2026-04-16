import { eq } from 'drizzle-orm'
import { USER_ROLE } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { requireUser, toAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ mobile?: string, address?: string }>(event)

  const mobile = body.mobile?.trim()
  const address = body.address?.trim()

  if (!mobile || !address) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Mobile number and address are required.'
    })
  }

  const now = Date.now()

  await db
    .update(schema.users)
    .set({
      mobile,
      address,
      profileComplete: 1,
      profileCompletedAt: now
    })
    .where(eq(schema.users.id, user.id))

  const updated = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id)
  })

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.'
    })
  }

  const authUser = toAuthUser(updated)

  return {
    ok: true,
    user: authUser,
    nextPath: authUser.role === USER_ROLE.BFP ? '/bfp/dashboard' : '/citizen/report'
  }
})
