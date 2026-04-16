import { and, eq } from 'drizzle-orm'
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
    where: and(eq(schema.users.id, body.userId), eq(schema.users.role, USER_ROLE.CITIZEN))
  })

  if (!target)
    throw createError({ statusCode: 404, statusMessage: 'Citizen user not found.' })

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
