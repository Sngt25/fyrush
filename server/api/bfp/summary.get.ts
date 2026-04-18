import { db, schema } from 'hub:db'
import { INCIDENT_STATUS, USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const users = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      profileComplete: schema.users.profileComplete
    })
    .from(schema.users)

  const incidents = await db
    .select({
      id: schema.incidents.id,
      status: schema.incidents.status,
      timerStartedAt: schema.incidents.timerStartedAt,
      closedAt: schema.incidents.closedAt
    })
    .from(schema.incidents)

  const totalRegisteredUsers = users.filter(row => row.role !== USER_ROLE.BFP && Boolean(row.profileComplete)).length
  const totalPointPersons = users.filter(row => row.role === USER_ROLE.POINT_PERSON).length
  const registeredPointPersons = users.filter(row => row.role === USER_ROLE.POINT_PERSON && Boolean(row.profileComplete)).length
  const activeReports = incidents.filter(row => row.status !== INCIDENT_STATUS.COMPLETED && row.status !== INCIDENT_STATUS.INVALIDATED).length

  const completedWithTimer = incidents.filter(row =>
    row.status === INCIDENT_STATUS.COMPLETED
    && typeof row.timerStartedAt === 'number'
    && typeof row.closedAt === 'number'
    && row.closedAt >= row.timerStartedAt
  )

  const averageResponseMs = completedWithTimer.length > 0
    ? Math.round(completedWithTimer.reduce((sum, row) => sum + ((row.closedAt as number) - (row.timerStartedAt as number)), 0) / completedWithTimer.length)
    : null

  return {
    ok: true,
    summary: {
      totalRegisteredUsers,
      activeReports,
      totalPointPersons,
      registeredPointPersons,
      averageResponseMs
    }
  }
})
