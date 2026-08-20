import { eq } from 'drizzle-orm'
import { USER_ROLE } from '#shared/fyrush'
import { db, schema } from 'hub:db'
import { requireUser, toAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ name?: string, mobile?: string, address?: string, registeredLat?: number, registeredLng?: number }>(event)

  const name = body.name?.trim()
  const mobile = body.mobile?.trim()
  const address = body.address?.trim()

  if (!name || !mobile || !address) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name, mobile number, and address are required.'
    })
  }

  const needsRegisteredPoint = user.role === USER_ROLE.CITIZEN || user.role === USER_ROLE.POINT_PERSON
  const registeredLat = typeof body.registeredLat === 'number' ? body.registeredLat : user.registeredLat
  const registeredLng = typeof body.registeredLng === 'number' ? body.registeredLng : user.registeredLng
  const hasRegisteredPoint = typeof registeredLat === 'number' && typeof registeredLng === 'number'

  if (needsRegisteredPoint && !hasRegisteredPoint) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Confirm your location on the map before continuing.'
    })
  }

  const now = Date.now()

  await db
    .update(schema.users)
    .set({
      name,
      mobile,
      address,
      registeredLat: needsRegisteredPoint ? registeredLat : null,
      registeredLng: needsRegisteredPoint ? registeredLng : null,
      profileComplete: needsRegisteredPoint ? (hasRegisteredPoint ? 1 : 0) : 1,
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
