import { desc, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { USER_ROLE } from '#shared/fyrush'
import { requireCompleteUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCompleteUser(event, [USER_ROLE.BFP])

  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      mobile: schema.users.mobile,
      address: schema.users.address,
      profileComplete: schema.users.profileComplete,
      createdAt: schema.users.createdAt
    })
    .from(schema.users)
    .where(eq(schema.users.role, USER_ROLE.POINT_PERSON))
    .orderBy(desc(schema.users.createdAt))

  return {
    ok: true,
    pointPersons: rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.profileComplete ? row.name : 'Unregistered',
      mobile: row.profileComplete ? row.mobile : 'Unregistered',
      address: row.profileComplete ? row.address : 'Unregistered',
      registered: Boolean(row.profileComplete),
      createdAt: row.createdAt
    }))
  }
})
