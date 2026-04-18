import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS } from '#shared/fyrush'

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

  // Merge with a nearby recent incident to avoid alert duplication from rapid reports.
  const nearby = await db
    .select()
    .from(schema.incidents)
    .where(
      and(
        gte(schema.incidents.createdAt, now - 5 * 60 * 1000),
        sql`ABS(${schema.incidents.latitude} - ${input.latitude}) <= 0.003`,
        sql`ABS(${schema.incidents.longitude} - ${input.longitude}) <= 0.003`,
        sql`${schema.incidents.status} != ${INCIDENT_STATUS.COMPLETED}`
      )
    )
    .orderBy(desc(schema.incidents.createdAt))
    .limit(1)

  let incidentId: string
  let alreadyReported = false

  if (nearby.length > 0 && nearby[0]) {
    const nearbyIncident = nearby[0]
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
      const nextStatus = input.autoValidate && nearbyIncident.status !== INCIDENT_STATUS.COMPLETED
        ? INCIDENT_STATUS.VALIDATED
        : nearbyIncident.status

      await db
        .update(schema.incidents)
        .set({
          reportCount: nearbyIncident.reportCount + 1,
          status: nextStatus,
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
