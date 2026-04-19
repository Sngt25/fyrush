import { and, desc, eq, or } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS } from '#shared/fyrush'

const FIRE_PERIMETER_METERS = 30

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRadians = (value: number) => value * (Math.PI / 180)
  const earthRadiusMeters = 6371000

  const dLat = toRadians(bLat - aLat)
  const dLng = toRadians(bLng - aLng)
  const lat1 = toRadians(aLat)
  const lat2 = toRadians(bLat)

  const sinHalfDLat = Math.sin(dLat / 2)
  const sinHalfDLng = Math.sin(dLng / 2)

  const haversine = sinHalfDLat * sinHalfDLat
    + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export async function listIncidentFeed(limit = 50) {
  return db.select().from(schema.incidents).orderBy(desc(schema.incidents.updatedAt)).limit(limit)
}

export async function listRecentCitizenHistory(userId: string, limit = 10) {
  return db
    .select({
      id: schema.incidents.id,
      latitude: schema.incidents.latitude,
      longitude: schema.incidents.longitude,
      address: schema.incidents.address,
      status: schema.incidents.status,
      createdAt: schema.incidents.createdAt,
      updatedAt: schema.incidents.updatedAt
    })
    .from(schema.incidentReports)
    .innerJoin(schema.incidents, eq(schema.incidentReports.incidentId, schema.incidents.id))
    .where(eq(schema.incidentReports.userId, userId))
    .orderBy(desc(schema.incidentReports.createdAt))
    .limit(limit)
}

export async function createIncidentReport(input: {
  userId: string
  latitude: number
  longitude: number
  address: string
  source: 'registered' | 'manual'
  autoValidate?: boolean
}) {
  const now = Date.now()

  // Merge reports that fall within the computed fire perimeter.
  const activeIncidents = await db
    .select()
    .from(schema.incidents)
    .where(
      or(
        eq(schema.incidents.status, INCIDENT_STATUS.NEW),
        eq(schema.incidents.status, INCIDENT_STATUS.VALIDATED),
        eq(schema.incidents.status, INCIDENT_STATUS.ON_THE_WAY)
      )
    )
    .orderBy(desc(schema.incidents.updatedAt))

  const nearbyIncident = activeIncidents
    .map(item => ({
      item,
      distance: distanceMeters(item.latitude, item.longitude, input.latitude, input.longitude)
    }))
    .filter(entry => entry.distance <= FIRE_PERIMETER_METERS)
    .sort((a, b) => {
      if (a.distance !== b.distance)
        return a.distance - b.distance

      return b.item.updatedAt - a.item.updatedAt
    })[0]?.item

  let incidentId: string
  let alreadyReported = false

  if (nearbyIncident) {
    incidentId = nearbyIncident.id

    const existingReport = await db
      .select({ id: schema.incidentReports.id })
      .from(schema.incidentReports)
      .where(
        and(
          eq(schema.incidentReports.incidentId, incidentId),
          eq(schema.incidentReports.userId, input.userId)
        )
      )
      .limit(1)

    if (existingReport.length > 0)
      alreadyReported = true

    if (!alreadyReported) {
      const nextStatus = input.autoValidate && nearbyIncident.status === INCIDENT_STATUS.NEW
        ? INCIDENT_STATUS.VALIDATED
        : nearbyIncident.status

      const validatedAt = nextStatus === INCIDENT_STATUS.VALIDATED
        ? (nearbyIncident.validatedAt ?? now)
        : nearbyIncident.validatedAt

      await db
        .update(schema.incidents)
        .set({
          reportCount: nearbyIncident.reportCount + 1,
          status: nextStatus,
          validatedAt,
          updatedAt: now
        })
        .where(eq(schema.incidents.id, incidentId))
    }
  } else {
    incidentId = globalThis.crypto.randomUUID()

    await db.insert(schema.incidents).values({
      id: incidentId,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      status: input.autoValidate ? INCIDENT_STATUS.VALIDATED : INCIDENT_STATUS.NEW,
      reportCount: 1,
      createdByUserId: input.userId,
      createdAt: now,
      updatedAt: now,
      validatedAt: input.autoValidate ? now : null,
      invalidatedAt: null,
      timerStartedAt: null,
      dispatchedAt: null,
      closedAt: null
    })
  }

  if (!alreadyReported) {
    await db.insert(schema.incidentReports).values({
      id: globalThis.crypto.randomUUID(),
      incidentId,
      userId: input.userId,
      source: input.source,
      createdAt: now
    })
  }

  return {
    incident: await db.query.incidents.findFirst({ where: eq(schema.incidents.id, incidentId) }),
    alreadyReported
  }
}
