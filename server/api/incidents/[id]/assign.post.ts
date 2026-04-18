import { and, eq, or } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const bfpUser = await requireCompleteUser(event, [USER_ROLE.BFP])

  const incidentId = getRouterParam(event, 'id')
  if (!incidentId)
    throw createError({ statusCode: 400, statusMessage: 'Incident id is required.' })

  const body = await readBody<{ userId?: string }>(event)
  if (!body.userId)
    throw createError({ statusCode: 400, statusMessage: 'userId is required.' })

  const target = await db.query.users.findFirst({
    where: and(
      eq(schema.users.id, body.userId),
      or(
        eq(schema.users.role, USER_ROLE.CITIZEN),
        eq(schema.users.role, USER_ROLE.POINT_PERSON)
      )
    )
  })

  if (!target)
    throw createError({ statusCode: 404, statusMessage: 'Reporter not found.' })

  const row: typeof schema.pointPersonAssignments.$inferInsert = {
    id: crypto.randomUUID(),
    incidentId,
    userId: target.id,
    assignedByUserId: bfpUser.id,
    createdAt: Date.now()
  }

  await db.insert(schema.pointPersonAssignments).values(row)

  return {
    ok: true,
    assignment: row
  }
})
