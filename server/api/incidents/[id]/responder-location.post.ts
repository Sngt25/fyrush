import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS, USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const incidentId = getRouterParam(event, 'id')
  if (!incidentId)
    throw createError({ statusCode: 400, statusMessage: 'Incident id is required.' })

  const body = await readBody<{ latitude?: number, longitude?: number }>(event)

  if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number')
    throw createError({ statusCode: 400, statusMessage: 'latitude and longitude are required.' })

  const incident = await db.query.incidents.findFirst({
    where: eq(schema.incidents.id, incidentId)
  })

  if (!incident)
    throw createError({ statusCode: 404, statusMessage: 'Incident not found.' })

  if (incident.status === INCIDENT_STATUS.COMPLETED || incident.status === INCIDENT_STATUS.INVALIDATED) {
    await db.delete(schema.responderLocations).where(eq(schema.responderLocations.incidentId, incidentId))

    return {
      ok: true
    }
  }

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
