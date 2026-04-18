import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { INCIDENT_STATUS, USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../utils/auth'
import { listIncidentFeed } from '../../utils/incidents'

export default defineEventHandler(async (event) => {
  const user = await requireCompleteUser(event)
  const incidents = await listIncidentFeed()

  if (user.role === USER_ROLE.BFP) {
    const reportsByIncident = await db
      .select({
        incidentId: schema.incidentReports.incidentId,
        userId: schema.incidentReports.userId,
        userName: schema.users.name,
        userRole: schema.users.role
      })
      .from(schema.incidentReports)
      .innerJoin(schema.users, eq(schema.incidentReports.userId, schema.users.id))

    const grouped = reportsByIncident.reduce<Record<string, Array<{ userId: string, userName: string, userRole: string }>>>((acc, row) => {
      acc[row.incidentId] ||= []
      acc[row.incidentId]!.push({ userId: row.userId, userName: row.userName, userRole: row.userRole })
      return acc
    }, {})

    const enriched = incidents.map(item => ({
      ...item,
      reportingUsers: grouped[item.id] || []
    }))

    return { ok: true, incidents: enriched }
  }

  const mine = await db
    .select({ incidentId: schema.incidentReports.incidentId })
    .from(schema.incidentReports)
    .where(eq(schema.incidentReports.userId, user.id))

  const mineSet = new Set(mine.map(row => row.incidentId))
  const filtered = incidents.filter(item =>
    mineSet.has(item.id)
    || (item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED)
  )

  return { ok: true, incidents: filtered }
})
