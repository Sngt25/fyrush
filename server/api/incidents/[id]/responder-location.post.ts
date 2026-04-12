import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { requireUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event, [USER_ROLE.BFP])

  const incidentId = getRouterParam(event, 'id')
  if (!incidentId)
    throw createError({ statusCode: 400, statusMessage: 'Incident id is required.' })

  const body = await readBody<{ latitude?: number, longitude?: number }>(event)

  if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number')
    throw createError({ statusCode: 400, statusMessage: 'latitude and longitude are required.' })

  const now = Date.now()

  const existing = await db.query.responderLocations.findFirst({
    where: eq(schema.responderLocations.incidentId, incidentId)
  })

  if (existing) {
    await db.update(schema.responderLocations).set({ latitude: body.latitude, longitude: body.longitude, updatedAt: now }).where(eq(schema.responderLocations.incidentId, incidentId))
  } else {
    await db.insert(schema.responderLocations).values({
      incidentId,
      latitude: body.latitude,
      longitude: body.longitude,
      updatedAt: now
    })
  }

  return {
    ok: true
  }
})
