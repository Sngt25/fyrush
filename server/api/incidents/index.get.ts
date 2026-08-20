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
        userMobile: schema.users.mobile,
        userRole: schema.users.role,
        userPhotoPathname: schema.users.idPhotoPathname,
        source: schema.incidentReports.source
      })
      .from(schema.incidentReports)
      .innerJoin(schema.users, eq(schema.incidentReports.userId, schema.users.id))

    const grouped = reportsByIncident.reduce<Record<string, Array<{ userId: string, userName: string, userMobile: string | null, userRole: string, userPhotoPathname: string | null }>>>((acc, row) => {
      acc[row.incidentId] ||= []
      acc[row.incidentId]!.push({ userId: row.userId, userName: row.userName, userMobile: row.userMobile, userRole: row.userRole, userPhotoPathname: row.userPhotoPathname })
      return acc
    }, {})

    const manualCounts = reportsByIncident.reduce<Record<string, number>>((acc, row) => {
      if (row.source !== 'manual')
        return acc

      acc[row.incidentId] = (acc[row.incidentId] || 0) + 1
      return acc
    }, {})

    const enriched = incidents.map(item => ({
      ...item,
      reportingUsers: grouped[item.id] || [],
      hasManualPinnedReport: Boolean(manualCounts[item.id]),
      manualPinnedReportCount: manualCounts[item.id] || 0
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
