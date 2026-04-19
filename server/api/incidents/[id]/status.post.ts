import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS, USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const incidentId = getRouterParam(event, 'id')
  if (!incidentId)
    throw createError({ statusCode: 400, statusMessage: 'Incident id is required.' })

  const body = await readBody<{ action?: 'validate' | 'invalidate' | 'start_timer' | 'dispatch' | 'complete' }>(event)
  if (!body.action)
    throw createError({ statusCode: 400, statusMessage: 'Action is required.' })

  const incident = await db.query.incidents.findFirst({ where: eq(schema.incidents.id, incidentId) })
  if (!incident)
    throw createError({ statusCode: 404, statusMessage: 'Incident not found.' })

  const now = Date.now()

  if (body.action === 'validate') {
    await db.update(schema.incidents).set({ status: INCIDENT_STATUS.VALIDATED, updatedAt: now }).where(eq(schema.incidents.id, incidentId))
  }

  if (body.action === 'invalidate') {
    await db.update(schema.incidents).set({ status: INCIDENT_STATUS.INVALIDATED, updatedAt: now }).where(eq(schema.incidents.id, incidentId))
    await db.delete(schema.responderLocations).where(eq(schema.responderLocations.incidentId, incidentId))
  }

  if (body.action === 'start_timer') {
    await db.update(schema.incidents).set({ timerStartedAt: now, updatedAt: now }).where(eq(schema.incidents.id, incidentId))
  }

  if (body.action === 'dispatch') {
    await db.update(schema.incidents).set({
      status: INCIDENT_STATUS.ON_THE_WAY,
      timerStartedAt: incident.timerStartedAt ?? now,
      dispatchedAt: now,
      updatedAt: now
    }).where(eq(schema.incidents.id, incidentId))
  }

  if (body.action === 'complete') {
    await db.update(schema.incidents).set({ status: INCIDENT_STATUS.COMPLETED, closedAt: now, updatedAt: now }).where(eq(schema.incidents.id, incidentId))
    await db.delete(schema.responderLocations).where(eq(schema.responderLocations.incidentId, incidentId))
  }

  const updated = await db.query.incidents.findFirst({ where: eq(schema.incidents.id, incidentId) })

  return {
    ok: true,
    incident: updated
  }
})
